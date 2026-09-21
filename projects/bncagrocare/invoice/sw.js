const CACHE="bnc-invoice-v40";
const PDF_LIB="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
const CORE=["./","./index.html","./css/app.css","./js/app.js","./manifest.webmanifest","./icons/icon.svg","../invoice.pdf",PDF_LIB];
const FALLBACK=new URL("./index.html",self.registration.scope).href;

async function cachePut(request,response){if(response&&(response.ok||response.type==="opaque")){try{const c=await caches.open(CACHE);await c.put(request,response.clone())}catch{}}return response}
async function networkFirst(request){try{return await cachePut(request,await fetch(request))}catch{return (await caches.match(request))||caches.match(FALLBACK)}}
async function stale(request){const hit=await caches.match(request);const net=fetch(request).then(r=>cachePut(request,r)).catch(()=>null);return hit||await net||caches.match(request)}

self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);try{const r=await fetch(PDF_LIB,{mode:"no-cors",cache:"reload"});await c.put(PDF_LIB,r)}catch{}await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);const same=u.origin===self.location.origin,external=[PDF_LIB,PDF_RENDERER,PDF_WORKER].includes(u.href);if(!same&&!external)return;if(e.request.mode==="navigate")e.respondWith(networkFirst(e.request));else e.respondWith(stale(e.request))});
