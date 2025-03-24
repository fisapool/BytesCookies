import { 
  Cookie, 
  ValidationResult, 
  ValidationErrorInfo,
  ValidationWarning,
  SecurityError,
  ValidationError
} from '../types';

export class CookieValidator {
  private static readonly REQUIRED_FIELDS = ['domain', 'name', 'value', 'path'];
  private static readonly DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  private static readonly MAX_COOKIE_SIZE = 4096;
  private static readonly MAX_DOMAIN_LENGTH = 255;
  private static readonly SUSPICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onclick/i,
    /onerror/i,
    /onload/i,
    /%3Cscript/i // URL encoded
  ];

  async validateCookie(cookie: Cookie): Promise<ValidationResult> {
    const errors: ValidationErrorInfo[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic validation
      this.validateRequiredFields(cookie, errors);
      this.validateDomain(cookie.domain, errors);
      this.validateValue(cookie.value, warnings);

      // Enhanced security checks
      await this.performSecurityChecks(cookie, errors, warnings);
      
      // Size validation
      this.validateSize(cookie, warnings);
      
      // Format validation
      this.validateFormat(cookie, errors);

      // Security best practices
      this.validateSecurityFlags(cookie, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: this.generateMetadata(cookie)
      };
    } catch (error) {
      throw new ValidationError('Validation failed', error);
    }
  }

  private validateRequiredFields(cookie: Cookie, errors: ValidationErrorInfo[]): void {
    CookieValidator.REQUIRED_FIELDS.forEach(field => {
      if (!cookie[field]) {
        errors.push({
          field,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          severity: 'error'
        });
      }
    });
  }

  private validateDomain(domain: string, errors: ValidationErrorInfo[]): void {
    if (!CookieValidator.DOMAIN_REGEX.test(domain)) {
      errors.push({
        field: 'domain',
        code: 'INVALID_DOMAIN_FORMAT',
        message: 'Invalid domain format',
        severity: 'error'
      });
    }
  }

  private validateValue(value: string, warnings: ValidationWarning[]): void {
    if (value.length > 4096) {
      warnings.push({
        field: 'value',
        code: 'VALUE_TOO_LONG',
        message: 'Cookie value exceeds recommended length',
        severity: 'warning'
      });
    }
  }

  private async performSecurityChecks(
    cookie: Cookie, 
    errors: ValidationErrorInfo[], 
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for suspicious values
    if (this.containsSuspiciousContent(cookie.value)) {
      errors.push({
        field: 'value',
        code: 'SUSPICIOUS_CONTENT',
        message: 'Cookie value contains suspicious content',
        severity: 'error'
      });
    }
  }

  private generateMetadata(cookie: Cookie): any {
    return {
      created: Date.now(),
      size: JSON.stringify(cookie).length,
      hasSecureFlag: cookie.secure || false
    };
  }

  private containsSuspiciousContent(value: string): boolean {
    return CookieValidator.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value));
  }

  private validateFormat(cookie: Cookie, errors: ValidationErrorInfo[]): void {
    // Check domain format
    if (cookie.domain && !this.isValidDomainFormat(cookie.domain)) {
      errors.push({
        field: 'domain',
        code: 'INVALID_DOMAIN_FORMAT',
        message: 'Invalid domain format',
        severity: 'error'
      });
    }

    // Check path format
    if (!cookie.path.startsWith('/')) {
      errors.push({
        field: 'path',
        code: 'INVALID_PATH_FORMAT',
        message: 'Path must start with /',
        severity: 'error'
      });
    }
  }

  private validateSecurityFlags(cookie: Cookie, warnings: ValidationWarning[]): void {
    // HTTPS domains should use secure flag
    if (cookie.domain.includes('https://') && !cookie.secure) {
      warnings.push({
        field: 'secure',
        code: 'MISSING_SECURE_FLAG',
        message: 'Secure flag recommended for HTTPS domains',
        severity: 'warning'
      });
    }

    // Recommend httpOnly for sensitive cookies
    if (!cookie.httpOnly) {
      warnings.push({
        field: 'httpOnly',
        code: 'MISSING_HTTPONLY_FLAG',
        message: 'HttpOnly flag recommended for security',
        severity: 'warning'
      });
    }

    // Check SameSite attribute
    if (!cookie.sameSite || cookie.sameSite === 'none') {
      warnings.push({
        field: 'sameSite',
        code: 'WEAK_SAME_SITE',
        message: 'Consider using strict SameSite policy',
        severity: 'warning'
      });
    }
  }

  private validateSize(cookie: Cookie, warnings: ValidationWarning[]): void {
    const size = JSON.stringify(cookie).length;
    if (size > this.MAX_COOKIE_SIZE) {
      warnings.push({
        field: 'size',
        code: 'COOKIE_TOO_LARGE',
        message: `Cookie size (${size} bytes) exceeds recommended limit`,
        severity: 'warning'
      });
    }
  }

  private isValidDomainFormat(domain: string): boolean {
    return CookieValidator.DOMAIN_REGEX.test(domain);
  }
}