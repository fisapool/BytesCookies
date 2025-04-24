export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLog {
  id: string;
  timestamp: Date;
  message: string;
  context: string;
  severity: ErrorSeverity;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorLog[] = [];
  private readonly maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  async handleError(error: Error, context: string, severity: ErrorSeverity = 'medium'): Promise<void> {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message: error.message,
      context,
      severity,
      stack: error.stack,
      metadata: this.getErrorMetadata()
    };

    await this.logError(errorLog);
    await this.notifyUser(errorLog);
    
    if (severity === 'critical') {
      await this.handleCriticalError(errorLog);
    }
  }

  private async logError(errorLog: ErrorLog): Promise<void> {
    this.errorLog.unshift(errorLog);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    await this.persistError(errorLog);
  }

  private async persistError(errorLog: ErrorLog): Promise<void> {
    try {
      await chrome.storage.local.set({
        [`error_${errorLog.id}`]: errorLog
      });
    } catch (e) {
      console.error('Failed to persist error:', e);
    }
  }

  private getErrorMetadata(): Record<string, unknown> {
    return {
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: window.location.href,
      version: chrome.runtime.getManifest().version
    };
  }

  private async notifyUser(errorLog: ErrorLog): Promise<void> {
    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
      errorDisplay.style.display = 'block';
      errorDisplay.innerHTML = `
        <div class="error-message ${errorLog.severity}">
          <h4>${errorLog.context} Error</h4>
          <p>${errorLog.message}</p>
        </div>
      `;
    }
  }

  private async handleCriticalError(errorLog: ErrorLog): Promise<void> {
    // Implement recovery mechanisms
    await this.attemptRecovery(errorLog);
    
    // If recovery fails, notify user and provide guidance
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'img/logo-48.png',
      title: 'Critical Error',
      message: 'An error occurred. Please try restarting the extension.'
    });
  }

  private async attemptRecovery(errorLog: ErrorLog): Promise<boolean> {
    // Implement recovery logic based on error context
    switch (errorLog.context) {
      case 'cookie-export':
        return await this.recoverCookieExport();
      case 'cookie-import':
        return await this.recoverCookieImport();
      default:
        return false;
    }
  }

  private async recoverCookieExport(): Promise<boolean> {
    try {
      await chrome.cookies.getAllCookieStores();
      return true;
    } catch {
      return false;
    }
  }

  private async recoverCookieImport(): Promise<boolean> {
    try {
      await chrome.cookies.getAll({});
      return true;
    } catch {
      return false;
    }
  }
} 