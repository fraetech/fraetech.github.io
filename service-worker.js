importScripts('/js/version.js');

const CACHE_NAME = `mh-pwa-${self.APP_VERSION}`;

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/config.js',
  '/js/dataStore.js',
  '/js/filterManager.js',
  '/js/mapManager.js',
  '/js/popupGenerator.js',
  '/js/searchManager.js',
  '/js/utils.js',
  '/js/version.js',
  '/favicon.png',
  '/favicon.ico',
  '/favicon.svg',
  '/og-logo.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  if (URLS_TO_CACHE.some(url => event.request.url.endsWith(url))) {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});