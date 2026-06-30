// mensu/searchManager.js
import { Utils } from '../core/utils.js';
import { CONFIG } from './config.js';

export class SearchManager {
  constructor(dataStore, mapManager) {
    this.dataStore = dataStore;
    this.mapManager = mapManager;
    this.currentResults = [];
    this._debouncedHandle = Utils.debounce(this._doSearch.bind(this), 200);
  }

  async handleInput(query) {
    if (!query || query.length < 2) {
      this.hideResults();
      return;
    }
    this._debouncedHandle(query);
  }

  _doSearch(query) {
    const q = query.toLowerCase().trim();
    const index = this.dataStore.searchIndex();

    const matches = index.filter(item =>
      [item.sta, item.exp, item.nat, item.lieu, item.adr, item.insee, item.cp, item.sys]
        .some(v => v && String(v).toLowerCase().includes(q))
    ).slice(0, 50);

    this.currentResults = matches.map(item => ({
      type: item.type,
      display: `${item.sta} — ${item.exp || item.nat || ''}`,
      detail: [item.adr, item.cp].filter(Boolean).join(', '),
      record: item.record,
    }));

    this.displayResults();
  }

  displayResults() {
    const container = document.getElementById('searchResults');
    if (!container) return;
    if (!this.currentResults.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    const frag = document.createDocumentFragment();
    this.currentResults.forEach(r => frag.appendChild(this._createResultItem(r)));
    container.innerHTML = '';
    container.appendChild(frag);
    container.style.display = 'block';
  }

  _createResultItem(result) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    const typeLabels = CONFIG.typeLabels;
    item.innerHTML = `<div class="search-result-type">${typeLabels[result.type] || result.type}</div>
      <div class="search-result-main">${result.display || ''}</div>
      ${result.detail ? `<div class="search-result-detail">${result.detail}</div>` : ''}`;
    item.addEventListener('click', () => this.selectResult(result));
    return item;
  }

  selectResult(result) {
    this.hideResults();
    const input = document.getElementById('searchInput');
    if (input) input.value = result.display || '';
    const rec = result.record;
    if (rec && rec.data.lat != null && rec.data.lon != null) {
      this.mapManager.map.setView([rec.data.lat, rec.data.lon], 16);
      setTimeout(() => rec.marker.openPopup?.(), 300);
    }
  }

  hideResults() {
    const container = document.getElementById('searchResults');
    if (container) container.style.display = 'none';
    this.currentResults = [];
  }

  hideSearchBar() {
    const searchControl = document.querySelector('.search-control');
    if (searchControl) searchControl.classList.remove('expanded');
    this.hideResults();
  }
}
