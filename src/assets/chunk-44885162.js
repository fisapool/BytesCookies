// Cookie handling utilities
const cookieUtils = {
  async exportCookies(tab) {
    const cookies = await chrome.cookies.getAll({ url: tab.url });
    return {
      url: tab.url,
      cookies: cookies
    };
  },

  async importCookies(data, tab) {
    let imported = 0;
    let failed = 0;
    let failedCookies = [];

    // Handle both wrapped and unwrapped cookie formats
    const cookies = Array.isArray(data) ? data : (data.cookies ? data.cookies : [data]);

    for (const cookie of cookies) {
      try {
        // Validate required fields
        if (!this.isValidCookie(cookie)) {
          console.warn('Skipping invalid cookie:', {
            name: cookie.name || 'unknown',
            domain: cookie.domain || 'unknown'
          });
          failed++;
          failedCookies.push({ name: cookie.name || 'unknown', reason: 'Missing required fields' });
          continue;
        }

        // Silently skip __Host- prefixed cookies as they have special requirements
        if (cookie.name.startsWith('__Host-')) {
          console.warn('Skipping __Host- cookie:', cookie.name);
          continue;
        }

        const cookieToSet = this.prepareCookie(cookie);

        // Construct proper URL for the cookie
        const cookieUrl = this.constructCookieUrl(cookieToSet);

        await chrome.cookies.set({
          url: cookieUrl,
          ...cookieToSet
        });

        console.log('Successfully imported cookie:', cookieToSet.name);
        imported++;
      } catch (error) {
        console.error('Failed to set cookie:', cookie.name, error);
        failed++;
        failedCookies.push({ 
          name: cookie.name || 'unknown', 
          reason: error.message || 'Unknown error'
        });
      }
    }

    return { 
      imported, 
      failed,
      failedCookies 
    };
  },

  isValidCookie(cookie) {
    return cookie.name && cookie.domain;
  },

  prepareCookie(cookie) {
    const cookieToSet = { ...cookie };

    // Clean up cookie data
    delete cookieToSet.hostOnly;
    delete cookieToSet.session;
    delete cookieToSet.storeId;

    // Ensure valid path
    cookieToSet.path = cookieToSet.path || '/';

    // Handle secure property
    cookieToSet.secure = Boolean(cookieToSet.secure);

    // Handle expiration
    if (cookieToSet.expirationDate) {
      const expiryDate = new Date(
        typeof cookieToSet.expirationDate === 'number' 
          ? cookieToSet.expirationDate * 1000 
          : cookieToSet.expirationDate
      );

      if (expiryDate > new Date()) {
        cookieToSet.expirationDate = Math.floor(expiryDate.getTime() / 1000);
      } else {
        delete cookieToSet.expirationDate;
      }
    }

    return cookieToSet;
  },

  constructCookieUrl(cookie) {
    const protocol = cookie.secure ? 'https://' : 'http://';
    const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    return `${protocol}${domain}${cookie.path}`;
  }
};

window.cookieUtils = cookieUtils;
