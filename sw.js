const CACHE_NAME = 'x1-pwa-v3';
const CACHE_NAME = 'x1-pwa-v4';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

// 1. Install & langsung simpan index.html ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching core app assets...');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Aktifkan & bersihkan cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Tangani permintaan (Offline-First Strategy)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Abaikan request API/database eksternal (Firebase & Supabase)
  if (url.hostname.includes('firebase') || url.hostname.includes('supabase') || url.hostname.includes('googleapis')) {
    return;
  }

  // Khusus untuk navigasi halaman (Refresh / Buka Link)
  if (req.mode === 'navigate' || req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => {
        // Jika offline/jaringan gagal, panggil index.html dari Cache!
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Untuk aset statis lainnya
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});
