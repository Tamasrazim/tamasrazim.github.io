const CACHE="bnc-public-v3";
const CORE=[
 "./","./index.html","./manifest.webmanifest","./FB_IMG_1789811599210.jpg","./FB_IMG_1789811611633.jpg",
 "./IMG-20260713-WA0000.jpg","./IMG-20260713-WA0001.jpg","./IMG-20260713-WA0002.jpg","./IMG-20260713-WA0003.jpg" ,"./reference/products.js"
];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 if(url.origin!==location.origin)return;
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
   if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
   return response;
 }).catch(()=>caches.match("./"))));
});