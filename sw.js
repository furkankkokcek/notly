const CACHE_NAME = 'notly-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/app.css',
  '/css/components/header.css',
  '/css/components/card.css',
  '/css/components/modal.css',
  '/css/components/list.css',
  '/js/store.js',
  '/js/api.js',
  '/js/app.js',
  '/js/sw-register.js',
  '/js/components/header.js',
  '/js/components/card.js',
  '/js/components/modal.js',
  '/js/components/list.js',
  '/pages/home.js',
  '/pages/settings.js',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
