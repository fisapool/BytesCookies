import { DeviceInfo } from '../types/device';

interface SessionData {
  accessToken: string;
  refreshToken: string;
  deviceInfo: DeviceInfo;
  expiresAt: number;
}

class SessionService {
  private static readonly SESSION_KEY = 'auth_session';
  private static readonly DEVICE_INFO_KEY = 'device_info';
  private static readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_REFRESH_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<void> | null = null;
  private refreshRetryCount = 0;

  constructor() {
    // Initialize device info if not exists
    if (!this.getDeviceInfo()) {
      this.initializeDeviceInfo();
    }

    // Start refresh timer if session exists
    if (this.hasValidSession()) {
      this.startRefreshTimer();
    }

    // Add visibility change listener for better refresh handling
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.hasValidSession()) {
      // Check if we need to refresh when tab becomes visible
      if (this.shouldRefreshSession()) {
        this.refreshSession();
      }
    }
  };

  private initializeDeviceInfo(): void {
    const deviceInfo: DeviceInfo = {
      deviceId: this.generateDeviceId(),
      name: this.getDeviceName(),
      userId: ''
    };
    this.setDeviceInfo(deviceInfo);
  }

  private generateDeviceId(): string {
    // Generate a unique device ID using browser fingerprinting
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
    
    // Create a hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `device_${Math.abs(hash).toString(36)}`;
  }

  private getDeviceName(): string {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    const browser = this.getBrowserName(userAgent);
    return `${browser} on ${platform}`;
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
    return 'Unknown Browser';
  }

  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      if (this.shouldRefreshSession()) {
        this.refreshSession();
      }
    }, SessionService.REFRESH_INTERVAL);
  }

  private shouldRefreshSession(): boolean {
    const session = this.getSession();
    if (!session) return false;

    // Refresh if less than 2 minutes until expiry
    const timeUntilExpiry = session.expiresAt - Date.now();
    return timeUntilExpiry < 2 * 60 * 1000;
  }

  public async refreshSession(): Promise<void> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<void> {
    try {
      const session = this.getSession();
      if (!session) return;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-info': JSON.stringify(session.deviceInfo)
        },
        body: JSON.stringify({
          refreshToken: session.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh session: ${response.status}`);
      }

      const { accessToken, refreshToken } = await response.json();
      this.updateSession(accessToken, refreshToken);
      this.refreshRetryCount = 0; // Reset retry count on successful refresh
    } catch (error) {
      console.error('Session refresh failed:', error);
      
      // Implement retry logic
      if (this.refreshRetryCount < SessionService.MAX_REFRESH_RETRIES) {
        this.refreshRetryCount++;
        await new Promise(resolve => setTimeout(resolve, SessionService.RETRY_DELAY));
        return this.performRefresh();
      }
      
      // If all retries failed, clear the session
      this.clearSession();
      this.refreshRetryCount = 0;
    }
  }

  public setSession(accessToken: string, refreshToken: string): void {
    const deviceInfo = this.getDeviceInfo();
    if (!deviceInfo) {
      throw new Error('Device info not initialized');
    }

    const sessionData: SessionData = {
      accessToken,
      refreshToken,
      deviceInfo,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    };

    try {
      localStorage.setItem(SessionService.SESSION_KEY, JSON.stringify(sessionData));
      this.startRefreshTimer();
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        // If localStorage is full, try sessionStorage as fallback
        sessionStorage.setItem(SessionService.SESSION_KEY, JSON.stringify(sessionData));
      } else {
        throw error;
      }
    }
  }

  private updateSession(accessToken: string, refreshToken: string): void {
    const session = this.getSession();
    if (!session) return;

    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    session.expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    try {
      localStorage.setItem(SessionService.SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        sessionStorage.setItem(SessionService.SESSION_KEY, JSON.stringify(session));
      } else {
        throw error;
      }
    }
  }

  public getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(SessionService.SESSION_KEY) || 
                        sessionStorage.getItem(SessionService.SESSION_KEY);
      
      if (!sessionStr) return null;

      const session: SessionData = JSON.parse(sessionStr);
      
      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  public getDeviceInfo(): DeviceInfo | null {
    try {
      const deviceInfoStr = localStorage.getItem(SessionService.DEVICE_INFO_KEY);
      return deviceInfoStr ? JSON.parse(deviceInfoStr) : null;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  private setDeviceInfo(deviceInfo: DeviceInfo): void {
    try {
      localStorage.setItem(SessionService.DEVICE_INFO_KEY, JSON.stringify(deviceInfo));
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        sessionStorage.setItem(SessionService.DEVICE_INFO_KEY, JSON.stringify(deviceInfo));
      } else {
        throw error;
      }
    }
  }

  public getAccessToken(): string | null {
    const session = this.getSession();
    return session ? session.accessToken : null;
  }

  public hasValidSession(): boolean {
    return !!this.getSession();
  }

  public clearSession(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    try {
      localStorage.removeItem(SessionService.SESSION_KEY);
      sessionStorage.removeItem(SessionService.SESSION_KEY);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  private isQuotaExceeded(error: any): boolean {
    return error && (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  public getAuthHeaders(): Record<string, string> {
    const session = this.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    return {
      'Authorization': `Bearer ${session.accessToken}`,
      'x-device-info': JSON.stringify(session.deviceInfo)
    };
  }
}

export const sessionService = new SessionService(); 