// What this does: Caches the standalone renderer's files so the interface can reopen more reliably when the network is unavailable.

const CACHE='tamasrazim-renderer-retired-v1';

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  // Retired renderer service worker: let normal network navigation handle the redirect page.
});
