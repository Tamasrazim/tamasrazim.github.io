// What this does: Caches the Code-to-Motion renderer's local files so the page can reopen without downloading everything again.

const CACHE = 'kynestra-c2m-pwa-v3';
const CORE = [
  './',
  './index.html',
  './media-stack.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', event => {