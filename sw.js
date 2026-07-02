// Trading Journal – Service Worker v6
const CACHE = 'tj-v6';

// Telepítéskor azonnal átveszi az irányítást — nem vár semmilyen pre-cache-re
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Supabase API: mindig hálózatról
  if (url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // index.html és sw.js: mindig hálózatról (soha ne legyen elavult verzió)
  if (url.endsWith('/') || url.endsWith('/index.html') || url.endsWith('/sw.js')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const cloned = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, cloned));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // CDN assets (React, Babel, stb.): cache-first, hosszú élettartam
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const cloned = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, cloned));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
