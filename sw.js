/*
  KAIRA Service Worker — basic offline shell + runtime caching
*/
const VERSION = 'v1.0.1';
const CACHE_NAME = `kaira-cache-${VERSION}`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  // styles (best-effort; ignored if missing)
  '/css/main.css',
  '/css/intro.css',
  '/css/kaira-debug-overrides.css',
  // critical modules
  '/js/main-controller.js',
  '/js/code-lab.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS.filter(Boolean))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for all same-origin GET requests (fresh by default),
// fallback to cache for offline resiliency.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return; // ignore external requests

  // For API calls from same origin, prefer network (fresh) with fallback to cache
  const isApi = url.pathname.startsWith('/api/');
  if (isApi) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // For all other same-origin GET requests, network-first
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Update cache in background (best-effort)
      try {
        const copy = fresh.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, copy);
      } catch(_){}
      return fresh;
    } catch(_) {
      // Offline: try cache
      const cached = await caches.match(req);
      if (cached) return cached;
      // As a last resort, return a generic Response
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
