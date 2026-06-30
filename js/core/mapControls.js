// core/mapControls.js - coquilles de contrôles Leaflet réutilisables
// Le contenu (quoi filtrer, quoi chercher) reste dans chaque variante (hebdo/mensu),
// mais la mécanique DOM (ouverture/fermeture, toggle catégories) est commune.

/**
 * Crée les contrôles Search + Filter sur la carte.
 * @param {L.Map} map
 * @param {Object} opts
 * @param {Function} opts.onSearchInput - appelé avec la valeur de recherche
 * @param {Function} opts.onClearSearch - appelé quand on vide la recherche
 * @param {String} opts.filterPanelHtml - le HTML interne du panneau de filtres
 *   (catégories spécifiques à la variante), inséré dans la coquille .filters-content
 * @param {Function} [opts.afterFilterPanelMount] - callback après montage du panneau,
 *   pour attacher les listeners spécifiques à la variante (checkboxes, etc.)
 */
export function createMapControls(map, opts) {
  const { onSearchInput, onClearSearch, filterPanelHtml, afterFilterPanelMount } = opts;

  // --- Search Icon Control
  const SearchIconControl = L.Control.extend({
    onAdd: function () {
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
    onAdd: function () {
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

  // --- Filter Control (coquille générique, contenu injecté)
  const FilterControl = L.Control.extend({
    onAdd: function () {
      const div = L.DomUtil.create('div', 'leaflet-control custom-filter-control collapsed');
      div.innerHTML = `<div class="filters-content" style="display:none;">${filterPanelHtml}</div>`;

      L.DomEvent.disableScrollPropagation(div);
      L.DomEvent.disableClickPropagation(div);

      div.addEventListener('click', (e) => {
        const content = div.querySelector('.filters-content');
        if (e.target === div || e.target.classList.contains('filters-content')) {
          if (div.classList.contains('collapsed')) {
            div.classList.remove('collapsed');
            div.classList.add('expanded');
            content.style.display = 'block';
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 0);
            try { if (map && map.dragging) map.dragging.disable(); } catch (err) {}
            ['touchstart', 'touchmove', 'touchend', 'wheel'].forEach(evt => {
              content.addEventListener(evt, function (ev) { ev.stopPropagation(); }, { passive: false });
            });
          } else if (div.classList.contains('expanded')) {
            div.classList.remove('expanded');
            div.classList.add('collapsed');
            content.style.display = 'none';
            try { if (map && map.dragging) map.dragging.enable(); } catch (err) {}
          }
        }
      });

      // Repli/dépli des catégories (générique : toute .filter-category-header)
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

        // Bouton "tout cocher/décocher" par catégorie (générique)
        div.querySelectorAll('.toggle-category-btn[data-category]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = btn.getAttribute('data-category');
            const container = document.getElementById(category);
            if (!container) return;
            const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
            const newState = !Array.from(allCheckboxes).some(chk => chk.checked);
            allCheckboxes.forEach(chk => {
              chk.checked = newState;
              chk.dispatchEvent(new Event('change'));
            });
            btn.textContent = newState ? 'Tout décocher' : 'Tout cocher';
          });
        });

        if (typeof afterFilterPanelMount === 'function') afterFilterPanelMount(div);
      });

      return div;
    }
  });

  map.addControl(new SearchIconControl({ position: 'topleft' }));
  map.addControl(new SearchControl({ position: 'topleft' }));
  map.addControl(new FilterControl({ position: 'topright' }));

  // Comportement recherche (générique)
  Promise.resolve().then(() => {
    const clearButton = document.getElementById('clearSearch');
    if (clearButton) {
      clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.getElementById('searchInput');
        if (input) { input.value = ''; if (onClearSearch) onClearSearch(); input.focus(); }
        clearButton.style.display = 'none';
      });
    }

    const input = document.getElementById('searchInput');
    if (input) {
      input.addEventListener('input', (ev) => {
        const v = ev.target.value.trim();
        if (clearButton) clearButton.style.display = v ? 'flex' : 'none';
        if (onSearchInput) onSearchInput(v);
      });
    }
  });
}

/**
 * Construit la coquille DOM de la légende (toggle + injection de contenu).
 * @param {String} itemsHtml - liste de .legend-item déjà formée
 * @param {String} [title='Légende']
 */
export function buildLegendHtml(itemsHtml, title = 'Actions représentées') {
  return `<div id="legend-control" class="legend-control collapsed">
    <button id="legend-toggle" class="legend-toggle-btn" title="Légende">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
      Légende
    </button>
    <div class="legend-content">
      <div class="legend-title">${title}</div>
      <div class="legend-items">${itemsHtml}</div>
    </div>
  </div>`;
}
