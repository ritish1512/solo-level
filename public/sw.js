const CACHE_NAME = 'solo-leveling-cache-v2'
const APP_SHELL = [
  '/',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.webmanifest',
  '/dashboard',
  '/dashboard/habits',
  '/dashboard/tasks',
  '/dashboard/projects',
  '/dashboard/notes',
  '/dashboard/college',
  '/dashboard/finance',
  '/login',
  '/register'
]

const CACHEABLE_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2']

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return caches.match('/')
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match('/')
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)

  return cached || networkFetch
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cache) => {
      if (cache !== CACHE_NAME) return caches.delete(cache)
      return null
    }))).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.includes('webpack') || url.pathname.includes('hot-update') || url.pathname.startsWith('/_next/data')) {
    event.respondWith(fetch(request))
    return
  }

  const isNavigationRequest = request.mode === 'navigate' || request.destination === 'document'
  const isStaticAsset = url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/fonts') || CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
  const isAppPage = url.pathname === '/' || url.pathname.startsWith('/dashboard') || url.pathname === '/login' || url.pathname === '/register'

  if (isNavigationRequest) {
    event.respondWith(networkFirst(request))
    return
  }

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  if (isAppPage) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})
