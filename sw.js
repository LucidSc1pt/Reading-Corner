const CACHE_NAME = 'x1-pwa-v6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Firebase Firestore / Auth - jangan di-cache SW, biar Firestore SDK yang handle via IndexedDB
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase') || url.hostname.includes('googleapis.com') && url.pathname.includes('google.firestore')) {
    return;
  }

  // 2. SUPABASE STORAGE (cover & PDF) -> INI KUNCINYA, harus di-cache
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const networkRes = await fetch(e.request);
          if (networkRes.ok) {
            cache.put(e.request, networkRes.clone());
          }
          return networkRes;
        } catch {
          // offline dan belum pernah di-cache
          return cached || new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // 3. Supabase REST API (kalau suatu saat kamu pindah data buku ke Supabase)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // 4. Navigasi
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }

  // 5. CDN lain (tailwind, phosphor, pdfjs, unsplash cover default)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // jangan cache response error
        if (!res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});