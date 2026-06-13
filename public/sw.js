// EP Mentor Service Worker — offline fallback + asset caching
const CACHE_NAME = "ep-mentor-v1";

// Assets to cache on install
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/favicon.svg",
];

// Install: precache shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Individual failures are non-fatal
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API requests
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Network-first for pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
