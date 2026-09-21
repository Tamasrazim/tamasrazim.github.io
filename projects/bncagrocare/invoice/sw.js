const CACHE='bnc-invoice-v19';
const XLSX_URL='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
const EXACTSHEET_URL='https://raw.githubusercontent.com/Tamasrazim/bncagrocare/main/exactsheet.xlsx';
const CORE=['./','./index.html','./css/app.css','./js/app.js','./manifest.webmanifest','./icons/icon.svg'];
const EXTERNAL=[XLSX_URL,EXACTSHEET_URL];
const FALLBACK_URL=new URL('./index.html',self.registration.scope).href;
async function cacheResponse(request,response){if(!response||!response.ok)return response;try{const c=await caches.open(CACHE);await c.put(request,response.clone())}catch(e){}return response}
async function networkFirst(request){try{return await cacheResponse(request,await fetch(request))}catch(e){return caches.match(request).then(r=>r||caches.match(FALLBACK_URL))}}
async function staleWhileRevalidate(request){const cached=await caches.match(request);const network=fetch(request).then(r=>cacheResponse(request,r)).catch(()=>null);if(cached){network.catch(()=>{});return cached}return(await network)||caches.match(request)||Response.error()}
self.addEventListener('install',event=>{event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);for(const u of EXTERNAL){try{await c.add(u)}catch(e){}}await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url),same=u.origin===self.location.origin,external=EXTERNAL.includes(u.href);if(!same&&!external)return;if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request));return}event.respondWith(staleWhileRevalidate(event.request))});
