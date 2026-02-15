// A simple service worker for basic PWA functionality (e.g., making it installable).

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
});

self.addEventListener('fetch', (event) => {
  // We are not doing any caching here, just fulfilling the requirement
  // of having a fetch handler for PWA installability.
  event.respondWith(fetch(event.request));
});
