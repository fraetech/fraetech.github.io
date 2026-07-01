importScripts('/js/version.js');

const STATIC_CACHE = `mh-static-${self.APP_VERSION}`;
const ICONS_CACHE = `mh-icons-${self.APP_VERSION}`;

let updateInProgress = false;

// Ressources critiques de chaque variante (chargement initial)
const URLS_TO_CACHE = [
  // racine / hebdo
  '/',
  '/index.html',
  '/historique.html',
  '/css/core.css',
  '/css/hebdo.css',
  '/js/core/mapManager.js',
  '/js/core/utils.js',
  '/js/core/notifications.js',
  '/js/core/mapControls.js',
  '/js/hebdo/app.js',
  '/js/hebdo/config.js',
  '/js/hebdo/dataStore.js',
  '/js/hebdo/filterManager.js',
  '/js/hebdo/popupGenerator.js',
  '/js/hebdo/searchManager.js',
  '/js/version.js',

  // mensu
  '/mensu/index.html',
  '/css/mensu.css',
  '/js/mensu/app.js',
  '/js/mensu/config.js',
  '/js/mensu/dataStore.js',
  '/js/mensu/filterManager.js',
  '/js/mensu/popupGenerator.js',
  '/js/mensu/searchManager.js',

  // assets communs
  '/favicon.png',
  '/favicon.ico',
  '/favicon.svg',
  '/og-logo.png',
  '/apple-touch-icon.png'
];

// Installation : cache uniquement les ressources critiques
self.addEventListener('install', event => {
  console.log('SW installing version:', self.APP_VERSION);

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== ICONS_CACHE) {
            console.log('SW install: Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return Promise.all([
        caches.open(ICONS_CACHE),
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
      ]);
    }).then(() => {
      self.skipWaiting();
      console.log('SW install complete, version:', self.APP_VERSION);
    })
  );
});

// Activation : nettoie les anciens caches
self.addEventListener('activate', event => {
  console.log('SW activating, current version:', self.APP_VERSION);

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          const isCurrentCache = (key === STATIC_CACHE || key === ICONS_CACHE);
          if (!isCurrentCache) {
            console.log('SW activate: Deleting old cache:', key);
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message handler pour les mises à jour
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'UPDATE_DETECTED') {
    updateInProgress = true;
  }
});

// Fetch : stratégies différentes selon le type de ressource
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;

  // Données ANFR (CSV hebdo + JSON mensu) : toujours réseau, jamais de cache
  // (fraîcheur des données prioritaire sur la vitesse de chargement)
  if (url.pathname.startsWith('/files/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Icônes : Cache-First avec mise à jour en arrière-plan
  if (url.pathname.startsWith('/icons/') &&
      (url.pathname.endsWith('.svg') || url.pathname.endsWith('.avif'))) {
    event.respondWith(
      caches.open(ICONS_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          const fetchAndCache = fetch(event.request).then(response => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(err => {
            console.warn('Icon fetch failed:', url.pathname, err);
            return new Response('', { status: 404 });
          });
          return cached || fetchAndCache;
        });
      })
    );
    return;
  }

  // Ressources statiques de l'app : Cache-First par défaut, Network-First si MAJ détectée
  if (url.origin === self.location.origin && URLS_TO_CACHE.includes(url.pathname)) {
    if (updateInProgress) {
      event.respondWith(
        fetch(event.request).then(fetchResponse => {
          if (fetchResponse && fetchResponse.ok) {
            return caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          }
          return caches.match(event.request);
        }).catch(() => caches.match(event.request))
      );
    } else {
      event.respondWith(
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.ok) {
              return caches.open(STATIC_CACHE).then(cache => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
            }
            return fetchResponse;
          });
        })
      );
    }
    return;
  }

  // Tout le reste : Network-First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
