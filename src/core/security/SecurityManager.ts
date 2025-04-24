export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private rateLimits: Map<string, RateLimitConfig> = new Map();
  private requests: Map<string, number[]> = new Map();

  private constructor() {
    this.initializeDefaultLimits();
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private initializeDefaultLimits(): void {
    this.rateLimits.set('cookie-export', { maxRequests: 5, windowMs: 60000 }); // 5 requests per minute
    this.rateLimits.set('cookie-import', { maxRequests: 3, windowMs: 60000 }); // 3 requests per minute
  }

  async isOperationAllowed(operation: string, key: string): Promise<boolean> {
    const limit = this.rateLimits.get(operation);
    if (!limit) return true;

    const requestKey = `${operation}:${key}`;
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // Get and filter recent requests
    const requests = this.requests.get(requestKey) || [];
    const recentRequests = requests.filter(time => time > windowStart);

    // Check if limit is exceeded
    if (recentRequests.length >= limit.maxRequests) {
      return false;
    }

    // Record new request
    recentRequests.push(now);
    this.requests.set(requestKey, recentRequests);
    return true;
  }

  validateCookieData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;

    // Add validation rules
    const validationRules = [
      this.validateCookieStructure,
      this.validateCookieDomain,
      this.validateCookieValues
    ];

    return validationRules.every(rule => rule(data));
  }

  private validateCookieStructure(data: any): boolean {
    return Array.isArray(data) && data.every(cookie => 
      typeof cookie === 'object' &&
      'name' in cookie &&
      'value' in cookie &&
      'domain' in cookie
    );
  }

  private validateCookieDomain(data: any): boolean {
    return Array.isArray(data) && data.every(cookie =>
      typeof cookie.domain === 'string' &&
      cookie.domain.match(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
    );
  }

  private validateCookieValues(data: any): boolean {
    return Array.isArray(data) && data.every(cookie =>
      typeof cookie.value === 'string' &&
      cookie.value.length <= 4096 // Maximum cookie value size
    );
  }
} 