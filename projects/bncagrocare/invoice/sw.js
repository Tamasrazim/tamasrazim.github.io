const CACHE="bnc-invoice-v19";
const CORE=["./","./index.html","./css/app.css","./js/app.js","./manifest.webmanifest","./icons/icon.svg","../reference/products.js","../reference/addProductRow.js","../reference/BNCFINAL.xlsx"];
const EXCEL="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

self.addEventListener("install",event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  try{await cache.add(EXCEL,await fetch(EXCEL,{mode:"no-cors"}))}catch{}
  await self.skipWaiting();
})()));

self.addEventListener("activate",event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  const same=url.origin===location.origin;
  if(!same&&url.href!==EXCEL)return;
  const isWorkbook=same&&/\.xlsx$/i.test(url.pathname);

  event.respondWith((async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    if(cached)return cached;

    try{
      const response=await fetch(event.request);
      if(response.ok||response.type==="opaque"){
        caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
      }
      return response;
    }catch{
      if(isWorkbook){
        const workbook=await caches.match("../reference/BNCFINAL.xlsx",{ignoreSearch:true});
        if(workbook)return workbook;
        throw new Error("BNC workbook unavailable");
      }
      const fallback=await caches.match("./index.html",{ignoreSearch:true});
      if(fallback)return fallback;
      throw new Error("Offline resource unavailable");
    }
  })());
});