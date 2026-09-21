const CACHE='bnc-invoice-v18';
const PDF_LIB_URL='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const CORE=['./','./index.html','./css/app.css','./js/app.js','./manifest.webmanifest','./icons/icon.svg','../invoice.pdf'];
const FALLBACK_URL=new URL('./index.html',self.registration.scope).href;
const EXTERNAL=[PDF_LIB_URL,PDFJS_URL,PDFJS_WORKER_URL];

async function cacheResponse(request,response){
  if(!response||!response.ok)return response;
  try{const c=await caches.open(CACHE);await c.put(request,response.clone())}catch(e){}
  return response;
}
async function networkFirst(request){
  try{return await cacheResponse(request,await fetch(request))}
  catch(e){return caches.match(request).then(r=>r||caches.match('./index.html').then(r=>r||caches.match(FALLBACK_URL)))}
}
async function staleWhileRevalidate(request){
  const cached=await caches.match(request);
  const network=fetch(request).then(r=>cacheResponse(request,r)).catch(()=>null);
  if(cached){self.registration.active&&self.registration.active.postMessage({type:'asset-refresh'});return cached}
  return (await network)||caches.match(request)||caches.match(FALLBACK_URL);
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(CORE);
    for(const u of EXTERNAL){try{await c.add(u)}catch(e){}}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  const same=u.origin===self.location.origin;
  const external=EXTERNAL.includes(u.href);
  if(!same&&!external)return;

  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
