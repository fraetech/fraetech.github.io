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
  '/apple-touch-icon.png',
  '/icons/byt_aav.avif',
  '/icons/byt_ajo.avif',
  '/icons/byt_all.avif',
  '/icons/byt_cha.avif',
  '/icons/byt_chi.avif',
  '/icons/byt_chl.avif',
  '/icons/byt_ext.avif',
  '/icons/byt_sup.avif',
  '/icons/byt.avif',
  '/icons/cartoradio.avif',
  '/icons/dig_aav.avif',
  '/icons/dig_ajo.avif',
  '/icons/dig_all.avif',
  //'/icons/dig_cha.avif',
  //'/icons/dig_chi.avif',
  //'/icons/dig_chl.avif',
  '/icons/dig_ext.avif',
  '/icons/dig_sup.avif',
  '/icons/dig.avif',
  '/icons/fmb_aav.avif',
  '/icons/fmb_ajo.avif',
  '/icons/fmb_all.avif',
  '/icons/fmb_cha.avif',
  '/icons/fmb_chi.avif',
  '/icons/fmb_chl.avif',
  '/icons/fmb_ext.avif',
  '/icons/fmb_sup.avif',
  '/icons/fmb.avif',
  '/icons/maps.avif',
  '/icons/misc_aav.avif',
  '/icons/misc_ajo.avif',
  '/icons/misc_all.avif',
  '/icons/misc_cha.avif',
  '/icons/misc_chi.avif',
  '/icons/misc_chl.avif',
  '/icons/misc_ext.avif',
  '/icons/misc_sup.avif',
  '/icons/misc.avif',
  '/icons/opt_aav.avif',
  '/icons/opt_ajo.avif',
  '/icons/opt_all.avif',
  //'/icons/opt_cha.avif',
  //'/icons/opt_chi.avif',
  //'/icons/opt_chl.avif',
  '/icons/opt_ext.avif',
  '/icons/opt_sup.avif',
  '/icons/opt.avif',
  '/icons/ora_aav.avif',
  '/icons/ora_ajo.avif',
  '/icons/ora_all.avif',
  //'/icons/ora_cha.avif',
  //'/icons/ora_chi.avif',
  //'/icons/ora_chl.avif',
  '/icons/ora_ext.avif',
  '/icons/ora_sup.avif',
  '/icons/ora.avif',
  '/icons/ott_aav.avif',
  '/icons/ott_ajo.avif',
  '/icons/ott_all.avif',
  //'/icons/ott_cha.avif',
  //'/icons/ott_chi.avif',
  //'/icons/ott_chl.avif',
  '/icons/ott_ext.avif',
  '/icons/ott_sup.avif',
  '/icons/ott.avif',
  '/icons/pmt_aav.avif',
  '/icons/pmt_ajo.avif',
  '/icons/pmt_all.avif',
  //'/icons/pmt_cha.avif',
  //'/icons/pmt_chi.avif',
  //'/icons/pmt_chl.avif',
  '/icons/pmt_ext.avif',
  '/icons/pmt_sup.avif',
  '/icons/pmt.avif',
  '/icons/rnc.avif',
  '/icons/sfr_aav.avif',
  '/icons/sfr_ajo.avif',
  '/icons/sfr_all.avif',
  '/icons/sfr_cha.avif',
  '/icons/sfr_chi.avif',
  '/icons/sfr_chl.avif',
  '/icons/sfr_ext.avif',
  '/icons/sfr_sup.avif',
  '/icons/sfr.avif',
  '/icons/share.avif',
  '/icons/zop_aav.avif',
  '/icons/zop_ajo.avif',
  '/icons/zop_all.avif',
  //'/icons/zop_cha.avif',
  //'/icons/zop_chi.avif',
  //'/icons/zop_chl.avif',
  '/icons/zop_ext.avif',
  '/icons/zop_sup.avif',
  '/icons/zop.avif',
  '/icons/opes/L_byt.avif',
  '/icons/opes/L_dig.avif',
  '/icons/opes/L_fmb.avif',
  '/icons/opes/L_misc.avif',
  '/icons/opes/L_opt.avif',
  '/icons/opes/L_ora.avif',
  '/icons/opes/L_ott.avif',
  '/icons/opes/L_pmt.avif',
  '/icons/opes/L_sfr.avif',
  '/icons/opes/L_zop.avif'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
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

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin &&
      URLS_TO_CACHE.includes(url.pathname)) {

    event.respondWith(
      caches.match(event.request).then(response =>
        response || fetch(event.request)
      )
    );
  }
});