// Service Worker for Focus App

const CACHE_NAME = 'focus-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/focus.png',
  '/focus-icon.png',
  '/dark-paper.png',
  '/white-paper.png',
  '/manifest.json',
  '/fonts/Vazirmatn-Regular.woff2',
  '/fonts/Vazirmatn-Bold.woff2',
  '/sounds/key-new-01.mp3',
  '/sounds/key-new-02.mp3',
  '/sounds/key-new-03.mp3',
  '/sounds/key-new-04.mp3',
  '/sounds/key-new-05.mp3',
  '/sounds/space-new.mp3',
  '/sounds/backspace.mp3',
  '/sounds/return-new.mp3',
  '/sounds/scrollUp.mp3',
  '/sounds/scrollDown.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request to prevent consuming it
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to store in cache and return it
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return a fallback page if offline and page not in cache
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
}); 