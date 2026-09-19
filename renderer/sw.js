const CACHE='tamasrazim-renderer-v3';
const CORE=[
  './','./index.html','./css/app.css','./js/app.js','./manifest.webmanifest',
  './icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png',
  './icons/icon-192-maskable.png','./icons/icon-512-maskable.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith('/renderer/')) return;

  const isNavigation=event.request.mode==='navigate' || url.pathname.endsWith('/renderer/') || url.pathname.endsWith('/renderer/index.html');

  if(isNavigation){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached=>cached || fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }))
  );
});