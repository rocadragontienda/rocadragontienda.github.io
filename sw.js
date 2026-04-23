// RocaPuntos — Service Worker
const CACHE = 'rocapuntos-v2'
const SHELL = [
  '/rocapuntos',
  '/manifest.webmanifest',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  // Never intercept non-GET/HEAD (POST beacons, form submits, etc.)
  if (e.request.method !== 'GET' && e.request.method !== 'HEAD') return

  const url = new URL(e.request.url)

  // API calls: network-first, no caché
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'Sin conexión' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Assets con hash: cache-first (inmutable)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return res
        })
      })
    )
    return
  }

  // SPA shell: network-first con fallback a caché (solo GET)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match('/rocapuntos') || caches.match('/'))
  )
})
