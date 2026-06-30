// mensu/filterManager.js
import { CONFIG } from './config.js';
import { PopupGenerator } from './popupGenerator.js';

export class FilterManager {
  constructor(dataStore, mapManager) {
    this.dataStore = dataStore;
    this.mapManager = mapManager;
    this.activeTypes = new Set(['add', 'del', 'mod']);
    this.activeSys = new Set();
  }

  /** HTML injecté dans la coquille .filters-content (core/mapControls.js) */
  buildPanelHtml() {
    const stats = this.dataStore.diff.stats || {};
    const typesHtml = [
      ['add', `Ajouts (${stats.add ?? 0})`, 'dot-add'],
      ['del', `Suppressions (${stats.del ?? 0})`, 'dot-del'],
      ['mod', `Modifications (${stats.mod ?? 0})`, 'dot-mod'],
    ].map(([t, label, dotCls]) => `
      <label><input type="checkbox" data-filter-type="${t}" checked>
        <span class="dot ${dotCls}" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle;"></span>${label}
      </label>`).join('');

    const sysList = PopupGenerator.sortSys([...this.dataStore.allSys]);
    const sysHtml = sysList.map(s => `
      <label><input type="checkbox" data-filter-sys="${s}">${PopupGenerator.sysBadge(s)}</label>`).join('');

    return `
      <button class="toggle-all-filters" id="toggleAllFiltersMensu" type="button">Tout décocher</button>

      <div class="filter-category-header">Type d'action</div>
      <div class="filter-group expanded" id="typeFilters">${typesHtml}</div>

      <div class="filter-category-header">Système / Technologie <button class="toggle-category-btn" data-category="sysFilters" style="font-size:0.8em;padding:2px 6px;cursor:pointer;">Tout cocher</button></div>
      <div class="filter-group" id="sysFilters">${sysHtml}</div>

      <button class="reset-filters" id="resetFiltersMensu" type="button">Réinitialiser les filtres</button>
    `;
  }

  /** Attache les listeners une fois le panneau monté dans le DOM */
  attachListeners(panelEl) {
    panelEl.querySelectorAll('[data-filter-type]').forEach(cb => {
      cb.addEventListener('change', () => {
        const t = cb.getAttribute('data-filter-type');
        if (cb.checked) this.activeTypes.add(t); else this.activeTypes.delete(t);
        this.apply();
      });
    });

    panelEl.querySelectorAll('[data-filter-sys]').forEach(cb => {
      cb.addEventListener('change', () => {
        const s = cb.getAttribute('data-filter-sys');
        if (cb.checked) this.activeSys.add(s); else this.activeSys.delete(s);
        this.apply();
      });
    });

    const resetBtn = panelEl.querySelector('#resetFiltersMensu');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.activeTypes = new Set(['add', 'del', 'mod']);
        this.activeSys = new Set();
        panelEl.querySelectorAll('[data-filter-type]').forEach(cb => { cb.checked = true; });
        panelEl.querySelectorAll('[data-filter-sys]').forEach(cb => { cb.checked = false; });
        this.apply();
      });
    }
  }

  apply() {
    this.mapManager.clearAllClusters();
    this.dataStore.records.forEach(({ type, sys, marker }) => {
      if (!this.activeTypes.has(type)) return;
      if (this.activeSys.size > 0) {
        const match = [...this.activeSys].some(s => sys.has(s));
        if (!match) return;
      }
      this.mapManager.addMarkerToCluster(marker, type);
    });
  }
}
