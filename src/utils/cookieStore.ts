/// <reference types="chrome"/>

interface RemoveCookieDetails {
  url: string;
  name: string;
  storeId?: string;
}

export class CookieStore {
  async getAll(url: string): Promise<chrome.cookies.Cookie[]> {
    return new Promise((resolve, reject) => {
      chrome.cookies.getAll({ url }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(cookies);
        }
      });
    });
  }

  async set(details: chrome.cookies.SetDetails): Promise<chrome.cookies.Cookie> {
    return new Promise((resolve, reject) => {
      chrome.cookies.set(details, (cookie) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!cookie) {
          reject(new Error('Failed to set cookie: No cookie returned'));
        } else {
          resolve(cookie);
        }
      });
    });
  }

  async remove(details: RemoveCookieDetails): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.cookies.remove(details, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }
} 