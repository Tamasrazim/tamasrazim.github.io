const CACHE="bnc-invoice-v45";
const PDF_LIB="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
const CORE=["./","./index.html","./css/app.css","./js/app.js","./manifest.webmanifest","./icons/icon.svg","../invoice.pdf"];
const FALLBACK=new URL("./index.html",self.registration.scope).href;
const put=async(req,res)=>{if(res&&(res.ok||res.type==="opaque")){const c=await caches.open(CACHE);await c.put(req,res.clone())}return res};
const network=async req=>{try{return await put(req,await fetch(req))}catch{return caches.match(req)}};
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);try{await c.put(PDF_LIB,await fetch(PDF_LIB,{mode:"no-cors",cache:"reload"}))}catch{}await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url),same=u.origin===self.location.origin,external=u.href===PDF_LIB;if(!same&&!external)return;if(e.request.mode==="navigate")e.respondWith(network(e.request));else e.respondWith((async()=>{const hit=await caches.match(e.request);return hit||await network(e.request)})())});
