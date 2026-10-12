// What this does: Caches the main BNC project files for more reliable repeat visits and offline access where supported.

self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  await caches.delete("bnc-public-v3");
  await self.clients.claim();
  await self.registration.unregister();
})()));
self.addEventListener("fetch",event=>{if(event.request.method==="GET")event.respondWith(fetch(event.request));});
