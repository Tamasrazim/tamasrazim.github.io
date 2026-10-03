const CACHE = 'tamasrazim-trilyva-pwa-v26';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './motion-runtime.js',
  './motion-encoders.js',
  './motion-export.js',
  './motion-worker.js',
  './library.js',
  './library-prism.js',
  './library-living-emojis.js',
  './library-web-icons.js',
  './media-stack.js',
  './manifest.webmanifest'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>cached)));});