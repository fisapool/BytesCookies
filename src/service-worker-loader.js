// Service worker for FISABytes
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.resolve()
      .then(() => self.skipWaiting())
      .catch(error => console.error('Install error:', error))
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    Promise.resolve()
      .then(() => self.clients.claim())
      .catch(error => console.error('Activation error:', error))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        const request = event.request;
        // Try to fetch the resource
        const response = await fetch(request);
        
        // If successful, return the response
        if (response.ok) {
          return response;
        }
        
        // If the response wasn't ok, throw an error
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        console.error('Fetch error:', error);
        // Return a basic response if fetch fails
        return new Response('Network error occurred', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});
