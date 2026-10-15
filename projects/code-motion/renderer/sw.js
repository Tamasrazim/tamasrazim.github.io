// What this does: Caches the renderer's files so the Code Motion workspace can reopen more reliably when the network is unavailable.

const CACHE = 'tamasrazim-trilyva-pwa-v104';
const CORE = [
  './',
  './index.html',
  './media-stack.js',
  './voice-studio.js',
  './movie-finalizer.js',
  './niko-and-the-clockwork-bird.js',
  './the-last-star-train.js',
  '../../trilyva/niko-and-the-clockwork-bird.html',
  '../../trilyva/the-last-star-train.html',
  '../../trilyva/production/lumi-and-the-lost-firefly-elevenlabs-cues.json',
  '../../trilyva/production/lumi-and-the-lost-firefly.en.srt',
  './manifest.webmanifest',
  './library/library.js',
  './library/dot-mesh-library.js',
  './library/manifest.json',
  './library/prismflower.js',
  './library/photorealistic-rose.js',
  './library/living-emojis.js',
  './library/motion-backgrounds.js',
  './library/green-screen-overlays.js',
  './library/story-films.js',
  './library/prism-data.js',
  './library/prism-library.json',
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
