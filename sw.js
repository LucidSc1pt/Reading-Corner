const CACHE_NAME = 'x1-pwa-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

// 1. Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Bersihkan cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Strategi Cache-First untuk Halaman (Mencegah Chrome menampilkan snapshot mati)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Abaikan database online
  if (url.hostname.includes('firebase') || url.hostname.includes('supabase') || url.hostname.includes('googleapis')) {
    return;
  }

  // Khusus untuk navigasi / refresh halaman
  if (req.mode === 'navigate' || req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      caches.match('./index.html').then((cachedResponse) => {
        // Langsung berikan cache index.html agar JavaScript aktif, jika tidak ada baru coba fetch jaringan
        return cachedResponse || fetch(req).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Untuk aset lain (gambar, ikon, dll)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      return cachedResponse || fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 404 });
      });
    })
  );
});
