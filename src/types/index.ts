export interface Cookie {
  domain: string;
  name: string;
  value: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expirationDate?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  hash: string;
  timestamp: number;
  version: string;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  name?: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: any;
}

export interface RecoveryStrategy {
  execute(error: EnhancedError): Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  action: string;
}

export interface EnhancedError {
  original: Error;
  timestamp: Date;
  context: string;
  level: string;
  code: string;
  recoverable: boolean;
}

export interface ErrorResult {
  handled: boolean;
  recovered: boolean;
  message: string;
  action: string;
}

export interface ExportResult {
  success: boolean;
  data: EncryptedData;
  metadata: {
    total: number;
    valid: number;
    timestamp: number;
  };
}

export interface ImportResult {
  success: boolean;
  metadata: {
    total: number;
    valid: number;
    imported: number;
    timestamp: number;
  };
}

export class SecurityError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'ValidationError';
  }
} 