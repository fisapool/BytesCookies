import { CookieEncryption } from './security/CookieEncryption';
import { CookieValidator } from './validation/CookieValidator';
import { ErrorManager } from './errors/ErrorManager';
import { ExportResult, EncryptedData, ImportResult } from './types';

declare const chrome: any; // Add Chrome types declaration

export class CookieManager {
  private readonly security: CookieEncryption;
  private readonly validator: CookieValidator;
  private readonly errorManager: ErrorManager;

  constructor() {
    this.security = new CookieEncryption();
    this.validator = new CookieValidator();
    this.errorManager = new ErrorManager();
  }

  async exportCookies(domain: string): Promise<ExportResult> {
    try {
      // Get cookies
      const cookies = await chrome.cookies.getAll({ domain });

      // Validate cookies
      const validationResults = await Promise.all(
        cookies.map(cookie => this.validator.validateCookie(cookie))
      );

      // Filter out invalid cookies
      const validCookies = cookies.filter((_, index) => 
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
      await this.errorManager.handleError(error, 'export');
      throw error;
    }
  }

  async importCookies(encryptedData: EncryptedData): Promise<ImportResult> {
    try {
      // Decrypt cookies
      const cookies = await this.security.decryptCookies(encryptedData);

      // Validate each cookie
      const validationResults = await Promise.all(
        cookies.map(cookie => this.validator.validateCookie(cookie))
      );

      // Filter valid cookies
      const validCookies = cookies.filter((_, index) => 
        validationResults[index].isValid
      );

      // Set cookies
      const results = await Promise.all(
        validCookies.map(async cookie => {
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
      await this.errorManager.handleError(error, 'import');
      throw error;
    }
  }
} 