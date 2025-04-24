import { vi } from 'vitest'

type Cookie = chrome.cookies.Cookie;
type StorageData = { [key: string]: any };

export const mockCookies = {
  getAll: vi.fn(),
  set: vi.fn(),
  remove: vi.fn()
};

export const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn()
  }
};

export const mockChrome = {
  cookies: mockCookies,
  storage: mockStorage,
  runtime: {
    lastError: null
  }
};

// Reset all mocks before each test
export function resetChromeMocks() {
  mockCookies.getAll.mockReset();
  mockCookies.set.mockReset();
  mockCookies.remove.mockReset();
  mockStorage.local.get.mockReset();
  mockStorage.local.set.mockReset();
  
  // Set default implementations
  mockCookies.getAll.mockImplementation((details: { url: string }, callback?: (cookies: Cookie[]) => void) => {
    const cookies: Cookie[] = [];
    if (callback) {
      callback(cookies);
    }
    return Promise.resolve(cookies);
  });

  mockCookies.set.mockImplementation((details: chrome.cookies.SetDetails, callback?: (cookie: Cookie | null) => void) => {
    const cookie: Cookie = {
      name: details.name,
      value: details.value,
      domain: new URL(details.url).hostname,
      path: '/',
      secure: details.secure || false,
      httpOnly: details.httpOnly || false,
      sameSite: details.sameSite || 'no_restriction',
      expirationDate: details.expirationDate,
      storeId: details.storeId
    };
    if (callback) {
      callback(cookie);
    }
    return Promise.resolve(cookie);
  });

  mockCookies.remove.mockImplementation((details: { url: string; name: string; storeId?: string }, callback?: () => void) => {
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  mockStorage.local.get.mockImplementation((key: string, callback?: (result: StorageData) => void) => {
    const result = {};
    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  });

  mockStorage.local.set.mockImplementation((items: StorageData, callback?: () => void) => {
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });
}

// Make chrome global
global.chrome = mockChrome as any; 