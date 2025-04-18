export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'no_restriction' | 'lax' | 'strict';
  expirationDate?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

export interface ValidationErrorDetails {
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
  errors?: string[];
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

export type AuthEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT_SUCCESS'
  | 'SESSION_EXPIRED'
  | 'TOKEN_REFRESHED'
  | 'TOKEN_REFRESH_FAILED';

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  deviceId?: string;
  lastActivity?: number;
  user: {
    id: string;
    email: string;
    name: string;
  };
  device?: {
    deviceId: string;
    isActive: boolean;
  };
}

export interface ErrorDetails {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
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