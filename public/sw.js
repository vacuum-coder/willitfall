// Offline after the first visit: the app shell, code and earthquake records are served from the cache,
// and refreshed from the network in the background. Nothing is sent anywhere.
const CACHE = 'furniture-quake-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // ignoreVary: module scripts are requested with an Origin header, the precached copies were fetched without it.
      const cached = await cache.match(e.request, { ignoreSearch: url.pathname === '/', ignoreVary: true });
      const fresh = fetch(e.request).then((res) => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      });
      if (cached) { fresh.catch(() => undefined); return cached; }
      return fresh;
    }),
  );
});

// The first visit loads its code before this worker controls the page: the page sends the list to keep.
self.addEventListener('message', (e) => {
  const urls = (e.data && e.data.cache) || [];
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.add(u).catch(() => undefined)))));
});
