// mensu/app.js
import { CONFIG } from './config.js';
import { Utils } from '../core/utils.js';
import { MapManager } from '../core/mapManager.js';
import { DataStore } from './dataStore.js';
import { SearchManager } from './searchManager.js';
import { FilterManager } from './filterManager.js';
import { showNotification, copyToClipboard } from '../core/notifications.js';
import { createMapControls, buildLegendHtml } from '../core/mapControls.js';

async function loadLeafletAndCluster() {
  const leafletCss = 'https://unpkg.com/leaflet/dist/leaflet.css';
  const clusterCss = 'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css';
  const clusterDefaultCss = 'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css';
  try {
    await Promise.all([
      Utils.loadCss(leafletCss),
      Utils.loadCss(clusterCss),
      Utils.loadCss(clusterDefaultCss),
    ]);
  } catch (e) {
    console.warn('CDN CSS failed, continuing.', e);
  }
  await Utils.loadScript('https://unpkg.com/leaflet/dist/leaflet.js');
  await Utils.loadScript('https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js');
}

function buildLegendContent() {
  const items = [
    ['add', 'dot-add', 'Ajout'],
    ['del', 'dot-del', 'Suppression'],
    ['mod', 'dot-mod', 'Modification'],
  ].map(([, dotCls, label]) =>
    `<div class="legend-item"><span class="dot ${dotCls}" style="display:inline-block;width:12px;height:12px;border-radius:50%;"></span><span>${label}</span></div>`
  ).join('');
  return buildLegendHtml(items, 'Types de modification');
}

function fmtMois(s) {
  if (!s || s.length !== 6) return s;
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[parseInt(s.slice(4, 6)) - 1]} ${s.slice(0, 4)}`;
}

async function loadDiffAndInit(dataStore) {
  const statusElem = document.querySelector('#message-status');
  const setStatus = (message, color = '') => {
    if (!statusElem) return;
    statusElem.textContent = message;
    statusElem.style.color = color;
  };

  try {
    const params = new URLSearchParams(window.location.search);
    const base = params.get('diff') || 'index';

    const diff = await dataStore.load(base);
    window._resolvedDiffBase = `${diff.old}_${diff.new}`;

    setStatus(`MAJ ANFR : ${fmtMois(diff.old)} → ${fmtMois(diff.new)}`);

    dataStore.buildMarkers();
    return true;
  } catch (err) {
    console.error('Erreur chargement diff :', err);
    setStatus('Erreur : impossible de charger les données', 'red');
    return false;
  }
}

window.shareLocation = function (staId) {
  const params = new URLSearchParams(window.location.search);
  const base = window._resolvedDiffBase ?? params.get('diff') ?? 'index';

  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('diff', base);
  url.searchParams.set('sta', staId);

  copyToClipboard(url.toString());
};

class URLManager {
  constructor(mapManager, dataStore) {
    this.mapManager = mapManager;
    this.dataStore = dataStore;
  }

  checkURLOnLoad() {
    const params = new URLSearchParams(window.location.search);
    const sta = params.get('sta');
    if (sta) this.openStationFromURL(sta);
  }

  openStationFromURL(staId) {
    const rec = this.dataStore.findBySta(staId);
    if (!rec?.marker) {
      showNotification('Station non trouvée sur la carte', 'error');
      return;
    }
    const cluster = this.mapManager.clusters[rec.type];
    if (cluster) {
      cluster.zoomToShowLayer(rec.marker, () => rec.marker.openPopup());
    } else {
      this.mapManager.map.setView(rec.marker.getLatLng(), 16);
      rec.marker.openPopup();
    }
  }
}

async function main() {
  document.getElementById('closeButton')?.addEventListener('click', () => {
    document.getElementById('message').style.display = 'none';
  });

  await loadLeafletAndCluster();

  const mapManager = new MapManager();
  const map = mapManager.createMap();

  const dataStore = new DataStore(mapManager);
  const ok = await loadDiffAndInit(dataStore);
  if (!ok) return;

  const searchManager = new SearchManager(dataStore, mapManager);
  const filterManager = new FilterManager(dataStore, mapManager);

  window.debugApp = () => ({ dataStore, mapManager, searchManager, filterManager });

  createMapControls(map, {
    onSearchInput: (v) => searchManager.handleInput(v),
    onClearSearch: () => searchManager.hideResults(),
    filterPanelHtml: filterManager.buildPanelHtml(),
    afterFilterPanelMount: (panelEl) => filterManager.attachListeners(panelEl),
  });

  filterManager.apply();

  // Légende
  document.body.insertAdjacentHTML('beforeend', buildLegendContent());

  // Comportements UI communs (fermeture recherche/filtre au clic carte, hover desktop)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-control') && !e.target.closest('.search-icon-control')) {
      searchManager.hideSearchBar();
    }
  });

  map.on('movestart click zoomstart', () => {
    const msg = document.getElementById('message');
    if (msg) msg.style.display = 'none';
    searchManager.hideSearchBar();
  });

  map.on('movestart click', () => {
    const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');
    if (filterPanel?.classList.contains('expanded')) {
      filterPanel.classList.replace('expanded', 'collapsed');
      filterPanel.querySelector('.filters-content').style.display = 'none';
      try { map.dragging.enable(); } catch (_) {}
    }
  });

  const mql = window.matchMedia('(max-width: 768px)');
  const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');
  const applyHoverBehavior = (isMobile) => {
    if (!filterPanel || isMobile) return;
    filterPanel.addEventListener('mouseenter', () => {
      if (filterPanel.classList.contains('collapsed')) {
        filterPanel.classList.replace('collapsed', 'expanded');
        filterPanel.querySelector('.filters-content').style.display = 'block';
        try { map.dragging.disable(); } catch (_) {}
      }
    });
    filterPanel.addEventListener('mouseleave', () => {
      if (filterPanel.classList.contains('expanded')) {
        filterPanel.classList.replace('expanded', 'collapsed');
        filterPanel.querySelector('.filters-content').style.display = 'none';
        try { map.dragging.enable(); } catch (_) {}
      }
    });
  };
  applyHoverBehavior(mql.matches);
  mql.addEventListener('change', (e) => applyHoverBehavior(e.matches));

  const urlManager = new URLManager(mapManager, dataStore);
  urlManager.checkURLOnLoad();
}

document.addEventListener('DOMContentLoaded', () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(main);
  } else {
    setTimeout(main, 50);
  }
});
