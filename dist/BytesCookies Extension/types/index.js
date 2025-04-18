"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.SecurityError = void 0;
class SecurityError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
class ValidationError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=index.js.map