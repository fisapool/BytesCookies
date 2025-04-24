import { CookieEncryption } from '../../security/CookieEncryption';
import { CookieValidator } from '../../validation/CookieValidator';
import { ErrorHandler } from '../core/error/ErrorHandler';
import { SecurityManager } from '../core/security/SecurityManager';
import { Store } from '../core/state/Store';
import { ExportResult, EncryptedData, ImportResult, Cookie } from '../../types';

declare const chrome: any; // Add Chrome types declaration

export class CookieManager {
  private readonly security: CookieEncryption;
  private readonly validator: CookieValidator;
  private readonly errorHandler: ErrorHandler;
  private readonly securityManager: SecurityManager;
  private readonly store: Store;

  constructor() {
    this.security = new CookieEncryption();
    this.validator = new CookieValidator();
    this.errorHandler = ErrorHandler.getInstance();
    this.securityManager = SecurityManager.getInstance();
    this.store = Store.getInstance();
  }

  async exportCookies(domain: string): Promise<ExportResult> {
    try {
      // Check rate limiting
      const isAllowed = await this.securityManager.isOperationAllowed('cookie-export', domain);
      if (!isAllowed) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      this.store.setState({ loading: true });

      // Get cookies
      const cookies = await new Promise<chrome.cookies.Cookie[]>((resolve, reject) => {
        chrome.cookies.getAll({ domain }, (cookies: chrome.cookies.Cookie[]) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(cookies);
          }
        });
      });

      // Validate cookies
      const validationResults = await Promise.all(
        cookies.map(cookie => this.validator.validateCookie(cookie))
      );

      // Filter out invalid cookies
      const validCookies = cookies.filter((_, index) => 
        validationResults[index].isValid
      );

      // Validate cookie data structure
      if (!this.securityManager.validateCookieData(validCookies)) {
        throw new Error('Invalid cookie data structure');
      }

      // Convert Chrome cookies to our Cookie type
      const convertedCookies: Cookie[] = validCookies.map(cookie => ({
        domain: cookie.domain,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || '/',
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate
      }));

      // Encrypt valid cookies
      const encrypted = await this.security.encryptCookies(convertedCookies);

      const result = {
        success: true,
        data: encrypted,
        metadata: {
          total: cookies.length,
          valid: validCookies.length,
          timestamp: Date.now()
        }
      };

      this.store.setState({
        cookies: validCookies,
        loading: false,
        lastOperation: {
          type: 'export',
          timestamp: Date.now(),
          success: true
        }
      });

      return result;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, 'cookie-export');
      
      this.store.setState({
        loading: false,
        error: error as Error,
        lastOperation: {
          type: 'export',
          timestamp: Date.now(),
          success: false
        }
      });
      
      throw error;
    }
  }

  async importCookies(encryptedData: EncryptedData): Promise<ImportResult> {
    try {
      // Check rate limiting
      const isAllowed = await this.securityManager.isOperationAllowed('cookie-import', 'global');
      if (!isAllowed) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      this.store.setState({ loading: true });

      // Decrypt cookies
      const cookies = await this.security.decryptCookies(encryptedData);

      // Validate cookie data structure
      if (!this.securityManager.validateCookieData(cookies)) {
        throw new Error('Invalid cookie data structure');
      }

      // Convert our Cookie type to Chrome cookie format
      const chromeCookies: chrome.cookies.SetDetails[] = cookies.map(cookie => {
        const url = `https://${cookie.domain}${cookie.path}`;
        return {
          url,
          domain: cookie.domain,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite as chrome.cookies.SameSiteStatus,
          expirationDate: cookie.expirationDate
        };
      });

      // Create a type-safe validator for Chrome cookies
      const validateChromeCookie = (cookie: chrome.cookies.SetDetails): boolean => {
        return Boolean(
          cookie.url &&
          cookie.domain &&
          cookie.name &&
          cookie.value &&
          cookie.path
        );
      };

      // Validate each cookie
      const validationResults = await Promise.all(
        chromeCookies.map(async cookie => {
          const isValid = validateChromeCookie(cookie);
          return { isValid, cookie };
        })
      );

      // Filter valid cookies
      const validCookies = chromeCookies.filter((_, index) => 
        validationResults[index].isValid
      );

      // Set cookies
      const results = await Promise.all(
        validCookies.map(async cookie => {
          try {
            await new Promise<void>((resolve, reject) => {
              chrome.cookies.set(cookie, () => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve();
                }
              });
            });
            return { success: true, cookie };
          } catch (error) {
            return { success: false, cookie, error };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;

      const result = {
        success: successCount > 0,
        metadata: {
          total: cookies.length,
          valid: validCookies.length,
          imported: successCount,
          timestamp: Date.now()
        }
      };

      this.store.setState({
        cookies: validCookies as unknown as chrome.cookies.Cookie[],
        loading: false,
        lastOperation: {
          type: 'import',
          timestamp: Date.now(),
          success: successCount > 0
        }
      });

      return result;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, 'cookie-import');
      
      this.store.setState({
        loading: false,
        error: error as Error,
        lastOperation: {
          type: 'import',
          timestamp: Date.now(),
          success: false
        }
      });
      
      throw error;
    }
  }
} 