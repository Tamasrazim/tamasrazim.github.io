const CACHE = 'tamasrazim-trilyva-pwa-v45';
const CORE = [
  './',
  './index.html',
  './media-stack.js',
  './manifest.webmanifest',
  './library/library.js',
  './library/manifest.json',
  './library/prismflower.js',
  './library/photorealistic-rose.js',
  './library/living-emojis.js',
  './library/motion-backgrounds.js',
  './library/prism-data.js',
  './library/prism-web-icons.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(function (cached) {
        return cached || fetch(event.request)
          .then(function (response) {
            var copy = response.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(event.request, copy);
            });
            return response;
          })
          .catch(function () { return cached; });
      })
  );
});
