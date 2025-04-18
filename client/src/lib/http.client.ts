import { AuthService } from './auth.service';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: string;
  diagnostics?: {
    responseTime?: number;
    corsStatus?: 'enabled' | 'disabled' | 'unknown';
    serverInfo?: {
      headers?: Record<string, string>;
      server?: string;
      poweredBy?: string;
    };
    networkInfo?: {
      online: boolean;
      connectionType?: string;
      rtt?: number;
      effectiveType?: string;
    };
    urlInfo?: {
      protocol: string;
      hostname: string;
      port: string;
      path: string;
    };
    serverStatus?: {
      isRunning: boolean;
      consecutiveFailures: number;
      lastCheck: number;
    };
  };
}

interface CorsErrorDetails {
  type: 'cors_error';
  name: string;
  message: string;
  requestUrl: string;
  requestMode: string;
  requestOrigin: string;
  targetOrigin: string;
  suggestions: string[];
  timestamp: string;
}

interface EnvironmentConfig {
  apiUrl: string;
  protocol: string;
  port?: number;
}

interface ServerStatus {
  isRunning: boolean;
  consecutiveFailures: number;
  lastCheck: number;
}

export class HttpClient {
  private static instance: HttpClient;
  private authService: AuthService;
  private baseUrl: string;
  private fallbackUrls: string[];
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds timeout for health checks
  private readonly ENV_CONFIGS: Record<string, EnvironmentConfig> = {
    development: {
      apiUrl: 'localhost',
      protocol: 'http',
      port: 3000
    },
    staging: {
      apiUrl: 'staging-api.bytescookies.com',
      protocol: 'https'
    },
    production: {
      apiUrl: 'api.bytescookies.com',
      protocol: 'https'
    }
  };
  private serverStatus: ServerStatus = {
    isRunning: true,
    consecutiveFailures: 0,
    lastCheck: Date.now()
  };

  private constructor() {
    this.authService = AuthService.getInstance();
    this.baseUrl = this.determineBaseUrl();
    this.fallbackUrls = this.determineFallbackUrls();
  }

  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  private validateUrl(url: string): { isValid: boolean; urlInfo?: any; error?: string } {
    try {
      const parsedUrl = new URL(url);
      return {
        isValid: true,
        urlInfo: {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
          path: parsedUrl.pathname
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid URL'
      };
    }
  }

  private getNetworkInfo() {
    const connection = (navigator as any).connection;
    return {
      online: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      rtt: connection?.rtt || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown'
    };
  }

  private async checkApiHealth(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

    // Pre-flight validation
    const urlValidation = this.validateUrl(url);
    if (!urlValidation.isValid) {
      return {
        status: 'unhealthy',
        message: `Invalid API URL: ${urlValidation.error}`,
        timestamp: new Date().toISOString(),
        diagnostics: {
          urlInfo: urlValidation.urlInfo
        }
      };
    }

    // Network status check
    const networkInfo = this.getNetworkInfo();
    if (!networkInfo.online) {
      return {
        status: 'unhealthy',
        message: 'Network is offline',
        timestamp: new Date().toISOString(),
        diagnostics: {
          networkInfo
        }
      };
    }

    console.log('Testing API connectivity...', {
      url,
      timestamp: new Date().toISOString(),
      environment: this.determineEnvironment(),
      networkInfo
    });

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API health check failed with status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      
      // Update server status
      this.serverStatus.isRunning = true;
      this.serverStatus.consecutiveFailures = 0;
      this.serverStatus.lastCheck = Date.now();

      return {
        status: 'healthy',
        message: 'API is responding normally',
        timestamp: new Date().toISOString(),
        diagnostics: {
          responseTime,
          corsStatus: 'enabled',
          networkInfo,
          urlInfo: urlValidation.urlInfo,
          serverInfo: {
            headers: Object.fromEntries(response.headers.entries()),
            server: response.headers.get('server') || undefined,
            poweredBy: response.headers.get('x-powered-by') || undefined
          },
          serverStatus: { ...this.serverStatus }
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Update server status
      this.serverStatus.consecutiveFailures++;
      this.serverStatus.lastCheck = Date.now();
      
      // Handle CORS errors specifically
      if (error instanceof Error && 
          (error.message.includes('CORS') || 
           error.message === 'Failed to fetch' || 
           error.name === 'TypeError')) {
        const corsError = this.createCorsErrorDetails(error, url);
        console.error('CORS error detected:', JSON.stringify(corsError, null, 2));
        
        return {
          status: 'unhealthy',
          message: 'CORS error detected',
          timestamp: new Date().toISOString(),
          diagnostics: {
            responseTime: Date.now() - startTime,
            corsStatus: 'disabled',
            networkInfo,
            urlInfo: urlValidation.urlInfo,
            serverStatus: { ...this.serverStatus }
          }
        };
      }

      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'unhealthy',
          message: `Health check timed out after ${this.HEALTH_CHECK_TIMEOUT}ms`,
          timestamp: new Date().toISOString(),
          diagnostics: {
            responseTime: this.HEALTH_CHECK_TIMEOUT,
            corsStatus: 'unknown',
            networkInfo,
            urlInfo: urlValidation.urlInfo,
            serverStatus: { ...this.serverStatus }
          }
        };
      }

      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        diagnostics: {
          responseTime: Date.now() - startTime,
          corsStatus: 'unknown',
          networkInfo,
          urlInfo: urlValidation.urlInfo,
          serverStatus: { ...this.serverStatus }
        }
      };
    }
  }

  private determineEnvironment(): string {
    // Check environment variables first
    if (process.env.REACT_APP_ENV) {
      return process.env.REACT_APP_ENV;
    }

    const hostname = window.location.hostname;
    
    // Development environments
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.test')) {
      return 'development';
    }
    
    // Staging environment
    if (hostname.includes('staging') || 
        hostname.includes('test') || 
        hostname.includes('qa')) {
      return 'staging';
    }
    
    // Production environment
    return 'production';
  }

  private determineBaseUrl(): string {
    const env = this.determineEnvironment();
    const config = this.ENV_CONFIGS[env];
    
    // Allow override from environment variable
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }

    const baseUrl = `${config.protocol}://${config.apiUrl}`;
    return config.port ? `${baseUrl}:${config.port}` : baseUrl;
  }

  private determineFallbackUrls(): string[] {
    const env = this.determineEnvironment();
    const configs = Object.values(this.ENV_CONFIGS);
    
    // Filter out current environment and create fallback URLs
    return configs
      .filter(config => `${config.protocol}://${config.apiUrl}` !== this.baseUrl)
      .map(config => config.port ? 
        `${config.protocol}://${config.apiUrl}:${config.port}` : 
        `${config.protocol}://${config.apiUrl}`
      );
  }

  private createCorsErrorDetails(error: Error, url: string): CorsErrorDetails {
    return {
      type: 'cors_error',
      name: error.name,
      message: error.message,
      requestUrl: url,
      requestMode: 'cors',
      requestOrigin: window.location.origin,
      targetOrigin: new URL(url).origin,
      suggestions: [
        'Verify CORS headers on the server',
        'Check if the API server has CORS middleware enabled',
        'Ensure the service worker origin is allowed by the server',
        'Check if the API server is running and accessible',
        'Verify network connectivity and firewall settings'
      ],
      timestamp: new Date().toISOString()
    };
  }

  private async findHealthyBaseUrl(): Promise<string> {
    const healthResults: Array<{ url: string; result: HealthCheckResult }> = [];
    
    // Check primary URL first
    const primaryHealth = await this.checkApiHealth(this.baseUrl);
    healthResults.push({ url: this.baseUrl, result: primaryHealth });
    
    if (primaryHealth.status === 'healthy') {
      return this.baseUrl;
    }

    // Try fallback URLs
    for (const fallbackUrl of this.fallbackUrls) {
      const health = await this.checkApiHealth(fallbackUrl);
      healthResults.push({ url: fallbackUrl, result: health });
      
      if (health.status === 'healthy') {
        console.warn(`Switching to fallback API URL: ${fallbackUrl}`);
        return fallbackUrl;
      }
    }

    // Log detailed diagnostics for all failed attempts
    console.error('API Health Check Results:', JSON.stringify(healthResults, null, 2));
    throw new Error('No healthy API endpoints found');
  }

  async initialize(): Promise<void> {
    try {
      this.baseUrl = await this.findHealthyBaseUrl();
      console.log('API initialized with base URL:', this.baseUrl);
    } catch (error) {
      console.error('Failed to initialize API:', error);
      throw error;
    }
  }

  private async addAuthHeader(options: RequestOptions): Promise<RequestOptions> {
    if (!options.requiresAuth) {
      return options;
    }

    const token = await this.authService.getValidAccessToken();
    if (!token) {
      throw new Error('No valid access token available');
    }

    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, try to refresh
        const newToken = await this.authService.getValidAccessToken();
        if (!newToken) {
          throw new Error('Authentication failed');
        }
        // Retry the original request with the new token
        return this.request(response.url, {
          ...response,
          headers: {
            ...response.headers,
            'Authorization': `Bearer ${newToken}`
          }
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    try {
      // Ensure we have a healthy base URL before making requests
      if (!this.baseUrl) {
        await this.initialize();
      }

      const finalOptions = await this.addAuthHeader(options);
      const response = await fetch(this.baseUrl + url, finalOptions);
      return this.handleResponse(response);
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
} 