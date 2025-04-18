"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorManager = void 0;
const types_1 = require("../types");
class ErrorManager {
    constructor() {
        this.recoveryStrategies = new Map();
        this.retryCount = new Map();
        this.initializeRecoveryStrategies();
    }
    async handleError(error, context) {
        try {
            const enhancedError = this.enhanceError(error, context);
            await this.logError(enhancedError);
            if (this.shouldRetry(enhancedError)) {
                const retryResult = await this.retryOperation(enhancedError);
                if (retryResult.success) {
                    return {
                        handled: true,
                        recovered: true,
                        message: 'Operation recovered after retry',
                        action: retryResult.action
                    };
                }
            }
            const recoveryResult = await this.attemptRecovery(enhancedError);
            this.updateUIWithError(enhancedError, recoveryResult);
            return {
                handled: true,
                recovered: recoveryResult.success,
                message: this.getErrorMessage(enhancedError),
                action: recoveryResult.action
            };
        }
        catch (handlingError) {
            console.error('Error handling failed:', handlingError);
            return this.getFallbackErrorResult(error);
        }
        finally {
            this.cleanupErrorState(error);
        }
    }
    enhanceError(error, context) {
        return {
            original: error,
            timestamp: new Date(),
            context,
            level: this.determineErrorLevel(error),
            code: this.getErrorCode(error),
            recoverable: this.isRecoverable(error)
        };
    }
    async attemptRecovery(error) {
        if (!error.recoverable) {
            return { success: false, action: 'none' };
        }
        const strategy = this.recoveryStrategies.get(error.code);
        if (!strategy) {
            return { success: false, action: 'none' };
        }
        try {
            return await strategy.execute(error);
        }
        catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            return { success: false, action: 'failed' };
        }
    }
    updateUIWithError(error, recovery) {
        const message = this.getErrorMessage(error);
        const element = document.getElementById('error-display');
        if (element) {
            element.innerHTML = `
        <div class="error-message ${error.level}">
          <p>${message}</p>
          ${recovery.success ?
                `<p class="recovery-message">Recovered: ${recovery.action}</p>` :
                ''}
          <button onclick="dismissError()">Dismiss</button>
        </div>
      `;
        }
    }
    initializeRecoveryStrategies() {
        this.recoveryStrategies.set('ENCRYPTION_ERROR', {
            execute: async (error) => this.handleEncryptionError(error)
        });
    }
    determineErrorLevel(error) {
        if (error instanceof types_1.SecurityError)
            return ErrorManager.ERROR_LEVELS.CRITICAL;
        if (error instanceof types_1.ValidationError)
            return ErrorManager.ERROR_LEVELS.WARNING;
        return ErrorManager.ERROR_LEVELS.INFO;
    }
    getErrorCode(error) {
        return error.name || 'UNKNOWN_ERROR';
    }
    isRecoverable(error) {
        return !(error instanceof types_1.SecurityError);
    }
    async logError(error) {
        console.error('Enhanced Error:', {
            message: error.original.message,
            context: error.context,
            level: error.level,
            timestamp: error.timestamp
        });
    }
    getErrorMessage(error) {
        return `${error.level.toUpperCase()}: ${error.original.message}`;
    }
    getFallbackErrorResult(error) {
        return {
            handled: false,
            recovered: false,
            message: error.message,
            action: 'none'
        };
    }
    async handleEncryptionError(error) {
        return { success: false, action: 'none' };
    }
    shouldRetry(error) {
        const errorKey = `${error.code}-${error.context}`;
        const attempts = this.retryCount.get(errorKey) || 0;
        if (attempts >= ErrorManager.MAX_RETRY_ATTEMPTS) {
            return false;
        }
        return [
            'NETWORK_ERROR',
            'TIMEOUT_ERROR',
            'TEMPORARY_FAILURE'
        ].includes(error.code);
    }
    async retryOperation(error) {
        const errorKey = `${error.code}-${error.context}`;
        const attempts = (this.retryCount.get(errorKey) || 0) + 1;
        this.retryCount.set(errorKey, attempts);
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
            return { success: false, action: 'retry_failed' };
        }
        catch (retryError) {
            return { success: false, action: 'retry_failed' };
        }
    }
    cleanupErrorState(error) {
        setTimeout(() => {
            const errorKey = `${error.name}-${error.message}`;
            this.retryCount.delete(errorKey);
        }, 30000);
    }
}
exports.ErrorManager = ErrorManager;
ErrorManager.ERROR_LEVELS = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    INFO: 'info'
};
ErrorManager.MAX_RETRY_ATTEMPTS = 3;
//# sourceMappingURL=ErrorManager.js.map