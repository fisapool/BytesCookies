import { 
  EnhancedError, 
  ErrorResult, 
  RecoveryStrategy, 
  RecoveryResult,
  SecurityError,
  ValidationError 
} from '../types';

export class ErrorManager {
  private static readonly ERROR_LEVELS = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    INFO: 'info'
  };

  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly recoveryStrategies = new Map<string, RecoveryStrategy>();
  private retryCount: Map<string, number> = new Map();

  constructor() {
    this.initializeRecoveryStrategies();
  }

  async handleError(error: Error, context: string): Promise<ErrorResult> {
    try {
      const enhancedError = this.enhanceError(error, context);
      await this.logError(enhancedError);

      // Check if we should retry
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

      // Attempt recovery if retry failed or wasn't attempted
      const recoveryResult = await this.attemptRecovery(enhancedError);
      
      // Update UI with error status
      this.updateUIWithError(enhancedError, recoveryResult);

      return {
        handled: true,
        recovered: recoveryResult.success,
        message: this.getErrorMessage(enhancedError),
        action: recoveryResult.action
      };
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
      return this.getFallbackErrorResult(error);
    } finally {
      // Cleanup
      this.cleanupErrorState(error);
    }
  }

  private enhanceError(error: Error, context: string): EnhancedError {
    return {
      original: error,
      timestamp: new Date(),
      context,
      level: this.determineErrorLevel(error),
      code: this.getErrorCode(error),
      recoverable: this.isRecoverable(error)
    };
  }

  private async attemptRecovery(error: EnhancedError): Promise<RecoveryResult> {
    if (!error.recoverable) {
      return { success: false, action: 'none' };
    }

    const strategy = this.recoveryStrategies.get(error.code);
    if (!strategy) {
      return { success: false, action: 'none' };
    }

    try {
      return await strategy.execute(error);
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      return { success: false, action: 'failed' };
    }
  }

  private updateUIWithError(error: EnhancedError, recovery: RecoveryResult): void {
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

  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set('ENCRYPTION_ERROR', {
      execute: async (error) => this.handleEncryptionError(error)
    });
    // Add more strategies as needed
  }

  private determineErrorLevel(error: Error): string {
    if (error instanceof SecurityError) return ErrorManager.ERROR_LEVELS.CRITICAL;
    if (error instanceof ValidationError) return ErrorManager.ERROR_LEVELS.WARNING;
    return ErrorManager.ERROR_LEVELS.INFO;
  }

  private getErrorCode(error: Error): string {
    return error.name || 'UNKNOWN_ERROR';
  }

  private isRecoverable(error: Error): boolean {
    return !(error instanceof SecurityError);
  }

  private async logError(error: EnhancedError): Promise<void> {
    console.error('Enhanced Error:', {
      message: error.original.message,
      context: error.context,
      level: error.level,
      timestamp: error.timestamp
    });
  }

  private getErrorMessage(error: EnhancedError): string {
    return `${error.level.toUpperCase()}: ${error.original.message}`;
  }

  private getFallbackErrorResult(error: Error): ErrorResult {
    return {
      handled: false,
      recovered: false,
      message: error.message,
      action: 'none'
    };
  }

  private async handleEncryptionError(error: EnhancedError): Promise<RecoveryResult> {
    return { success: false, action: 'none' };
  }

  private shouldRetry(error: EnhancedError): boolean {
    const errorKey = `${error.code}-${error.context}`;
    const attempts = this.retryCount.get(errorKey) || 0;

    if (attempts >= ErrorManager.MAX_RETRY_ATTEMPTS) {
      return false;
    }

    // Only retry certain types of errors
    return [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'TEMPORARY_FAILURE'
    ].includes(error.code);
  }

  private async retryOperation(error: EnhancedError): Promise<RecoveryResult> {
    const errorKey = `${error.code}-${error.context}`;
    const attempts = (this.retryCount.get(errorKey) || 0) + 1;
    this.retryCount.set(errorKey, attempts);

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Attempt the operation again
      // This would need to be implemented based on the specific operation
      return { success: false, action: 'retry_failed' };
    } catch (retryError) {
      return { success: false, action: 'retry_failed' };
    }
  }

  private cleanupErrorState(error: Error): void {
    // Cleanup retry counts after some time
    setTimeout(() => {
      const errorKey = `${error.name}-${error.message}`;
      this.retryCount.delete(errorKey);
    }, 30000); // 30 seconds
  }
} 