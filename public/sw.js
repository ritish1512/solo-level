const CACHE_NAME = 'solo-leveling-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
];

// Install SW and cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch interception strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip POST, PUT, DELETE, and external API requests (e.g. Google auth)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip Next.js hot reload and dev server assets
  if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.includes('webpack')) {
    return;
  }

  // Caching strategy for main app pages (App Shell/Dashboard views) -> Network First, fallback to cache
  const isAppPage = url.pathname.startsWith('/dashboard') || url.pathname === '/';
  if (isAppPage) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response and save it to the cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback if cache is also empty (e.g. never loaded this page online)
            return caches.match('/');
          });
        })
    );
    return;
  }

  // Caching strategy for static files (Next.js bundles, CSS, JS, Fonts, Images) -> Cache First, fallback to network
  const isStaticAsset =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/fonts') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Default network-first strategy for everything else
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
