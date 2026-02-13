// public/sw.js
const CACHE_NAME = 'project-hub-cache-v1';

// On install, pre-cache some essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Pre-cache the root path. Other assets will be cached on the fly.
      return cache.addAll([
        '/',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// On activate, clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});


// Network-first caching strategy
self.addEventListener('fetch', event => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If the fetch is successful, cache the response and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If the fetch fails (offline), try to serve from cache
          return caches.match(event.request)
            .then(response => {
              // If we have a cached response, return it.
              return response;
            });
        })
    );
});
