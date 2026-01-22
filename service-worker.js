importScripts('/js/version.js');

const STATIC_CACHE = `mh-static-${self.APP_VERSION}`;
const ICONS_CACHE = `mh-icons-${self.APP_VERSION}`;

// Uniquement les ressources critiques (chargement initial)
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/historique.html',
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

// Installation : cache uniquement les ressources critiques
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      await Promise.all(
        URLS_TO_CACHE.map(async url => {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('Cache failed:', url, e);
          }
        })
      );
    })
  );
});

// Activation : nettoie les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => {
            // Garde uniquement les caches de la version actuelle
            const isCurrentCache = (key === STATIC_CACHE || key === ICONS_CACHE);
            if (!isCurrentCache) {
              console.log('Deleting old cache:', key);
            }
            return !isCurrentCache;
          })
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch : stratégies différentes selon le type de ressource
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignore les requêtes non-HTTP
  if (!url.protocol.startsWith('http')) return;
  
  // Stratégie pour les icônes : Cache-First avec mise en cache automatique
  if (url.pathname.startsWith('/icons/') && 
      (url.pathname.endsWith('.svg') || url.pathname.endsWith('.avif'))) {
    event.respondWith(
      caches.open(ICONS_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          // Fonction pour récupérer et mettre en cache
          const fetchAndCache = fetch(event.request).then(response => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(err => {
            console.warn('Icon fetch failed:', url.pathname, err);
            // Retourne une réponse vide en cas d'erreur
            return new Response('', { status: 404 });
          });
          
          // Si en cache, retourne le cache, sinon fetch
          return cached || fetchAndCache;
        });
      })
    );
    return;
  }
  
  // Stratégie pour les ressources statiques : Cache-First
  if (url.origin === self.location.origin && 
      URLS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(response => 
        response || fetch(event.request).then(fetchResponse => {
          // Cache les nouvelles ressources statiques
          return caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
      )
    );
    return;
  }
  
  // Pour tout le reste : Network-First (données dynamiques, API, etc.)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});