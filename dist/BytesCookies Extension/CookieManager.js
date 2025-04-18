"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieManager = void 0;
const CookieEncryption_1 = require("./security/CookieEncryption");
const CookieValidator_1 = require("./validation/CookieValidator");
const ErrorManager_1 = require("./errors/ErrorManager");
class CookieManager {
    constructor() {
        this.sessionData = null;
        this.refreshTokenTimeout = null;
        this.TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;
        this.MAX_RETRIES = 3;
        this.BASE_RETRY_DELAY = 1000;
        this.MAX_RETRY_DELAY = 10000;
        this.JITTER_FACTOR = 0.1;
        this.AUTH_EVENTS = {
            LOGIN_SUCCESS: 'LOGIN_SUCCESS',
            LOGIN_FAILURE: 'LOGIN_FAILURE',
            LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',
            SESSION_EXPIRED: 'SESSION_EXPIRED',
            TOKEN_REFRESHED: 'TOKEN_REFRESHED',
            TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED'
        };
        this.security = new CookieEncryption_1.CookieEncryption();
        this.validator = new CookieValidator_1.CookieValidator();
        this.errorManager = new ErrorManager_1.ErrorManager();
        this.initializeSession();
        this.setupMessageListeners();
    }
    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === this.AUTH_EVENTS.SESSION_EXPIRED) {
                this.handleSessionExpired();
            }
            else if (message.type === this.AUTH_EVENTS.TOKEN_REFRESHED) {
                this.handleTokenRefreshed();
            }
            return true;
        });
    }
    async handleSessionExpired() {
        this.sessionData = null;
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = null;
        }
        await chrome.storage.local.remove(['session']);
        this.notifyAuthEvent(this.AUTH_EVENTS.SESSION_EXPIRED);
    }
    async handleTokenRefreshed() {
        this.scheduleTokenRefresh();
        this.notifyAuthEvent(this.AUTH_EVENTS.TOKEN_REFRESHED);
    }
    notifyAuthEvent(eventType, data) {
        chrome.runtime.sendMessage({
            type: 'AUTH_EVENT',
            event: eventType,
            data,
            timestamp: Date.now()
        });
    }
    async initializeSession() {
        try {
            const { session } = await chrome.storage.local.get(['session']);
            if (session) {
                this.sessionData = session;
                this.scheduleTokenRefresh();
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'START_SESSION_REFRESH' });
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'session_init');
            }
        }
    }
    calculateRetryDelay(attempt) {
        const exponentialDelay = Math.min(this.BASE_RETRY_DELAY * Math.pow(2, attempt), this.MAX_RETRY_DELAY);
        const jitter = exponentialDelay * this.JITTER_FACTOR * (Math.random() * 2 - 1);
        return Math.max(exponentialDelay + jitter, this.BASE_RETRY_DELAY);
    }
    async fetchWithRetry(url, options, context) {
        let lastError = null;
        let isNetworkError = false;
        for (let i = 0; i < this.MAX_RETRIES; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return response;
                }
                if (response.status === 401) {
                    const refreshSuccess = await this.refreshToken();
                    if (refreshSuccess) {
                        const newOptions = {
                            ...options,
                            headers: await this.getAuthHeaders()
                        };
                        return fetch(url, newOptions);
                    }
                }
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            catch (error) {
                lastError = error;
                isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
                console.error(`Fetch attempt ${i + 1} failed in ${context}:`, error);
                if (isNetworkError) {
                    if (!navigator.onLine) {
                        throw new Error('Network is offline');
                    }
                }
                if (i < this.MAX_RETRIES - 1) {
                    const delay = this.calculateRetryDelay(i);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed to fetch after ${this.MAX_RETRIES} attempts`);
    }
    async refreshToken() {
        var _a;
        try {
            if (!((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.refreshToken)) {
                throw new Error('No refresh token available');
            }
            const response = await this.fetchWithRetry('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.sessionData.refreshToken })
            }, 'token_refresh');
            const data = await response.json();
            this.sessionData = {
                ...this.sessionData,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                user: data.user
            };
            await chrome.storage.local.set({ session: this.sessionData });
            this.scheduleTokenRefresh();
            return true;
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'token_refresh');
            }
            return false;
        }
    }
    scheduleTokenRefresh() {
        var _a;
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
        if (!((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.expiresAt))
            return;
        const timeUntilExpiry = this.sessionData.expiresAt - Date.now();
        const refreshTime = Math.max(0, timeUntilExpiry - this.TOKEN_REFRESH_THRESHOLD);
        this.refreshTokenTimeout = window.setTimeout(async () => {
            const success = await this.refreshToken();
            if (!success) {
                await this.logout();
            }
        }, refreshTime);
    }
    async getAuthHeaders() {
        var _a;
        if (!((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.accessToken)) {
            throw new Error('No active session');
        }
        if (this.sessionData.expiresAt - Date.now() < this.TOKEN_REFRESH_THRESHOLD) {
            const refreshed = await this.refreshToken();
            if (!refreshed) {
                throw new Error('Session expired');
            }
        }
        return {
            'Authorization': `Bearer ${this.sessionData.accessToken}`,
            'Content-Type': 'application/json'
        };
    }
    async exportCookies(domain) {
        var _a;
        try {
            if (!((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.accessToken)) {
                throw new Error('Authentication required');
            }
            const cookies = await chrome.cookies.getAll({ domain });
            const validationResults = await Promise.all(cookies.map((cookie) => this.validator.validateCookie(cookie)));
            const validCookies = cookies.filter((_, index) => validationResults[index].isValid);
            const encrypted = await this.security.encryptCookies(validCookies);
            return {
                success: true,
                data: encrypted,
                metadata: {
                    total: cookies.length,
                    valid: validCookies.length,
                    timestamp: Date.now()
                }
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'export');
            }
            throw error;
        }
    }
    async importCookies(encryptedData) {
        var _a;
        try {
            if (!((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.accessToken)) {
                throw new Error('Authentication required');
            }
            const cookies = await this.security.decryptCookies(encryptedData);
            const validationResults = await Promise.all(cookies.map((cookie) => this.validator.validateCookie(cookie)));
            const validCookies = cookies.filter((_, index) => validationResults[index].isValid);
            const results = await Promise.all(validCookies.map(async (cookie) => {
                try {
                    await chrome.cookies.set(cookie);
                    return { success: true, cookie };
                }
                catch (error) {
                    return { success: false, cookie, error };
                }
            }));
            const successCount = results.filter(r => r.success).length;
            return {
                success: successCount > 0,
                metadata: {
                    total: cookies.length,
                    valid: validCookies.length,
                    imported: successCount,
                    timestamp: Date.now()
                }
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'import');
            }
            throw error;
        }
    }
    async login(email, password) {
        try {
            const response = await this.fetchWithRetry('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            }, 'login');
            if (!response.ok) {
                const error = await response.json();
                this.notifyAuthEvent(this.AUTH_EVENTS.LOGIN_FAILURE, { error: error.message });
                return false;
            }
            const data = await response.json();
            this.sessionData = {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresAt: data.expiresAt,
                user: data.user
            };
            await chrome.storage.local.set({ session: this.sessionData });
            this.scheduleTokenRefresh();
            this.notifyAuthEvent(this.AUTH_EVENTS.LOGIN_SUCCESS);
            return true;
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'login');
                this.notifyAuthEvent(this.AUTH_EVENTS.LOGIN_FAILURE, { error: error.message });
            }
            return false;
        }
    }
    async logout() {
        var _a;
        try {
            if ((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.accessToken) {
                await this.fetchWithRetry('/api/auth/logout', {
                    method: 'POST',
                    headers: await this.getAuthHeaders()
                }, 'logout');
            }
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'logout');
            }
        }
        finally {
            this.sessionData = null;
            if (this.refreshTokenTimeout) {
                clearTimeout(this.refreshTokenTimeout);
                this.refreshTokenTimeout = null;
            }
            await chrome.storage.local.remove(['session']);
            this.notifyAuthEvent(this.AUTH_EVENTS.LOGOUT_SUCCESS);
        }
    }
    isAuthenticated() {
        var _a;
        return !!((_a = this.sessionData) === null || _a === void 0 ? void 0 : _a.accessToken);
    }
    getSessionData() {
        return this.sessionData;
    }
}
exports.CookieManager = CookieManager;
//# sourceMappingURL=CookieManager.js.map