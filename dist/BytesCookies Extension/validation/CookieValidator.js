"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieValidator = void 0;
const types_1 = require("../types");
class CookieValidator {
    async validateCookie(cookie) {
        const errors = [];
        const warnings = [];
        try {
            this.validateRequiredFields(cookie, errors);
            this.validateDomain(cookie.domain, errors);
            this.validateValue(cookie.value, warnings);
            await this.performSecurityChecks(cookie, errors, warnings);
            this.validateSize(cookie, warnings);
            this.validateFormat(cookie, errors);
            this.validateSecurityFlags(cookie, warnings);
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: this.generateMetadata(cookie)
            };
        }
        catch (error) {
            throw new types_1.ValidationError('Validation failed', error);
        }
    }
    validateRequiredFields(cookie, errors) {
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
    validateDomain(domain, errors) {
        if (!CookieValidator.DOMAIN_REGEX.test(domain)) {
            errors.push({
                field: 'domain',
                code: 'INVALID_DOMAIN_FORMAT',
                message: 'Invalid domain format',
                severity: 'error'
            });
        }
    }
    validateValue(value, warnings) {
        if (value.length > 4096) {
            warnings.push({
                field: 'value',
                code: 'VALUE_TOO_LONG',
                message: 'Cookie value exceeds recommended length',
                severity: 'warning'
            });
        }
    }
    async performSecurityChecks(cookie, errors, warnings) {
        if (this.containsSuspiciousContent(cookie.value)) {
            errors.push({
                field: 'value',
                code: 'SUSPICIOUS_CONTENT',
                message: 'Cookie value contains suspicious content',
                severity: 'error'
            });
        }
    }
    generateMetadata(cookie) {
        return {
            created: Date.now(),
            size: JSON.stringify(cookie).length,
            hasSecureFlag: cookie.secure || false
        };
    }
    containsSuspiciousContent(value) {
        return CookieValidator.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value));
    }
    validateFormat(cookie, errors) {
        if (cookie.domain && !this.isValidDomainFormat(cookie.domain)) {
            errors.push({
                field: 'domain',
                code: 'INVALID_DOMAIN_FORMAT',
                message: 'Invalid domain format',
                severity: 'error'
            });
        }
        if (!cookie.path.startsWith('/')) {
            errors.push({
                field: 'path',
                code: 'INVALID_PATH_FORMAT',
                message: 'Path must start with /',
                severity: 'error'
            });
        }
    }
    validateSecurityFlags(cookie, warnings) {
        if (cookie.domain.includes('https://') && !cookie.secure) {
            warnings.push({
                field: 'secure',
                code: 'MISSING_SECURE_FLAG',
                message: 'Secure flag recommended for HTTPS domains',
                severity: 'warning'
            });
        }
        if (!cookie.httpOnly) {
            warnings.push({
                field: 'httpOnly',
                code: 'MISSING_HTTPONLY_FLAG',
                message: 'HttpOnly flag recommended for security',
                severity: 'warning'
            });
        }
        if (!cookie.sameSite || cookie.sameSite === 'none') {
            warnings.push({
                field: 'sameSite',
                code: 'WEAK_SAME_SITE',
                message: 'Consider using strict SameSite policy',
                severity: 'warning'
            });
        }
    }
    validateSize(cookie, warnings) {
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
    isValidDomainFormat(domain) {
        return CookieValidator.DOMAIN_REGEX.test(domain);
    }
}
exports.CookieValidator = CookieValidator;
CookieValidator.REQUIRED_FIELDS = ['domain', 'name', 'value', 'path'];
CookieValidator.DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
CookieValidator.MAX_COOKIE_SIZE = 4096;
CookieValidator.MAX_DOMAIN_LENGTH = 255;
CookieValidator.SUSPICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onclick/i,
    /onerror/i,
    /onload/i,
    /%3Cscript/i
];
//# sourceMappingURL=CookieValidator.js.map