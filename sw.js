const CACHE_NAME = 'x1-pwa-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

// 1. Install: Hanya cache file inti lokal agar aman dari error CORS
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Aktifkan & bersihkan cache versi lama
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

// 3. Fetch: Tangani offline dengan mulus untuk semua aset & halaman
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Jangan cache request langsung ke API database (Firebase & Supabase)
  if (url.hostname.includes('firebase') || url.hostname.includes('supabase') || url.hostname.includes('googleapis')) {
    return;
  }

  // Khusus untuk navigasi halaman / refresh
  if (req.mode === 'navigate' || req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('./index.html') || caches.match('/');
      })
    );
    return;
  }

  // Untuk ikon, font, dan gambar (simpan otomatis saat online, ambil saat offline)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }
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
