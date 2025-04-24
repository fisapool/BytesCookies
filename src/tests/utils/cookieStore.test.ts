import { describe, it, expect, beforeEach } from 'vitest';
import { CookieStore } from '../../utils/cookieStore';
import { mockCookies, resetChromeMocks } from '../setup/chromeMock';

describe('Cookie Store', () => {
  let cookieStore: CookieStore;

  beforeEach(() => {
    resetChromeMocks();
    cookieStore = new CookieStore();
  });

  it('should get all cookies', async () => {
    const url = 'https://example.com';
    const mockCookieData = [
      { name: 'test1', value: 'value1', domain: 'example.com' },
      { name: 'test2', value: 'value2', domain: 'example.com' }
    ];

    mockCookies.getAll.mockImplementation((details, callback) => {
      if (callback) {
        callback(mockCookieData);
      }
      return Promise.resolve(mockCookieData);
    });

    const result = await cookieStore.getAll(url);
    expect(result).toEqual(mockCookieData);
    expect(mockCookies.getAll).toHaveBeenCalledWith({ url }, expect.any(Function));
  }, 10000);

  it('should set a cookie', async () => {
    const details = {
      url: 'https://example.com',
      name: 'test',
      value: 'value'
    };
    const mockCookie = { ...details, domain: 'example.com' };

    mockCookies.set.mockImplementation((cookieDetails, callback) => {
      if (callback) {
        callback(mockCookie);
      }
      return Promise.resolve(mockCookie);
    });

    const result = await cookieStore.set(details);
    expect(result).toEqual(mockCookie);
    expect(mockCookies.set).toHaveBeenCalledWith(details, expect.any(Function));
  }, 10000);

  it('should remove a cookie', async () => {
    const details = {
      url: 'https://example.com',
      name: 'test'
    };

    mockCookies.remove.mockImplementation((removeDetails, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    });

    await cookieStore.remove(details);
    expect(mockCookies.remove).toHaveBeenCalledWith(details, expect.any(Function));
  }, 10000);

  it('should handle errors when getting cookies', async () => {
    const url = 'https://example.com';
    const errorMessage = 'Failed to get cookies';
    
    mockCookies.getAll.mockImplementation((details, callback) => {
      if (callback) {
        callback([]);
      }
      return Promise.resolve([]);
    });
    
    (chrome.runtime as any).lastError = { message: errorMessage };

    await expect(cookieStore.getAll(url)).rejects.toThrow(errorMessage);
  }, 10000);

  it('should handle errors when setting cookies', async () => {
    const details = {
      url: 'https://example.com',
      name: 'test',
      value: 'value'
    };
    const errorMessage = 'Failed to set cookie';

    mockCookies.set.mockImplementation((cookieDetails, callback) => {
      if (callback) {
        callback(null);
      }
      return Promise.resolve(null);
    });
    
    (chrome.runtime as any).lastError = { message: errorMessage };

    await expect(cookieStore.set(details)).rejects.toThrow(errorMessage);
  }, 10000);

  it('should handle errors when removing cookies', async () => {
    const details = {
      url: 'https://example.com',
      name: 'test'
    };
    const errorMessage = 'Failed to remove cookie';

    mockCookies.remove.mockImplementation((removeDetails, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    });
    
    (chrome.runtime as any).lastError = { message: errorMessage };

    await expect(cookieStore.remove(details)).rejects.toThrow(errorMessage);
  }, 10000);
}); 