const CACHE='bnc-invoice-v16';
const PDF_LIB_URL='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const CORE=['./','./index.html','./css/app.css','./js/app.js','./manifest.webmanifest','./icons/icon.svg','../invoice.pdf'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);for(const u of [PDF_LIB_URL,PDFJS_URL,PDFJS_WORKER_URL]){try{await c.add(u)}catch(e){}}await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);const same=u.origin===self.location.origin;const pdfLib=[PDF_LIB_URL,PDFJS_URL,PDFJS_WORKER_URL].includes(u.href);if(!same&&!pdfLib)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy)).catch(()=>{})}return r}).catch(()=>caches.match('./index.html'))))});
