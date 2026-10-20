// Service Worker Sederhana untuk Pojok Baca X-1
const CACHE_NAME = 'x1-pwa-v1';
const assetsToCache = [
  './',
  './index.html'
];

// 1. Saat diinstal, simpan file utama ke cache browser
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Saat aktif, bersihkan cache lama jika ada pembaruan
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

// 3. Ambil data dari cache saat offline
self.addEventListener('fetch', (event) => {
  // Lewati request ke Firebase/Supabase agar tetap mengambil data terbaru secara online
  if (event.request.url.includes('firestore') || event.request.url.includes('supabase') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Fallback jika benar-benar offline dan file tidak ada di cache
        return caches.match('./index.html');
      });
    })
  );
});
