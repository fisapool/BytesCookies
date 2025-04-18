"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieEncryption = void 0;
const crypto_js_1 = require("crypto-js");
const types_1 = require("../types");
const CryptoJS = __importStar(require("crypto-js"));
class CookieEncryption {
    constructor() {
        this.KEY_SIZE = 256;
        this.IV_SIZE = 128;
        this.SALT_SIZE = 128;
        this.ITERATIONS = 10000;
        this.salt = crypto_js_1.lib.WordArray.random(this.SALT_SIZE / 8);
        this.key = (0, crypto_js_1.PBKDF2)(crypto_js_1.lib.WordArray.random(this.KEY_SIZE / 8).toString(), this.salt, {
            keySize: this.KEY_SIZE / 32,
            iterations: this.ITERATIONS
        });
    }
    async encryptCookies(cookies) {
        try {
            const iv = crypto_js_1.lib.WordArray.random(this.IV_SIZE / 8);
            const data = JSON.stringify(cookies);
            const payload = {
                data: cookies,
                version: '2.0',
                timestamp: Date.now()
            };
            const encrypted = crypto_js_1.AES.encrypt(JSON.stringify(payload), this.key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
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
        }
        catch (error) {
            throw new types_1.SecurityError('Encryption failed', error);
        }
    }
    async decryptCookies(encryptedData) {
        try {
            const hmac = CryptoJS.HmacSHA256(encryptedData.data, this.key);
            if (hmac.toString() !== encryptedData.hash) {
                throw new types_1.SecurityError('Data integrity check failed');
            }
            const decrypted = crypto_js_1.AES.decrypt(encryptedData.data, this.key, {
                iv: crypto_js_1.enc.Hex.parse(encryptedData.iv)
            });
            const payload = JSON.parse(decrypted.toString(crypto_js_1.enc.Utf8));
            if (payload.version !== '2.0') {
                throw new types_1.SecurityError('Unsupported data version');
            }
            const age = Date.now() - payload.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                throw new types_1.SecurityError('Data has expired');
            }
            return payload.data;
        }
        catch (error) {
            throw new types_1.SecurityError('Decryption failed', error);
        }
    }
}
exports.CookieEncryption = CookieEncryption;
//# sourceMappingURL=CookieEncryption.js.map