const CACHE='tamasrazim-asset-vault-v2';
const CORE=['./','./index.html','./css/app.css','./js/app.js','./manifest.webmanifest','./icons/icon.svg'];
const FALLBACK_URL=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith('/asset-vault/'))return;

  event.respondWith(
    caches.match(event.request)
      .then(cached=>{
        if(cached)return cached;
        return fetch(event.request)
          .then(response=>{
            if(response.ok){
              const copy=response.clone();
              caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
            }
            return response;
          })
          .catch(()=>caches.match(FALLBACK_URL));
      })
  );
});
