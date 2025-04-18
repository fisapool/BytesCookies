import { v4 as uuidv4 } from 'uuid';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface TokenRefreshConfig {
  refreshThreshold: number; // Time in seconds before token expiry to trigger refresh
  maxRetries: number;
  retryDelay: number; // Time in milliseconds between retries
}

export class AuthService {
  private static instance: AuthService;
  private refreshTimeoutId: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<AuthTokens | null> | null = null;
  private deviceId: string;
  private config: TokenRefreshConfig = {
    refreshThreshold: 300, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000
  };

  private constructor() {
    // Generate or retrieve device ID
    this.deviceId = localStorage.getItem('deviceId') || uuidv4();
    localStorage.setItem('deviceId', this.deviceId);
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private getStoredTokens(): AuthTokens | null {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  }

  private setStoredTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private clearStoredTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private getTokenExpiry(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.error('Error parsing token:', error);
      return 0;
    }
  }

  private async refreshTokens(retryCount = 0): Promise<AuthTokens | null> {
    try {
      const storedTokens = this.getStoredTokens();
      if (!storedTokens) {
        return null;
      }

      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': this.deviceId
        },
        body: JSON.stringify({
          refreshToken: storedTokens.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const newTokens = await response.json();
      this.setStoredTokens(newTokens);
      this.scheduleTokenRefresh(newTokens.accessToken);
      return newTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (retryCount < this.config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.refreshTokens(retryCount + 1);
      }

      this.clearStoredTokens();
      return null;
    }
  }

  private scheduleTokenRefresh(accessToken: string): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }

    const expiryTime = this.getTokenExpiry(accessToken);
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    const refreshTime = timeUntilExpiry - (this.config.refreshThreshold * 1000);

    if (refreshTime > 0) {
      this.refreshTimeoutId = setTimeout(() => {
        this.silentRefresh();
      }, refreshTime);
    }
  }

  private async silentRefresh(): Promise<void> {
    if (this.refreshPromise) {
      return;
    }

    this.refreshPromise = this.refreshTokens();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': this.deviceId
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        return false;
      }

      const tokens = await response.json();
      this.setStoredTokens(tokens);
      this.scheduleTokenRefresh(tokens.accessToken);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': this.deviceId
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        return false;
      }

      const tokens = await response.json();
      this.setStoredTokens(tokens);
      this.scheduleTokenRefresh(tokens.accessToken);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  logout(): void {
    this.clearStoredTokens();
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Method to be called before making authenticated API requests
  async getValidAccessToken(): Promise<string | null> {
    const storedTokens = this.getStoredTokens();
    if (!storedTokens) {
      return null;
    }

    const expiryTime = this.getTokenExpiry(storedTokens.accessToken);
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;

    // If token is about to expire, refresh it
    if (timeUntilExpiry <= this.config.refreshThreshold * 1000) {
      const newTokens = await this.refreshTokens();
      return newTokens?.accessToken || null;
    }

    return storedTokens.accessToken;
  }
} 