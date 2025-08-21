// searchManager.js
import { Utils } from './utils.js';

export class SearchManager {
  constructor(dataStore, mapManager) {
    this.dataStore = dataStore;
    this.mapManager = mapManager;
    this.searchTimeout = null;
    this.currentResults = [];
    this._debouncedHandle = Utils.debounce(this._doSearch.bind(this), 250);
    this._initDom();
  }

  _initDom() {
    // Controls are inserted into the map via createControls in app.js
    // The HTML elements' structure should match the original: searchInput, clearSearch, searchResults
  }

  async handleInput(query) {
    if (!query || query.length < 2) {
      this.hideResults();
      return;
    }
    this._debouncedHandle(query);
  }

  async _doSearch(query) {
    try {
      // Local search
      const supportResults = (this.dataStore.search(query, 'support') || []).filter(r => !this.dataStore.isResultFilteredOut(r));
      const addressResults = (this.dataStore.search(query, 'address') || []).filter(r => !this.dataStore.isResultFilteredOut(r));

      // Nominatim geosearch, lightweight: we fetch only 1 best result
      const locationResults = await this.searchNominatim(query);

      // Sort local results
      const sortedSupportResults = supportResults.sort((a,b) => {
        const opA = a.detail.split(' - ')[0] || '';
        const opB = b.detail.split(' - ')[0] || '';
        if (opA !== opB) return opA.localeCompare(opB);
        return (a.detail.split(' - ')[1] || '').localeCompare(b.detail.split(' - ')[1] || '');
      });
      const sortedAddressResults = addressResults.sort((a,b) => {
        const opA = a.detail.split(' - ')[1] || '';
        const opB = b.detail.split(' - ')[1] || '';
        if (opA !== opB) return opA.localeCompare(opB);
        return (a.display || '').localeCompare(b.display || '');
      });

      this.currentResults = [
        ...locationResults,
        ...sortedSupportResults,
        ...sortedAddressResults
      ];

      this.displayResults();
    } catch (err) {
      console.error('Search error', err);
    }
  }

  async searchNominatim(query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=fr&q=${encodeURIComponent(query)}`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      if (!resp.ok) return [];
      const data = await resp.json();
      const seen = new Set();
      const filtered = [];
      for (const item of data) {
        const place = (item.display_name || '').split(',')[0].trim().toLowerCase();
        const preferredTypes = ['city','town','village','hamlet','municipality'];
        const isPreferred = preferredTypes.includes(item.type) || preferredTypes.includes(item.class);
        if (!seen.has(place) || isPreferred) {
          filtered.push({
            type: 'location',
            display: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            importance: item.importance || 0
          });
          seen.add(place);
        }
        if (filtered.length >= 1) break;
      }
      return filtered;
    } catch (err) {
      console.warn('Nominatim failed', err);
      return [];
    }
  }

  displayResults() {
    const container = document.getElementById('searchResults');
    if (!container) return;
    container.innerHTML = '';
    if (!this.currentResults || this.currentResults.length === 0) {
      container.style.display = 'none';
      return;
    }
    this.currentResults.forEach(r => {
      const item = this._createResultItem(r);
      container.appendChild(item);
    });
    container.style.display = 'block';
  }

  _createResultItem(result) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    const typeLabels = { support: 'Support ID', address: 'Adresse antenne', location: 'Lieu' };
    if (result.operator && window.CONFIG && window.CONFIG.operators && window.CONFIG.operators[result.operator]) {
      item.classList.add('has-operator');
      item.style.setProperty('--operator-color', window.CONFIG.operators[result.operator].color);
    }
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
    if (this.mapManager && result.lat && result.lon) {
      this.mapManager.map.setView([result.lat, result.lon], 15);
      if (result.marker) {
        setTimeout(() => result.marker.openPopup?.(), 400);
      }
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