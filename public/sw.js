// A network-first, then cache service worker.
// It caches successful network requests, so the app can work offline on subsequent visits.

const CACHE_NAME = 'project-hub-cache-v1';

self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Don't cache Firestore requests. Let Firestore's own offline persistence handle it.
  if (event.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // 1. Try to fetch from the network
        const networkResponse = await fetch(event.request);
        
        // If the fetch is successful, cache the response and return it
        if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // 2. If the network fails, try to get it from the cache
        console.log('Network request failed, trying cache for:', event.request.url);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // If a navigation request fails and isn't in cache, it will show the browser's default offline page.
        console.warn(`Cache miss for offline request: ${event.request.url}`);
        return new Response(null, { status: 404 });
      }
    })
  );
});

// Clean up old caches on activation to ensure the user gets the latest version.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Immediately take control of the page on activation.
  event.waitUntil(self.clients.claim());
});
