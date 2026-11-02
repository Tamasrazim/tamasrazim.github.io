// What this does: Caches the TRILYVA renderer and enforces the scheduled maintenance window for open renderer tabs.

const CACHE = 'tamasrazim-trilyva-pwa-v155';
const MAINTENANCE_ENDS_AT = Date.parse('2026-11-05T05:28:00+06:00');
const CORE = [
  './',
  './index.html',
  '/assets/brand/trilyva/T.svg',
  './media-stack.js',
  './movie-finalizer.js',
  './firebase-analytics.js',
  './manifest.webmanifest',
  './library/library.js',
  './library/dot-mesh-library.js',
  './library/manifest.json',
  './library/prismflower.js',
  './library/photorealistic-rose.js',
  './library/living-emojis.js',
  './library/motion-backgrounds.js',
  './library/green-screen-overlays.js',
  './library/prism-data.js',
  './library/prism-library.json',
  './library/prism-web-icons.json',
  './library/xyz-001-abyssal-tide.js',
  './library/xyz-library.js'
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
      .then(function () {
        if (Date.now() >= MAINTENANCE_ENDS_AT) return;
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(function (clients) {
            var navigations = clients.map(function (client) {
              var url = new URL(client.url);
              if (url.origin !== self.location.origin ||
                  url.pathname.indexOf('/projects/code-motion/renderer/') !== 0) {
                return Promise.resolve();
              }
              var returnPath = url.pathname + url.search + url.hash;
              var destination = '/maintenance/?from=' + encodeURIComponent(returnPath);
              return client.navigate(destination).catch(function () {});
            });
            return Promise.all(navigations);
          });
      })
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
