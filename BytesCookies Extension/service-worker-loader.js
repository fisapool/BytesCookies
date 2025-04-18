// Service worker for BytesCookies
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_REFRESH_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const JITTER_FACTOR = 0.1; // 10% jitter
const API_BASE_URL = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://monkfish-app-z75ty.ondigitalocean.app'; // Production URL
const API_HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

// Enhanced session state management
const sessionState = {
  isRefreshing: false,
  lastRefreshAttempt: 0,
  refreshRetryCount: 0,
  refreshTimer: null,
  isOnline: true,
  pendingRequests: new Set()
};

// CORS headers for API requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Expose-Headers': 'Content-Range, X-Content-Range',
  'Access-Control-Max-Age': '86400'
};

// Add server status tracking
const serverStatus = {
  isRunning: false,
  lastCheck: null,
  consecutiveFailures: 0,
  MAX_CONSECUTIVE_FAILURES: 3
};

// Calculate retry delay with exponential backoff and jitter
function calculateRetryDelay(attempt) {
  const exponentialDelay = Math.min(
    BASE_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  const jitter = exponentialDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.max(exponentialDelay + jitter, BASE_RETRY_DELAY);
}

// Enhanced refresh session with better error handling and state management
async function refreshSession() {
  if (sessionState.isRefreshing) {
    console.log('Refresh already in progress, skipping...');
    return false;
  }

  try {
    sessionState.isRefreshing = true;
    sessionState.lastRefreshAttempt = Date.now();

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    await chrome.storage.local.set({ 
      session: data,
      lastRefresh: Date.now()
    });

    sessionState.refreshRetryCount = 0;
    sessionState.isRefreshing = false;
    
    // Notify all clients about successful refresh
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SESSION_REFRESHED',
        timestamp: Date.now()
      });
    });

    return true;
  } catch (error) {
    console.error('Session refresh failed:', error);
    sessionState.isRefreshing = false;
    
    if (sessionState.refreshRetryCount < MAX_REFRESH_RETRIES) {
      sessionState.refreshRetryCount++;
      const delay = calculateRetryDelay(sessionState.refreshRetryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return refreshSession();
    }
    
    sessionState.refreshRetryCount = 0;
    
    // Notify clients about refresh failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SESSION_REFRESH_FAILED',
        error: error.message,
        timestamp: Date.now()
      });
    });

    return false;
  }
}

// Enhanced fetch with improved retry logic and error handling
async function fetchWithRetry(request, maxRetries = 3) {
  let lastError;
  let attempt = 0;
  
  // Check network connectivity first
  if (!navigator.onLine) {
    throw new Error('Network is offline');
  }

  // Validate request URL
  try {
    new URL(request.url);
  } catch (e) {
    throw new Error('Invalid request URL');
  }
  
  while (attempt < maxRetries) {
    try {
      const clonedRequest = request.clone();
      
      // Log request details for debugging
      console.debug(`Fetch attempt ${attempt + 1}:`, {
        url: clonedRequest.url,
        method: clonedRequest.method,
        headers: Object.fromEntries(clonedRequest.headers.entries())
      });

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(clonedRequest, {
          signal: controller.signal,
          credentials: 'include', // Always include credentials
          mode: 'cors', // Explicitly set CORS mode
          headers: {
            ...Object.fromEntries(clonedRequest.headers.entries()),
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return response;
        }
        
        // Handle specific status codes
        if (response.status === 401) {
          const refreshSuccess = await refreshSession();
          if (refreshSuccess) {
            // Retry with new session
            const newRequest = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: request.body,
              credentials: 'include',
              mode: 'cors'
            });
            return fetch(newRequest);
          }
        }
        
        // Don't retry on client errors (4xx) except 401
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error;
      console.error(`Fetch attempt ${attempt + 1} failed:`, {
        error,
        url: request.url,
        method: request.method,
        attempt: attempt + 1,
        maxRetries
      });
      
      // Don't retry on certain errors
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        if (!navigator.onLine) {
          throw new Error('Network is offline');
        }
        // Check for CORS issues
        if (request.mode === 'cors' && !request.url.startsWith(API_BASE_URL)) {
          throw new Error('CORS error: Request blocked by CORS policy');
        }
      }
      
      if (attempt < maxRetries - 1) {
        const delay = calculateRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    attempt++;
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Enhanced refresh timer with better state management
function startRefreshTimer() {
  if (sessionState.refreshTimer) {
    clearInterval(sessionState.refreshTimer);
  }
  
  sessionState.refreshTimer = setInterval(async () => {
    const success = await refreshSession();
    if (!success) {
      clearInterval(sessionState.refreshTimer);
      sessionState.refreshTimer = null;
      
      // Notify all clients about session expiration
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ 
          type: 'SESSION_EXPIRED',
          timestamp: Date.now()
        });
      });
    }
  }, REFRESH_INTERVAL);
}

// Enhanced network status handling
self.addEventListener('online', () => {
  sessionState.isOnline = true;
  // Retry pending requests
  sessionState.pendingRequests.forEach(request => {
    fetchWithRetry(request)
      .then(response => {
        const client = request.client;
        if (client) {
          client.postMessage({ 
            type: 'REQUEST_RETRIED', 
            success: true,
            timestamp: Date.now()
          });
        }
      })
      .catch(error => {
        console.error('Retry failed:', error);
        const client = request.client;
        if (client) {
          client.postMessage({ 
            type: 'REQUEST_RETRIED', 
            success: false, 
            error: error.message,
            timestamp: Date.now()
          });
        }
      });
  });
  sessionState.pendingRequests.clear();
});

self.addEventListener('offline', () => {
  sessionState.isOnline = false;
});

// Add test function for API connectivity
async function testApiConnectivity() {
  const testUrl = `${API_BASE_URL}/health`;
  
  // Pre-flight network validation
  try {
    const url = new URL(testUrl);
    console.debug('URL validation successful:', {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
      path: url.pathname
    });
  } catch (urlError) {
    console.error('Invalid API URL:', {
      error: urlError.message,
      attemptedUrl: testUrl
    });
    return false;
  }

  // Check if we're online
  if (!navigator.onLine) {
    console.error('Network is offline');
    return false;
  }

  console.log('Testing API connectivity...', {
    url: testUrl,
    timestamp: new Date().toISOString(),
    environment: API_BASE_URL.includes('localhost') ? 'development' : 'production',
    networkStatus: {
      online: navigator.onLine,
      connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
      rtt: navigator.connection ? navigator.connection.rtt : 'unknown'
    }
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_HEALTH_CHECK_TIMEOUT);

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API health check failed with status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    serverStatus.isRunning = true;
    serverStatus.consecutiveFailures = 0;
    serverStatus.lastCheck = Date.now();
    
    console.log('API connectivity test successful:', {
      data,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    // Update server status
    serverStatus.consecutiveFailures++;
    serverStatus.lastCheck = Date.now();
    
    const errorDetails = {
      name: fetchError.name,
      message: fetchError.message,
      url: testUrl,
      timestamp: new Date().toISOString(),
      environment: API_BASE_URL.includes('localhost') ? 'development' : 'production',
      serverStatus: {
        isRunning: serverStatus.isRunning,
        consecutiveFailures: serverStatus.consecutiveFailures,
        lastCheck: serverStatus.lastCheck
      }
    };

    if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
      errorDetails.type = 'server_not_running';
      errorDetails.suggestions = [
        'Start the API server',
        'Verify the server is configured to listen on port 3000',
        'Check if the server process is running',
        'Ensure no firewall is blocking the connection'
      ];
      
      // Notify all clients about server status
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SERVER_STATUS',
          status: 'offline',
          details: {
            message: 'API server is not running',
            timestamp: Date.now(),
            suggestions: errorDetails.suggestions
          }
        });
      });
    }

    console.error('API connectivity test failed:', errorDetails);
    return false;
  }
}

// Add to service worker initialization
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      testApiConnectivity().then(isConnected => {
        if (!isConnected) {
          console.warn('Initial API connectivity check failed - service may be degraded');
        }
      })
    ]).catch(error => console.error('Install error:', error))
  );
});

// Add periodic connectivity check with exponential backoff
let connectivityCheckInterval = 5 * 60 * 1000; // Start with 5 minutes
const MAX_CHECK_INTERVAL = 30 * 60 * 1000; // Max 30 minutes

async function scheduleConnectivityCheck() {
  const isConnected = await testApiConnectivity();
  sessionState.isOnline = isConnected;
  
  if (!isConnected) {
    console.warn('API connectivity check failed - service may be degraded');
    // Increase check interval with exponential backoff
    connectivityCheckInterval = Math.min(connectivityCheckInterval * 1.5, MAX_CHECK_INTERVAL);
  } else {
    // Reset to default interval on success
    connectivityCheckInterval = 5 * 60 * 1000;
  }
  
  setTimeout(scheduleConnectivityCheck, connectivityCheckInterval);
}

// Start the connectivity check cycle
scheduleConnectivityCheck();

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.resolve()
      .then(() => self.clients.claim())
      .catch(error => console.error('Activation error:', error))
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'START_SESSION_REFRESH') {
    startRefreshTimer();
  } else if (event.data.type === 'STOP_SESSION_REFRESH') {
    if (sessionState.refreshTimer) {
      clearInterval(sessionState.refreshTimer);
      sessionState.refreshTimer = null;
    }
  }
});

// Handle OPTIONS requests for CORS
function handleOptionsRequest(request) {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        const request = event.request;
        
        // Handle OPTIONS requests for CORS
        if (request.method === 'OPTIONS') {
          return handleOptionsRequest(request);
        }
        
        // Check if it's an API request
        if (request.url.includes('/api/')) {
          // Store request for retry if offline
          if (!sessionState.isOnline) {
            sessionState.pendingRequests.add(request);
            throw new Error('Network is offline');
          }
          
          // Check if session needs refresh
          if (!request.url.includes('/api/auth/refresh')) {
            const { session } = await chrome.storage.local.get('session');
            if (session) {
              const timeUntilExpiry = session.expiresAt - Date.now();
              if (timeUntilExpiry < 2 * 60 * 1000) { // Less than 2 minutes until expiry
                const refreshSuccess = await refreshSession();
                if (!refreshSuccess) {
                  throw new Error('Session refresh failed');
                }
              }
            }
          }
          
          try {
            // Use enhanced fetch with retry
            const response = await fetchWithRetry(request);
            
            // Add CORS headers to API responses
            const headers = new Headers(response.headers);
            Object.entries(CORS_HEADERS).forEach(([key, value]) => {
              headers.set(key, value);
            });
            
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers
            });
          } catch (fetchError) {
            // Handle specific fetch errors
            const errorResponse = {
              error: fetchError.message,
              code: fetchError.name === 'TypeError' ? 'NETWORK_ERROR' : 'FETCH_ERROR',
              timestamp: Date.now(),
              details: {
                url: request.url,
                method: request.method,
                isOnline: sessionState.isOnline,
                retryCount: sessionState.refreshRetryCount,
                sessionState: {
                  isRefreshing: sessionState.isRefreshing,
                  lastRefreshAttempt: sessionState.lastRefreshAttempt,
                  refreshRetryCount: sessionState.refreshRetryCount
                },
                ...(fetchError.details || {})
              }
            };

            // Determine appropriate status code
            let statusCode = 500;
            if (fetchError.message === 'Network is offline') {
              statusCode = 503;
            } else if (fetchError.message === 'Session refresh failed') {
              statusCode = 401;
            } else if (fetchError.message.includes('CORS error')) {
              statusCode = 403;
            } else if (fetchError.message.includes('Invalid URL')) {
              statusCode = 400;
            } else if (fetchError.message.includes('Request timeout')) {
              statusCode = 504;
            } else if (fetchError.message.includes('HTTP error! status:')) {
              const statusMatch = fetchError.message.match(/status: (\d+)/);
              if (statusMatch) {
                statusCode = parseInt(statusMatch[1], 10);
              }
            }
            
            return new Response(JSON.stringify(errorResponse), {
              status: statusCode,
              headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS
              }
            });
          }
        }
        
        // For non-API requests, use regular fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        console.error('Fetch error:', error);
        
        // Enhanced error response with more context
        const errorResponse = {
          error: error.message,
          code: error.name === 'TypeError' ? 'NETWORK_ERROR' : 'FETCH_ERROR',
          timestamp: Date.now(),
          details: {
            url: event.request.url,
            method: event.request.method,
            isOnline: sessionState.isOnline,
            retryCount: sessionState.refreshRetryCount,
            sessionState: {
              isRefreshing: sessionState.isRefreshing,
              lastRefreshAttempt: sessionState.lastRefreshAttempt,
              refreshRetryCount: sessionState.refreshRetryCount
            }
          }
        };

        // Determine appropriate status code
        let statusCode = 500;
        if (error.message === 'Network is offline') {
          statusCode = 503;
        } else if (error.message === 'Session refresh failed') {
          statusCode = 401;
        } else if (error.message.includes('CORS error')) {
          statusCode = 403;
        } else if (error.message.includes('Invalid URL')) {
          statusCode = 400;
        } else if (error.message.includes('Request timeout')) {
          statusCode = 504;
        } else if (error.message.includes('HTTP error! status:')) {
          const statusMatch = error.message.match(/status: (\d+)/);
          if (statusMatch) {
            statusCode = parseInt(statusMatch[1], 10);
          }
        }
        
        return new Response(JSON.stringify(errorResponse), {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          }
        });
      }
    })()
  );
});
