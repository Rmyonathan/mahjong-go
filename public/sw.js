/* Jade Mahjong service worker — static + tile cache; APIs always network. */
/* EDIT HERE — bump CACHE_VERSION after major static asset changes. */
const CACHE_VERSION = "jade-pwa-v1"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const TILE_CACHE = `${CACHE_VERSION}-tiles`

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/jade.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== TILE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache API / auth / live data.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request))
    return
  }

  // Tile faces: cache-first for fast mobile loads.
  if (url.pathname.startsWith("/tiles/")) {
    event.respondWith(cacheFirst(request, TILE_CACHE))
    return
  }

  // App shell + icons + manifest: stale-while-revalidate.
  if (
    url.pathname === "/" ||
    url.pathname === "/dashboard" ||
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/jade.png" ||
    url.pathname === "/sw.js"
  ) {
    if (url.pathname === "/sw.js") {
      event.respondWith(fetch(request))
      return
    }
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
  }
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)
  return cached || networkPromise
}
