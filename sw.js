const CACHE = 'qoolighten-v2';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Google Fonts — network with cache fallback
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch { return cached || new Response('', { status: 408 }); }
      })
    );
    return;
  }

  // App shell — cache first, fallback to network
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok && req.method === 'GET') cache.put(req, res.clone());
        return res;
      } catch {
        // Offline fallback
        const fallback = await cache.match('./index.html');
        return fallback || new Response('Offline', { status: 503 });
      }
    })
  );
});
