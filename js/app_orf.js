// app.js
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { MapManager } from './mapManager.js';
import { DataStore } from './dataStore.js';
import { SearchManager } from './searchManager.js';
import { FilterManager } from './filterManager.js';

// Make CONFIG global for plugins that read it (used in some modules)
window.CONFIG = CONFIG;

// Small helper to load Leaflet and MarkerCluster (with fallback local paths if needed)
async function loadLeafletAndCluster() {
  // load CSS for leaflet & markercluster first (non-blocking)
  const leafletCss = 'https://unpkg.com/leaflet/dist/leaflet.css';
  const clusterCss = 'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css';
  const clusterDefaultCss = 'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css';
  try {
    await Promise.all([
      Utils.loadCss(leafletCss),
      Utils.loadCss(clusterCss),
      Utils.loadCss(clusterDefaultCss)
    ]);
  } catch (e) {
    console.warn('CDN CSS failed, continuing (expect local CSS fallback if provided).', e);
  }

  // Now load Leaflet and MarkerCluster JS sequentially
  try {
    await Utils.loadScript('https://unpkg.com/leaflet/dist/leaflet.js', { fallback: 'vendor/leaflet.js' });
    await Utils.loadScript('https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js', { fallback: 'vendor/leaflet.markercluster.js' });
  } catch (err) {
    console.error('Leaflet load failed:', err);
    throw err;
  }
}

function createMapControls(map, dataStore, searchManager, filterManager) {
  // --- Search Icon Control
  const SearchIconControl = L.Control.extend({
    onAdd: function() {
      const div = L.DomUtil.create('div', 'leaflet-control search-icon-control');
      div.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`;
      div.title = 'Rechercher';
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        const searchControl = document.querySelector('.search-control');
        if (searchControl) {
          searchControl.classList.add('expanded');
          const input = document.getElementById('searchInput');
          if (input) setTimeout(() => input.focus(), 100);
        }
      });
      L.DomEvent.disableClickPropagation(div);
      return div;
    }
  });

  // --- Search Control
  const SearchControl = L.Control.extend({
    onAdd: function() {
      const div = L.DomUtil.create('div', 'leaflet-control search-control');
      div.innerHTML = `<div style="position: relative;">
          <input type="text" id="searchInput" class="search-input" placeholder="Rechercher une ville, adresse, ou support ID..." aria-label="Recherche">
          <button id="clearSearch" class="clear-search-btn" style="display:none" type="button" aria-label="Effacer la recherche">&times;</button>
        </div>
        <div id="searchResults" class="search-results" role="listbox" aria-label="Résultats de recherche"></div>`;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    }
  });

  // --- Filter Control
  const FilterControl = L.Control.extend({
    onAdd: function() {
      const div = L.DomUtil.create('div', 'leaflet-control custom-filter-control collapsed');
      div.innerHTML = `<div class="filters-content" style="display:none;">
          <button class="toggle-all-filters" id="toggleAllFilters" type="button">Tout décocher</button>
          <div class="filter-category-header">Technologies <button class="toggle-category-btn" data-category="technoFilters" style="font-size:0.8em;padding:2px 6px;cursor:pointer;">Tout décocher</button></div>
          <div class="filter-group" id="technoFilters"></div>
          <div class="filter-category-header">Fréquences <button class="toggle-category-btn" data-category="freqFilters" style="font-size:0.8em;padding:2px 6px;cursor:pointer;">Tout décocher</button></div>
          <div class="filter-group" id="freqFilters"></div>
          <div class="filter-category-header">Opérateurs <button class="toggle-category-btn" data-category="opFilters" style="font-size:0.8em;padding:2px 6px;cursor:pointer;">Tout décocher</button></div>
          <div class="filter-group" id="opFilters"></div>
          <div class="filter-category-header">Actions <button class="toggle-category-btn" data-category="actionFilters" style="font-size:0.8em;padding:2px 6px;cursor:pointer;">Tout décocher</button></div>
          <div class="filter-group" id="actionFilters"></div>
          <div class="filter-category-header">Zone Blanche</div>
          <div class="filter-group" id="zbFilter"></div>
          <div class="filter-category-header">Sites Neufs</div>
          <div class="filter-group" id="newSiteFilter"></div>
        </div>`;
      L.DomEvent.disableScrollPropagation(div);
      L.DomEvent.disableClickPropagation(div);
      div.addEventListener('click', (e) => {
        if (e.target === div || e.target.classList.contains('filters-content')) {
          const content = div.querySelector('.filters-content');
          if (div.classList.contains('collapsed')) {
            div.classList.remove('collapsed'); div.classList.add('expanded'); content.style.display='block';
            try { if (map && map.dragging) map.dragging.disable(); } catch (err) {}
            ['touchstart','touchmove','touchend','wheel'].forEach(evt => { content.addEventListener(evt, function(ev){ ev.stopPropagation(); }, { passive: false }); });
          } else if (div.classList.contains('expanded')) {
            div.classList.remove('expanded'); div.classList.add('collapsed'); content.style.display='none';
            try { if (map && map.dragging) map.dragging.enable(); } catch (err) {}
          }
        }
      });
      return div;
    }
  });

  map.addControl(new SearchIconControl({ position: 'topleft' }));
  map.addControl(new SearchControl({ position: 'topleft' }));
  map.addControl(new FilterControl({ position: 'topright' }));

  // Attach simple DOM behavior (clear search)
  setTimeout(() => {
    const clearButton = document.getElementById('clearSearch');
    if (clearButton) {
      clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.getElementById('searchInput');
        if (input) { input.value = ''; searchManager.hideResults(); input.focus(); }
        clearButton.style.display = 'none';
      });
    }

    const input = document.getElementById('searchInput');
    if (input) {
      input.addEventListener('input', (ev) => {
        const v = ev.target.value.trim();
        clearButton.style.display = v ? 'flex' : 'none';
        searchManager.handleInput(v);
      });
    }

    // Global toggle all filters button
    const toggleAllBtn = document.getElementById('toggleAllFilters');
    if (toggleAllBtn) {
      const updateToggleButton = () => {
        const allCheckboxes = document.querySelectorAll('#technoFilters input[type="checkbox"], #freqFilters input[type="checkbox"], #opFilters input[type="checkbox"], #actionFilters input[type="checkbox"]');
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
        toggleAllBtn.textContent = allChecked ? 'Tout décocher' : 'Tout cocher';
      };
      
      toggleAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const allCheckboxes = document.querySelectorAll('#technoFilters input[type="checkbox"], #freqFilters input[type="checkbox"], #opFilters input[type="checkbox"], #actionFilters input[type="checkbox"]');
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
        allCheckboxes.forEach(cb => { cb.checked = !allChecked; cb.dispatchEvent(new Event('change')); });
        // Also toggle radio buttons to their default positions
        document.querySelectorAll('input[name="zoneBlanche"][value="all"], input[name="siteNeuf"][value="all"]').forEach(r => {
          r.checked = true;
          r.dispatchEvent(new Event('change'));
        });
        updateToggleButton();
      });
      
      // Update button state when filters change
      document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          updateToggleButton();
        }
      });
      
      updateToggleButton();
    }

    // Hide search on clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-control') && !e.target.closest('.search-icon-control')) {
        searchManager.hideSearchBar();
      }
    });

    // Map events to hide message & controls
    map.on('movestart', () => {
      const msg = document.getElementById('message'); if (msg) msg.style.display='none';
      searchManager.hideSearchBar();
      const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');
      if (filterPanel && filterPanel.classList.contains('expanded')) {
        filterPanel.classList.remove('expanded'); filterPanel.classList.add('collapsed'); filterPanel.querySelector('.filters-content').style.display='none';
        try { if (map && map.dragging) map.dragging.enable(); } catch (err) {}
      }
    });
    
    // Fermer les filtres quand on clique sur la carte
    map.on('click', () => {
      const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');
      if (filterPanel && filterPanel.classList.contains('expanded')) {
        filterPanel.classList.remove('expanded');
        filterPanel.classList.add('collapsed');
        filterPanel.querySelector('.filters-content').style.display='none';
        try { if (map && map.dragging) map.dragging.enable(); } catch (err) {}
      }
    });
    
    map.on('click zoomstart', () => {
      const msg = document.getElementById('message'); if (msg) msg.style.display='none';
    });
    
    // Hover behavior for filter button on PC (not on mobile)
    const isDesktop = () => !window.matchMedia('(max-width: 768px)').matches;
    if (isDesktop()) {
      const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');
      if (filterPanel) {
        // Handle button hover to open filter panel
        filterPanel.addEventListener('mouseenter', () => {
          if (filterPanel.classList.contains('collapsed')) {
            filterPanel.classList.remove('collapsed');
            filterPanel.classList.add('expanded');
            filterPanel.querySelector('.filters-content').style.display='block';
            try { if (map && map.dragging) map.dragging.disable(); } catch (err) {}
          }
        });
        
        // Handle leaving filter panel to close it
        filterPanel.addEventListener('mouseleave', () => {
          if (filterPanel.classList.contains('expanded')) {
            filterPanel.classList.remove('expanded');
            filterPanel.classList.add('collapsed');
            filterPanel.querySelector('.filters-content').style.display='none';
            try { if (map && map.dragging) map.dragging.enable(); } catch (err) {}
          }
        });
      }
    }
  }, 150);
}

async function loadCsvAndInit(dataStore, mapManager) {
  try {
    const params = new URLSearchParams(window.location.search);
    const csvPath = params.get('csv');
    const base = csvPath ? csvPath : 'hebdo/orange';
    const csvUrl = `${CONFIG.baseDataUrl}${base}.csv?t=${Date.now()}`;
    const timestampUrl = `${CONFIG.baseDataUrl}${base.replace('orange','timestamp')}.txt?t=${Date.now()}`;

    const csvResp = await fetch(csvUrl);
    const csvText = await csvResp.text();
    const rows = (await import('./utils.js')).Utils.csvToRows(csvText);

    fetch(timestampUrl).then(r => r.text()).then(ts => {
      const strongElem = document.querySelector("#message-status");
      if (strongElem && ts) strongElem.textContent = `MAJ ANFR du ${ts.trim()}`;
    }).catch(() => {});

    const grouped = {};
    rows.forEach(row => {
      const key = `${row.id_support}_${row.operateur}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    await dataStore.createAndStoreMarkersInBatches(grouped, 200);

  } catch (err) {
    console.error('Loading CSV failed', err);
    const strongElem = document.querySelector("#message-status");
    if (strongElem) { 
      strongElem.textContent = "Erreur de chargement des données"; 
      strongElem.style.color = 'red'; 
    }
  }
}

window.shareLocation = function(lat, lon, supportId) {
  const url = `${window.location.origin}${window.location.pathname}#support=${supportId}&lat=${lat}&lon=${lon}`;
  
  // Copier dans le presse-papiers
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      showNotification('Lien copié dans le presse-papiers !', 'success');
    }).catch(() => {
      fallbackCopyToClipboard(url);
    });
  } else {
    fallbackCopyToClipboard(url);
  }
};

// Fallback pour les navigateurs plus anciens
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showNotification('Lien copié dans le presse-papiers !', 'success');
  } catch (err) {
    console.error('Erreur de copie:', err);
    showNotification('Impossible de copier automatiquement. URL: ' + text, 'error');
  }
  
  document.body.removeChild(textArea);
}

class URLManager {
  constructor(mapManager, dataStore) {
    this.mapManager = mapManager;
    this.dataStore = dataStore;
    // Attendre que les données soient chargées avant de vérifier l'URL
    this.checkURLOnLoadDelayed();
  }
  
  checkURLOnLoadDelayed() {
    // Vérifier l'URL après un délai pour s'assurer que les markers sont chargés
    setTimeout(() => {
      this.checkURLOnLoad();
    }, 1000); // Délai plus long pour laisser le temps aux markers de se charger
  }
  
  checkURLOnLoad() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    const params = new URLSearchParams(hash);
    const supportId = params.get('support');
    const lat = parseFloat(params.get('lat'));
    const lon = parseFloat(params.get('lon'));
    
    if (supportId && lat && lon) {
      this.openSupportFromURL(supportId, lat, lon);
    }
  }
  
  openSupportFromURL(supportId, lat, lon) {
    // Centre la carte d'abord
    this.mapManager.map.setView([lat, lon], 16);
    
    // Trouve et ouvre le popup correspondant avec plusieurs stratégies
    setTimeout(() => {
      let markerFound = false;
      
      // Stratégie 1 : Recherche par ID support dans les données
      if (this.dataStore && this.dataStore.allData) {
        const matchingData = this.dataStore.allData.find(item => 
          item.id_support === supportId
        );
        
        if (matchingData) {
          const [itemLat, itemLon] = matchingData.coordonnees.split(',').map(s => parseFloat(s.trim()));
          
          // Chercher le marker correspondant
          this.mapManager.markersLayer.eachLayer(marker => {
            if (!markerFound) {
              const markerLat = marker.getLatLng().lat;
              const markerLon = marker.getLatLng().lng;
              
              // Comparaison avec une tolérance plus large
              if (Math.abs(markerLat - itemLat) < 0.0001 && Math.abs(markerLon - itemLon) < 0.0001) {
                marker.openPopup();
                markerFound = true;
                console.log('Popup ouvert via stratégie 1 (ID support)');
                return;
              }
            }
          });
        }
      }
      
      // Stratégie 2 : Si pas trouvé, chercher par coordonnées avec tolérance
      if (!markerFound) {
        this.mapManager.markersLayer.eachLayer(marker => {
          if (!markerFound) {
            const markerLat = marker.getLatLng().lat;
            const markerLon = marker.getLatLng().lng;
            
            // Tolérance élargie pour les coordonnées
            if (Math.abs(markerLat - lat) < 0.001 && Math.abs(markerLon - lon) < 0.001) {
              marker.openPopup();
              markerFound = true;
              console.log('Popup ouvert via stratégie 2 (coordonnées)');
              return;
            }
          }
        });
      }
      
      // Stratégie 3 : Si toujours pas trouvé, chercher le marker le plus proche
      if (!markerFound) {
        let closestMarker = null;
        let minDistance = Infinity;
        
        this.mapManager.markersLayer.eachLayer(marker => {
          const markerLat = marker.getLatLng().lat;
          const markerLon = marker.getLatLng().lng;
          const distance = Math.sqrt(
            Math.pow(markerLat - lat, 2) + Math.pow(markerLon - lon, 2)
          );
          
          if (distance < minDistance && distance < 0.01) { // Dans un rayon raisonnable
            minDistance = distance;
            closestMarker = marker;
          }
        });
        
        if (closestMarker) {
          closestMarker.openPopup();
          markerFound = true;
          console.log('Popup ouvert via stratégie 3 (plus proche)');
        }
      }
      
      if (!markerFound) {
        console.warn('Aucun marker trouvé pour:', { supportId, lat, lon });
        // Optionnel : afficher une notification à l'utilisateur
        showNotification('Support non trouvé sur la carte', 'error');
      }
      
    }, 800); // Délai pour laisser le temps à la carte de se centrer
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: inherit;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

async function main() {
  // Hide message close behavior
  document.getElementById('closeButton')?.addEventListener('click', () => {
    document.getElementById('message').style.display = 'none';
  });

  // Load Leaflet & cluster (CSS + JS)
  await loadLeafletAndCluster();

  // Create managers
  const mapManager = new MapManager();
  // create map now that L is available
  const map = mapManager.createMap();

  // Data store and managers
  const dataStore = new DataStore(mapManager);
  const searchManager = new (await import('./searchManager.js')).SearchManager(dataStore, mapManager);
  const filterManager = new (await import('./filterManager.js')).FilterManager(dataStore, mapManager);

  // Provide global debugging helper (safe)
  window.debugApp = () => ({ dataStore, mapManager, searchManager, filterManager });

  // Create controls once map is ready
  createMapControls(map, dataStore, searchManager, filterManager);

  // Start loading CSV and building markers in background (non-blocking)
  await loadCsvAndInit(dataStore, mapManager);
  filterManager.initFilters();

  // Ensure controls are wired: searchManager displays results into #searchResults
  // and filterManager will apply filters to the markers already added.
  const urlManager = new URLManager(mapManager, dataStore);
}

document.addEventListener("DOMContentLoaded", () => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(main);
  } else {
    setTimeout(main, 50);
  }
});