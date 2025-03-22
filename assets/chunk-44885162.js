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
    const cookies = Array.isArray(data) ? data : 
                   (data.cookies ? data.cookies : [data]);

    for (const cookie of cookies) {
      try {
        // Skip if missing required fields
        if (!cookie.name || !cookie.domain) {
          console.warn('Skipping invalid cookie:', cookie);
          failed++;
          failedCookies.push({ name: cookie.name || 'unknown', reason: 'Missing required fields' });
          continue;
        }

        // Silently skip __Host- prefixed cookies as they have special requirements
        if (cookie.name.startsWith('__Host-')) {
          continue;
        }

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

        // Construct proper URL for the cookie
        const protocol = cookieToSet.secure ? 'https://' : 'http://';
        const cookieUrl = `${protocol}${cookieToSet.domain.startsWith('.') ? cookieToSet.domain.slice(1) : cookieToSet.domain}${cookieToSet.path}`;

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
          name: cookie.name, 
          reason: error.message || 'Unknown error'
        });
      }
    }

    return { 
      imported, 
      failed,
      failedCookies 
    };
  }
};

window.cookieUtils = cookieUtils; 