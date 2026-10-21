const CACHE_NAME = 'x1-pwa-v5';
const STATIC_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// --- INSTALL ---
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
    ))
  );
  self.clients.claim();
});

// --- FETCH STRATEGY ---
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. FIREBASE - biarin lewat, Firestore offline di-handle IndexedDB
  if (url.hostname.includes('firestore') || url.hostname.includes('firebase')) {
    return;
  }

  // 2. SUPABASE STORAGE (cover & pdf) -> CACHE FIRST, ini kuncinya!
  // Contoh: xxx.supabase.co/storage/v1/object/public/covers/...
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 3. SUPABASE REST API (data bukunya) -> NETWORK FIRST, fallback ke cache kalau ada
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // 4. Navigasi halaman
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 5. CDN lain (tailwind, icons, pdfjs)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, res.clone());
          return res;
        });
      }).catch(() => cached);
    })
  );
});
