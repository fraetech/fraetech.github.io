importScripts('/js/version.js');

const STATIC_CACHE = `mh-static-${self.APP_VERSION}`;
const ICONS_CACHE = `mh-icons-${self.APP_VERSION}`;

// Flag pour indiquer si une mise à jour est en cours
let updateInProgress = false;

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
  console.log('SW installing version:', self.APP_VERSION);
  
  event.waitUntil(
    // D'abord, supprime TOUS les anciens caches
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
      // Puis crée les nouveaux caches
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
      console.log('Activating - existing caches:', keys);
      return Promise.all(
        keys.map(key => {
          const isCurrentCache = (key === STATIC_CACHE || key === ICONS_CACHE);
          if (!isCurrentCache) {
            console.log('SW activate: Deleting old cache:', key);
            return caches.delete(key);
          }
          console.log('SW activate: Keeping cache:', key);
          return Promise.resolve();
        })
      );
    }).then(() => {
      console.log('Cache cleanup complete, claiming clients');
      return self.clients.claim();
    })
  );
});

// Message handler pour les mises à jour
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Skip waiting requested');
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'UPDATE_DETECTED') {
    console.log('SW: Update detected, switching to Network-First strategy');
    updateInProgress = true;
  }
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
  
  // Stratégie pour les ressources statiques : Cache-First par défaut, Network-First si mise à jour
  if (url.origin === self.location.origin && 
      URLS_TO_CACHE.includes(url.pathname)) {
    
    if (updateInProgress) {
      // Network-First pendant une mise à jour
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
      // Cache-First en temps normal
      event.respondWith(
        caches.match(event.request).then(cached => {
          if (cached) {
            return cached;
          }
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
  
  // Pour tout le reste : Network-First (données dynamiques, API, etc.)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});