// Retire the previous TRILYVA renderer service worker after the workspace folder move.
const LEGACY_CACHE = 'tamasrazim-trilyva-pwa-v162';
self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try { await caches.delete(LEGACY_CACHE); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
  })());
});
