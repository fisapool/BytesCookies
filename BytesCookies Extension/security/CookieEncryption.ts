import { AES, enc, SHA256, lib, PBKDF2 } from 'crypto-js';
import { Cookie, EncryptedData, SecurityError } from '../types';
import * as CryptoJS from 'crypto-js';

export class CookieEncryption {
  private readonly KEY_SIZE = 256;
  private readonly IV_SIZE = 128;
  private readonly SALT_SIZE = 128;
  private readonly ITERATIONS = 10000;
  private key: CryptoJS.lib.WordArray;
  private salt: CryptoJS.lib.WordArray;

  constructor() {
    // Generate a secure salt
    this.salt = lib.WordArray.random(this.SALT_SIZE / 8);
    // Derive key using PBKDF2
    this.key = PBKDF2(
      lib.WordArray.random(this.KEY_SIZE / 8).toString(),
      this.salt,
      {
        keySize: this.KEY_SIZE / 32,
        iterations: this.ITERATIONS
      }
    );
  }
  
  async encryptCookies(cookies: Cookie[]): Promise<EncryptedData> {
    try {
      const iv = lib.WordArray.random(this.IV_SIZE / 8);
      const data = JSON.stringify(cookies);
      
      // Add version and timestamp to data before encryption
      const payload = {
        data: cookies,
        version: '2.0',
        timestamp: Date.now()
      };

      const encrypted = AES.encrypt(JSON.stringify(payload), this.key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Generate HMAC for integrity
      const hmac = CryptoJS.HmacSHA256(encrypted.toString(), this.key);
      const hash = hmac.toString();

      return {
        data: encrypted.toString(),
        iv: iv.toString(),
        hash,
        salt: this.salt.toString(),
        timestamp: Date.now(),
        version: '2.0'
      };
    } catch (error) {
      throw new SecurityError('Encryption failed', error as Error);
    }
  }

  async decryptCookies(encryptedData: EncryptedData): Promise<Cookie[]> {
    try {
      // Verify HMAC first
      const hmac = CryptoJS.HmacSHA256(encryptedData.data, this.key);
      if (hmac.toString() !== encryptedData.hash) {
        throw new SecurityError('Data integrity check failed');
      }

      const decrypted = AES.decrypt(encryptedData.data, this.key, {
        iv: enc.Hex.parse(encryptedData.iv)
      });

      const payload = JSON.parse(decrypted.toString(enc.Utf8));

      // Version check
      if (payload.version !== '2.0') {
        throw new SecurityError('Unsupported data version');
      }

      // Timestamp check (optional: implement expiration)
      const age = Date.now() - payload.timestamp;
      if (age > 24 * 60 * 60 * 1000) { // 24 hours
        throw new SecurityError('Data has expired');
      }

      return payload.data;
    } catch (error) {
      throw new SecurityError('Decryption failed', error as Error);
    }
  }
} 