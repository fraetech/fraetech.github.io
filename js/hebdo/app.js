// app.js
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { MapManager } from '../core/mapManager.js';
import { DataStore } from './dataStore.js';
import { SearchManager } from './searchManager.js';
import { FilterManager } from './filterManager.js';
import { showNotification, copyToClipboard } from '../core/notifications.js';

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
              <div class="filter-category-header">Mode de filtrage</div>
              <div class="filter-group expanded">
              <label><input type="radio" name="filterMode" value="simple" checked>Simple</label>
              <label><input type="radio" name="filterMode" value="advanced">Avancé</label>
              </div>
              <div class="filter-group" id="advancedFilters"></div>
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
        const content = div.querySelector('.filters-content');
        if (e.target === div || e.target.classList.contains('filters-content')) {
          if (div.classList.contains('collapsed')) {
            div.classList.remove('collapsed'); 
            div.classList.add('expanded'); 
            content.style.display='block';
            setTimeout(() => {
              const adv = document.getElementById('advancedFilters');
              if (adv) {
                adv.offsetHeight; // force reflow
              }

              window.dispatchEvent(new Event('resize'));
            }, 0);
            try { if (map && map.dragging) map.dragging.disable(); } catch (err) {}
            ['touchstart','touchmove','touchend','wheel'].forEach(evt => { 
              content.addEventListener(evt, function(ev){ ev.stopPropagation(); }, { passive: false }); 
            });
          } else if (div.classList.contains('expanded')) {
            div.classList.remove('expanded'); 
            div.classList.add('collapsed'); 
            content.style.display='none';
            try { if (map && map.dragging) map.dragging.enable(); } catch (err) {}
          }
        }
      });

      // Gestion du repli/dépli des catégories
      Promise.resolve().then(() => {
        div.querySelectorAll('.filter-category-header').forEach(header => {
          header.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-category-btn')) return;
            const nextGroup = header.nextElementSibling;
            if (nextGroup && nextGroup.classList.contains('filter-group')) {
              nextGroup.classList.toggle('expanded');
            }
          });
        });

        div.querySelectorAll('.toggle-category-btn[data-category]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = btn.getAttribute('data-category');
            const container = document.getElementById(category);
            const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
            // Tout décocher si au moins une est cochée, tout cocher seulement si tout est décoché
            const newState = !Array.from(allCheckboxes).some(chk => chk.checked);
            allCheckboxes.forEach(chk => {
              chk.checked = newState;
              chk.dispatchEvent(new Event('change'));
            });
            btn.textContent = newState ? 'Tout décocher' : 'Tout cocher';
          });
        });
      });

      return div;
    }
  });

  map.addControl(new SearchIconControl({ position: 'topleft' }));
  map.addControl(new SearchControl({ position: 'topleft' }));
  map.addControl(new FilterControl({ position: 'topright' }));

  // Attach simple DOM behavior (clear search)
  Promise.resolve().then(() => {
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
          const allCheckboxes = document.querySelectorAll(
            '#technoFilters input[type="checkbox"], #freqFilters input[type="checkbox"], ' +
            '#opFilters input[type="checkbox"], #actionFilters input[type="checkbox"]'
          );
          const anyChecked = Array.from(allCheckboxes).some(cb => cb.checked);
          toggleAllBtn.textContent = anyChecked ? 'Tout décocher' : 'Tout cocher';
        };

        toggleAllBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const allCheckboxes = document.querySelectorAll(
            '#technoFilters input[type="checkbox"], #freqFilters input[type="checkbox"], ' +
            '#opFilters input[type="checkbox"], #actionFilters input[type="checkbox"]'
          );
          // Tout décocher si au moins une est cochée, tout cocher seulement si tout est déjà décoché
          const anyChecked = Array.from(allCheckboxes).some(cb => cb.checked);
          const newState = !anyChecked;

          allCheckboxes.forEach(cb => {
            cb.checked = newState;
            cb.dispatchEvent(new Event('change'));
          });

          document.querySelectorAll('input[name="zoneBlanche"][value="all"], input[name="siteNeuf"][value="all"]').forEach(r => {
            r.checked = true;
            r.dispatchEvent(new Event('change'));
          });

          updateToggleButton();
        });

        document.addEventListener('change', (e) => {
          if (e.target.type === 'checkbox') {
            updateToggleButton();
          }
        });

        // Synchro forcée depuis filterManager
        document.addEventListener('filtersLabelUpdate', () => {
          updateToggleButton();
        });

        updateToggleButton();
      }

      // Hide search on clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-control') && !e.target.closest('.search-icon-control')) {
          searchManager.hideSearchBar();
        }
      });

      // Un seul handler pour masquer le message + fermer la search bar
      map.on('movestart click zoomstart', () => {
        const msg = document.getElementById('message');
        if (msg) msg.style.display = 'none';
        searchManager.hideSearchBar();
      });

      // Fermeture du panneau filtre sur movestart ou click carte
      map.on('movestart click', () => {
        const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');
        if (filterPanel?.classList.contains('expanded')) {
          filterPanel.classList.replace('expanded', 'collapsed');
          filterPanel.querySelector('.filters-content').style.display = 'none';
          try { map.dragging.enable(); } catch (_) {}
        }
      });

      // matchMedia mis en cache une seule fois
      const mql = window.matchMedia('(max-width: 768px)');
      const filterPanel = document.querySelector('.leaflet-control.custom-filter-control');

      const applyHoverBehavior = (isMobile) => {
        if (!filterPanel) return;
        if (!isMobile) {
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
        }
      };

      applyHoverBehavior(mql.matches);
      mql.addEventListener('change', (e) => applyHoverBehavior(e.matches));
  });
}

async function loadCsvAndInit(dataStore, mapManager) {
  const statusElem = document.querySelector("#message-status");

  const setStatus = (message, color = '') => {
    if (!statusElem) return;

    statusElem.textContent = message;
    statusElem.style.color = color;
  };

  try {
    const params = new URLSearchParams(window.location.search);
    const base = params.get('csv') || 'hebdo/index';

    const cacheBuster = Date.now();

    const csvUrl =
      `${CONFIG.baseDataUrl}${base}.csv?t=${cacheBuster}`;

    const timestampUrl =
      `${CONFIG.baseDataUrl}${base.replace('index', 'timestamp')}.txt?t=${cacheBuster}`;

    // CSV (bloquant)
    const csvResp = await fetch(csvUrl);

    if (!csvResp.ok) {
      throw new Error(`CSV inaccessible (HTTP ${csvResp.status})`);
    }

    const csvText = (await csvResp.text()).trim();

    if (!csvText) {
      throw new Error("CSV vide");
    }

    // Détection d'une page HTML renvoyée 
    if (/^\s*</.test(csvText)) {
      throw new Error("Le serveur a renvoyé du HTML au lieu du CSV");
    }

    const { Utils } = await import('./utils.js');
    const rows = Utils.csvToRows(csvText);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Aucune donnée exploitable dans le CSV");
    }

    // Timestamp (optionnel, ne bloque jamais)
    (async () => {
      try {
        const tsResp = await fetch(timestampUrl);

        if (!tsResp.ok) {
          throw new Error(`HTTP ${tsResp.status}`);
        }

        const ts = (await tsResp.text()).trim();

        window._resolvedCsvBase = timestampToWeekId(ts, params.get('csv'));

        if (!ts || /^\s*</.test(ts)) {
          throw new Error("Timestamp invalide");
        }

        setStatus(`MAJ ANFR du ${ts}`);
      } catch (err) {
        console.warn("Timestamp indisponible :", err);

        setStatus(
          "Date de mise à jour indisponible",
          "orange"
        );
      }
    })();

    // Initialisation de l'application
    const grouped = Object.create(null);

    for (const row of rows) {
      const key = `${row.id_support}_${row.operateur}`;
      (grouped[key] ??= []).push(row);
    }

    await dataStore.createAndStoreMarkersInBatches(grouped, 200);

  } catch (err) {
    console.error("Erreur chargement CSV :", err);

    setStatus(
      "Erreur : impossible de charger les données",
      "red"
    );

    return false;
  }

  return true;
}

function timestampToWeekId(ts, currentBase) {
  // Si la base est déjà spécifique (pas index), on la garde telle quelle
  if (currentBase && !currentBase.endsWith('/index')) {
    return currentBase;  // ex: "mensu/M06_2026", "hebdo/S15_2026", "trim/T2_2026"
  }

  // Sinon on résout "hebdo/index" → "hebdo/S26_2026" depuis le timestamp
  const [datePart] = ts.split(' à ');
  const [day, month, year] = datePart.split('/').map(Number);
  const date = new Date(year, month - 1, day);

  // Numéro de semaine ISO 8601
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );

  // Préfixe = même dossier que la base actuelle (hebdo/ par défaut)
  const prefix = currentBase ? currentBase.split('/')[0] : 'hebdo';
  return `${prefix}/S${weekNum}_${year}`;
}

window.shareLocation = function(supportId, operateur) {
  const params = new URLSearchParams(window.location.search);
  const base = window._resolvedCsvBase   // figé au moment du chargement
    ?? params.get('csv')                  // fallback si timestamp pas encore fetchéé
    ?? 'hebdo/index';                     // dernier recours

  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('csv', base);
  url.searchParams.set('support', supportId);
  url.searchParams.set('op', operateur);

  const finalUrl = url.toString();
  copyToClipboard(finalUrl);
};

class URLManager {
  constructor(mapManager, dataStore) {
  this.mapManager = mapManager;
  this.dataStore = dataStore;
  }
  
  checkURLOnLoad() {
    const params = new URLSearchParams(window.location.search);

    const supportId = params.get('support');
    const operateur = params.get('op');

    if (supportId && operateur) {
      this.openSupportFromURL(supportId, operateur);
    }
  }
  
  openSupportFromURL(supportId, operateur) {
    const support = this.dataStore.findSupportByIdAndOperator(
      supportId,
      operateur
    );

    if (!support?.marker) {
      showNotification(
        'Support non trouvé sur la carte',
        'error'
      );
      return;
    }

    this.mapManager.markerCluster.zoomToShowLayer(
      support.marker,
      () => {
        support.marker.openPopup();
      }
    );
  }
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

  // Filtre opérateur via ?ope=
  const initParams = new URLSearchParams(window.location.search);
  const opeParam = initParams.get('ope');
  if (opeParam) {
    filterManager.applyOperatorFilter(opeParam.toUpperCase());
  }

  const urlManager = new URLManager(mapManager, dataStore);
  urlManager.checkURLOnLoad();
}

document.addEventListener("DOMContentLoaded", () => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(main);
  } else {
    setTimeout(main, 50);
  }
});