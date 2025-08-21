// dataStore.js
import { Utils } from './utils.js';
import { PopupGenerator } from './popupGenerator.js';
import { CONFIG } from './config.js';

// DataStore holds supports and indexes
export class DataStore {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.supports = new Map(); // key -> { marker, data, coords }
    this.searchIndex = new Map(); // support/address => Map(key -> [entries])
    this.filterValues = {
      operateurs: new Set(),
      technos: new Set(),
      freqs: new Set(),
      actions: new Set()
    };
    this.activeFilters = {
      operateurs: new Set(),
      technos: new Set(),
      freqs: new Set(),
      actions: new Set(),
      zb: new Set(['true','false']),
      new: new Set(['true','false'])
    };
  }

  addSupport(supportKey, supportObj) {
    this.supports.set(supportKey, supportObj);

    // Index support id and address (lowercase)
    const firstRow = supportObj.data[0];
    const supportId = firstRow.id_support?.toString() || '';
    const address = firstRow.adresse || '';

    if (!this.searchIndex.has('support')) this.searchIndex.set('support', new Map());
    if (!this.searchIndex.has('address')) this.searchIndex.set('address', new Map());

    const supIdx = this.searchIndex.get('support');
    const addrIdx = this.searchIndex.get('address');

    const keySup = supportId.toLowerCase();
    const keyAddr = address.toLowerCase();

    if (!supIdx.has(keySup)) supIdx.set(keySup, []);
    if (!addrIdx.has(keyAddr)) addrIdx.set(keyAddr, []);

    supIdx.get(keySup).push({ supportKey, data: supportObj });
    addrIdx.get(keyAddr).push({ supportKey, data: supportObj });

    // Collect filter values
    supportObj.data.forEach(row => {
      this.filterValues.operateurs.add(row.operateur);
      this.filterValues.actions.add(row.action);
      row.technologie.split(',').forEach(techRaw => {
        const tech = techRaw.trim();
        const baseTech = Utils.extractBaseTech(tech);
        const freq = Utils.extractFreq(tech);
        if (baseTech) this.filterValues.technos.add(baseTech);
        if (freq) this.filterValues.freqs.add(freq);
      });
    });
  }

  search(query, type) {
    const results = [];
    const q = (query || '').toLowerCase();
    const index = this.searchIndex.get(type);
    if (!index) return results;

    for (const [key, arr] of index) {
      if (key.includes(q)) {
        arr.forEach(entry => {
          const firstRow = entry.data.data[0];
          const [lat, lon] = Utils.safeParseFloatPair(firstRow.coordonnees);
          results.push({
            type,
            display: type === 'support' ? `Support ${firstRow.id_support}` : firstRow.adresse,
            detail: type === 'support' ? `${firstRow.operateur} - ${firstRow.adresse}` : `Support ${firstRow.id_support} - ${firstRow.operateur}`,
            marker: entry.data.marker,
            lat, lon,
            operator: firstRow.operateur
          });
        });
      }
    }
    return results;
  }

  getFilteredSupports() {
    const filtered = [];
    for (const [key, supportData] of this.supports) {
      let shouldDisplay = false;
      for (const row of supportData.data) {
        if (this.matchesFilters(row)) { shouldDisplay = true; break; }
      }
      if (shouldDisplay) filtered.push(supportData);
    }
    return filtered;
  }

  matchesFilters(row) {
    const matchOp = this.activeFilters.operateurs.has(row.operateur);
    const matchAction = this.activeFilters.actions.has(row.action);
    const matchZB = this.activeFilters.zb.has(row.is_zb);
    const matchNew = this.activeFilters.new.has(row.is_new);

    const techFreqMatch = row.technologie.split(',').some(techRaw => {
      const tech = techRaw.trim();
      const baseTech = Utils.extractBaseTech(tech);
      const freq = Utils.extractFreq(tech);
      return this.activeFilters.technos.has(baseTech) && this.activeFilters.freqs.has(freq);
    });

    return matchOp && matchAction && matchZB && matchNew && techFreqMatch;
  }

  isResultFilteredOut(result) {
    if (!result.operator) return true;
    return !this.activeFilters.operateurs.has(result.operator);
  }

  updateActiveFilters(filterType, values) {
    this.activeFilters[filterType] = values;
  }

  // Création progressive des marqueurs (batch)
  createAndStoreMarkersInBatches(groupedDataObj, batchSize = 200) {
    const entries = Object.entries(groupedDataObj);
    let index = 0;

    const processBatch = () => {
      const end = Math.min(index + batchSize, entries.length);
      for (; index < end; index++) {
        const [key, supportRows] = entries[index];
        const firstRow = supportRows[0];
        const [lat, lon] = Utils.safeParseFloatPair(firstRow.coordonnees);
        if (isNaN(lat) || isNaN(lon)) continue;

        const opConfig = CONFIG.operators[firstRow.operateur] || CONFIG.operators['MISC'];
        const actionId = supportRows.length > 1 ? '' : `_${firstRow.action?.toLowerCase?.() || ''}`;
        const iconUrl = `${CONFIG.baseIconUrl}${opConfig.id}${actionId}.avif`;

        const icon = L.icon({
          iconUrl,
          iconSize: [48,48],
          iconAnchor: [24,48],
          popupAnchor: [0,-40]
        });

        const marker = L.marker([lat, lon], { icon, title: firstRow.operateur });
        marker.bindPopup(PopupGenerator.generate(supportRows), { maxWidth: 320 });
        const storeObj = { marker, data: supportRows, coords: { lat, lon } };

        this.addSupport(key, storeObj);
        this.mapManager.addMarkerToCluster(marker);
      }

      if (index < entries.length) {
        setTimeout(processBatch, 0); // laisse respirer le navigateur
      }
    };

    processBatch();
  }
}