self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  await caches.delete("spiral-mic-v2");
  await self.clients.claim();
  await self.registration.unregister();
})()));
self.addEventListener("fetch",event=>{if(event.request.method==="GET")event.respondWith(fetch(event.request));});
