import { CookieEncryption } from './security/CookieEncryption';
import { CookieValidator } from './validation/CookieValidator';
import { ErrorManager } from './errors/ErrorManager';
import { ExportResult, EncryptedData, ImportResult, SessionData, AuthEventType, Cookie } from './types';

// Chrome API declaration
declare const chrome: {
  cookies: {
    getAll: (details: { domain: string }) => Promise<Cookie[]>;
    set: (cookie: Cookie) => Promise<void>;
  };
  storage: {
    local: {
      get: (keys: string[]) => Promise<{ [key: string]: any }>;
      set: (items: { [key: string]: any }) => Promise<void>;
      remove: (keys: string[]) => Promise<void>;
    };
  };
  runtime: {
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void;
    };
    sendMessage: (message: any) => void;
  };
};

export class CookieManager {
  private readonly security: CookieEncryption;
  private readonly validator: CookieValidator;
  private readonly errorManager: ErrorManager;
  private sessionData: SessionData | null = null;
  private refreshTokenTimeout: number | null = null;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 10000; // 10 seconds
  private readonly JITTER_FACTOR = 0.1; // 10% jitter
  private readonly AUTH_EVENTS: Record<string, AuthEventType> = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    TOKEN_REFRESHED: 'TOKEN_REFRESHED',
    TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED'
  };

  constructor() {
    this.security = new CookieEncryption();
    this.validator = new CookieValidator();
    this.errorManager = new ErrorManager();
    this.initializeSession();
    this.setupMessageListeners();
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
      if (message.type === this.AUTH_EVENTS.SESSION_EXPIRED) {
        this.handleSessionExpired();
      } else if (message.type === this.AUTH_EVENTS.TOKEN_REFRESHED) {
        this.handleTokenRefreshed();
      }
      return true;
    });
  }

  private async handleSessionExpired() {
    this.sessionData = null;
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
    await chrome.storage.local.remove(['session']);
    this.notifyAuthEvent(this.AUTH_EVENTS.SESSION_EXPIRED);
  }

  private async handleTokenRefreshed() {
    this.scheduleTokenRefresh();
    this.notifyAuthEvent(this.AUTH_EVENTS.TOKEN_REFRESHED);
  }

  private notifyAuthEvent(eventType: string, data?: any) {
    chrome.runtime.sendMessage({
      type: 'AUTH_EVENT',
      event: eventType,
      data,
      timestamp: Date.now()
    });
  }

  private async initializeSession() {
    try {
      const { session } = await chrome.storage.local.get(['session']);
      if (session) {
        this.sessionData = session;
        this.scheduleTokenRefresh();
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'START_SESSION_REFRESH' });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        await this.errorManager.handleError(error, 'session_init');
      }
    }
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.BASE_RETRY_DELAY * Math.pow(2, attempt),
      this.MAX_RETRY_DELAY
    );
    const jitter = exponentialDelay * this.JITTER_FACTOR * (Math.random() * 2 - 1);
    return Math.max(exponentialDelay + jitter, this.BASE_RETRY_DELAY);
  }

  private async fetchWithRetry(url: string, options: RequestInit, context: string): Promise<Response> {
    let lastError: Error | null = null;
    let isNetworkError = false;
    
    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        const response = await fetch(url, options);
        
        if (response.ok) {
          return response;
        }
        
        // Handle specific status codes
        if (response.status === 401) {
          const refreshSuccess = await this.refreshToken();
          if (refreshSuccess) {
            // Retry with new session
            const newOptions = {
              ...options,
              headers: await this.getAuthHeaders()
            };
            return fetch(url, newOptions);
          }
        }
        
        // Don't retry on client errors (4xx) except 401
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
        
        console.error(`Fetch attempt ${i + 1} failed in ${context}:`, error);
        
        if (isNetworkError) {
          if (!navigator.onLine) {
            throw new Error('Network is offline');
          }
        }
        
        if (i < this.MAX_RETRIES - 1) {
          const delay = this.calculateRetryDelay(i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to fetch after ${this.MAX_RETRIES} attempts`);
  }

  private async refreshToken(): Promise<boolean> {
    try {
      if (!this.sessionData?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.fetchWithRetry(
        '/api/auth/refresh',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: this.sessionData.refreshToken })
        },
        'token_refresh'
      );

      const data = await response.json();
      this.sessionData = {
        ...this.sessionData,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        user: data.user
      };

      await chrome.storage.local.set({ session: this.sessionData });
      this.scheduleTokenRefresh();
      return true;
    } catch (error) {
      if (error instanceof Error) {
        await this.errorManager.handleError(error, 'token_refresh');
      }
      return false;
    }
  }

  private scheduleTokenRefresh() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    if (!this.sessionData?.expiresAt) return;

    const timeUntilExpiry = this.sessionData.expiresAt - Date.now();
    const refreshTime = Math.max(0, timeUntilExpiry - this.TOKEN_REFRESH_THRESHOLD);

    this.refreshTokenTimeout = window.setTimeout(async () => {
      const success = await this.refreshToken();
      if (!success) {
        await this.logout();
      }
    }, refreshTime);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.sessionData?.accessToken) {
      throw new Error('No active session');
    }

    // Check if token needs refresh
    if (this.sessionData.expiresAt - Date.now() < this.TOKEN_REFRESH_THRESHOLD) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new Error('Session expired');
      }
    }

    return {
      'Authorization': `Bearer ${this.sessionData.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async exportCookies(domain: string): Promise<ExportResult> {
    try {
      // Check session
      if (!this.sessionData?.accessToken) {
        throw new Error('Authentication required');
      }

      // Get cookies
      const cookies = await chrome.cookies.getAll({ domain });

      // Validate cookies
      const validationResults = await Promise.all(
        cookies.map((cookie: Cookie) => this.validator.validateCookie(cookie))
      );

      // Filter out invalid cookies
      const validCookies = cookies.filter((_: Cookie, index: number) => 
        validationResults[index].isValid
      );

      // Encrypt valid cookies
      const encrypted = await this.security.encryptCookies(validCookies);

      return {
        success: true,
        data: encrypted,
        metadata: {
          total: cookies.length,
          valid: validCookies.length,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        await this.errorManager.handleError(error, 'export');
      }
      throw error;
    }
  }

  async importCookies(encryptedData: EncryptedData): Promise<ImportResult> {
    try {
      // Check session
      if (!this.sessionData?.accessToken) {
        throw new Error('Authentication required');
      }

      // Decrypt cookies
      const cookies = await this.security.decryptCookies(encryptedData);

      // Validate each cookie
      const validationResults = await Promise.all(
        cookies.map((cookie: Cookie) => this.validator.validateCookie(cookie))
      );

      // Filter valid cookies
      const validCookies = cookies.filter((_: Cookie, index: number) => 
        validationResults[index].isValid
      );

      // Set cookies
      const results = await Promise.all(
        validCookies.map(async (cookie: Cookie) => {
          try {
            await chrome.cookies.set(cookie);
            return { success: true, cookie };
          } catch (error) {
            return { success: false, cookie, error };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        metadata: {
          total: cookies.length,
          valid: validCookies.length,
          imported: successCount,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        await this.errorManager.handleError(error, 'import');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        },
        'login'
      );

      if (!response.ok) {
        const error = await response.json();
        this.notifyAuthEvent(this.AUTH_EVENTS.LOGIN_FAILURE, { error: error.message });
        return false;
      }

      const data = await response.json();
      this.sessionData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        user: data.user
      };

      await chrome.storage.local.set({ session: this.sessionData });
      this.scheduleTokenRefresh();
      this.notifyAuthEvent(this.AUTH_EVENTS.LOGIN_SUCCESS);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        await this.errorManager.handleError(error, 'login');
        this.notifyAuthEvent(this.AUTH_EVENTS.LOGIN_FAILURE, { error: error.message });
      }
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.sessionData?.accessToken) {
        await this.fetchWithRetry(
          '/api/auth/logout',
          {
            method: 'POST',
            headers: await this.getAuthHeaders()
          },
          'logout'
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        await this.errorManager.handleError(error, 'logout');
      }
    } finally {
      this.sessionData = null;
      if (this.refreshTokenTimeout) {
        clearTimeout(this.refreshTokenTimeout);
        this.refreshTokenTimeout = null;
      }
      await chrome.storage.local.remove(['session']);
      this.notifyAuthEvent(this.AUTH_EVENTS.LOGOUT_SUCCESS);
    }
  }

  isAuthenticated(): boolean {
    return !!this.sessionData?.accessToken;
  }

  getSessionData(): SessionData | null {
    return this.sessionData;
  }
} 