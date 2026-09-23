const CACHE = 'tamasrazim-code-motion-pwa-v2';
const CORE = [
  './renderer.html',
  './media-stack.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/projects/code-motion/')) return;

  const isApp =
    url.pathname.endsWith('/renderer.html') ||
    url.pathname.endsWith('/media-stack.js') ||
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/icons/icon.svg');

  if (!isApp) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});