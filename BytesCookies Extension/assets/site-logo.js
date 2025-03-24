// Site Logo Finder
document.addEventListener('DOMContentLoaded', async () => {
  // Create UI elements for the logo
  const headerContainer = document.querySelector('.header');
  const logoContainer = document.createElement('div');
  logoContainer.className = 'site-logo-container';
  logoContainer.style.cssText = 'height: 48px; width: 48px; margin-right: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px;';
  
  const logoImage = document.createElement('img');
  logoImage.id = 'siteLogo';
  logoImage.alt = 'Site Logo';
  logoImage.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
  
  // Add loading state
  logoImage.src = 'img/logo-placeholder.png';
  logoContainer.appendChild(logoImage);
  
  // Insert logo container before the title container
  if (headerContainer.firstChild) {
    headerContainer.insertBefore(logoContainer, headerContainer.firstChild);
  } else {
    headerContainer.appendChild(logoContainer);
  }
  
  // Update the header flex layout
  headerContainer.style.display = 'flex';
  headerContainer.style.alignItems = 'center';
  
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      throw new Error('No active tab found');
    }
    
    // Find the logo
    const logoUrl = await findSiteLogo(tab);
    
    if (logoUrl) {
      logoImage.src = logoUrl;
      logoImage.onload = () => {
        logoImage.style.opacity = '1';
      };
      logoImage.onerror = () => {
        setFallbackLogo(logoImage, tab);
      };
    } else {
      setFallbackLogo(logoImage, tab);
    }
  } catch (error) {
    console.error('Error finding site logo:', error);
    setFallbackLogo(logoImage);
  }
});

// Function to find a website's logo
async function findSiteLogo(tab) {
  try {
    // Execute script in the active tab to find the logo using Manifest V3 API
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Method 1: Check for favicon link
        const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
        if (favicon) {
          return favicon.href;
        }
        
        // Method 2: Check meta tags (Open Graph and Twitter Card)
        const ogImage = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
        if (ogImage) {
          return ogImage.content;
        }
        
        // Method 3: Check application-name or apple-mobile-web-app-title
        const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appleMeta) {
          // Return null here, we'll use the title to generate a text-based logo
          return null;
        }
        
        // Method 4: Look for common logo elements
        const commonLogoSelectors = [
          '.logo img', 
          '.site-logo img', 
          'header img[alt*="logo"]',
          '#logo img',
          'img.logo',
          'a.navbar-brand img'
        ];
        
        for (const selector of commonLogoSelectors) {
          const logoEl = document.querySelector(selector);
          if (logoEl && logoEl.src) {
            return logoEl.src;
          }
        }
        
        // No logo found
        return null;
      }
    });
    
    return result || null;
    
  } catch (error) {
    console.error('Error executing script to find logo:', error);
    // Try fallback method using default favicon path
    return `${new URL(tab.url).origin}/favicon.ico`;
  }
}

// Function to set a fallback logo
function setFallbackLogo(logoImage, tab) {
  // If we have a tab, generate a colored initial logo based on domain
  if (tab && tab.url) {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      const initial = domain.charAt(0).toUpperCase();
      
      // Generate a deterministic color based on the domain
      const hue = getHashCode(domain) % 360;
      const color = `hsl(${hue}, 65%, 55%)`;
      
      // Create a canvas element to draw the initial
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 48, 48);
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, 24, 24);
      
      // Set the generated image as src
      logoImage.src = canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error creating fallback logo:', error);
      logoImage.src = 'img/logo-placeholder.png';
    }
  } else {
    // If no tab, use extension's default logo
    logoImage.src = 'img/logo-48.png';
  }
}

// Helper function to generate a hash code from a string
function getHashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
} 