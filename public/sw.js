const CACHE_NAME = 'solo-leveling-cache-v1';

// Caching only real, stable static assets on install (No dynamic code)
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install SW and cache immutable app shell assets
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

  // 1. STRICT SAFETY NET: Bypass absolutely everything except same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 2. CRITICAL DEVELOPMENT AND COMPILING BYPASS
  // Forces browser to fetch hot-reloads and dev chunks raw from network
  if (
    url.pathname.includes('/_next/webpack-hmr') || 
    url.pathname.includes('webpack') ||
    url.pathname.includes('hot-update') ||
    url.pathname.startsWith('/_next/data')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. STATIC ASSETS HANDLING (Images, Fonts, CSS, JS Bundles)
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
    // For local development, change this to Network First to stop caching loops.
    // This network-first strategy ensures dev updates show instantly while protecting production stability.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request)) // Fallback to cache ONLY if internet drops
    );
    return;
  }

  // 4. MAIN APP PAGES / ROUTING VIEWS (Network First, fallback to cache)
  const isAppPage = url.pathname.startsWith('/dashboard') || url.pathname === '/';
  if (isAppPage) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/'); // Return app core fallback layout if specific page missing
          });
        })
    );
    return;
  }

  // 5. DEFAULT BACKUP STRATEGY
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
