class CookieManager {
  constructor() {
    this.sessionData = null;
    this.API_BASE_URL = 'http://localhost:3000/api';
  }

  // Initialize session from storage
  async initializeSession() {
    try {
      const sessionData = await chrome.storage.local.get('sessionData');
      if (sessionData.sessionData) {
        this.sessionData = sessionData.sessionData;
        // Validate session
        if (this.isSessionValid()) {
          return;
        }
      }
      // Clear invalid session
      await this.clearSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      this.sessionData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        expiresAt: Date.now() + 3600000, // 1 hour
      };

      await this.saveSession();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.sessionData?.accessToken) {
        await fetch(`${this.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.sessionData.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      await this.clearSession();
    }
  }

  // Save session to storage
  async saveSession() {
    try {
      await chrome.storage.local.set({ sessionData: this.sessionData });
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  // Clear session from storage
  async clearSession() {
    try {
      await chrome.storage.local.remove('sessionData');
      this.sessionData = null;
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }

  // Check if session is valid
  isSessionValid() {
    if (!this.sessionData) return false;
    return Date.now() < this.sessionData.expiresAt;
  }

  // Get auth headers
  getAuthHeaders() {
    if (!this.sessionData?.accessToken) {
      throw new Error('No active session');
    }
    return {
      'Authorization': `Bearer ${this.sessionData.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Export cookies
  async exportCookies() {
    if (!this.isSessionValid()) {
      throw new Error('Session expired. Please login again.');
    }

    try {
      const cookies = await chrome.cookies.getAll({});
      const response = await fetch(`${this.API_BASE_URL}/cookies/export`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ cookies }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  // Import cookies
  async importCookies(cookieData) {
    if (!this.isSessionValid()) {
      throw new Error('Session expired. Please login again.');
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/cookies/import`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ cookies: cookieData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }
} 