const CACHE_NAME = 'x1-pwa-v2';
const assetsToCache = [
  './',
  './index.html'
];

// 1. Install Service Worker & Cache file utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Bersihkan cache lama saat ada pembaruan
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

// 3. Tangani Fetch & Refresh (Supaya tidak error saat offline)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Abaikan request ke database online (Firebase & Supabase)
  if (url.hostname.includes('firebase') || url.hostname.includes('supabase') || url.hostname.includes('googleapis')) {
    return;
  }

  // Khusus untuk navigasi/refresh halaman
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Untuk aset lain (CSS/ikon/gambar)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});