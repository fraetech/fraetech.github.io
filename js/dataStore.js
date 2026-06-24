// dataStore.js
import { Utils } from './utils.js';
import { PopupGenerator } from './popupGenerator.js';
import { CONFIG } from './config.js';

// DataStore holds supports and indexes
export class DataStore {
  constructor(mapManager) {
    this.supportsById = new Map();
    this.mapManager = mapManager;
    this.supports = new Map(); // key -> { marker, data, coords }
    this.searchIndex = new Map(); // support/address => Map(key -> [entries])
    this.filterValues = {
      operateurs: new Set(),
      technos: new Set(),
      freqs: new Set(),
      actions: new Set(),
      techFreqPairs: new Set()
    };
    this.activeFilters = {
      operateurs: new Set(),
      technos: new Set(),
      freqs: new Set(),
      actions: new Set(),
      zb: new Set(['true','false']),
      new: new Set(['true','false'])
    };
    this.advancedFilterMode = false;
    this.advancedMatchMode = 'contains';
    this.activeAdvancedPairs = new Set();
    this.filterValues.techFreqPairs = new Set();
  }

  addSupport(supportKey, supportObj) {
    this.supports.set(supportKey, supportObj);

    const firstRow = supportObj.data[0];
    const supportId = firstRow.id_support?.toString() || '';
    const address = firstRow.adresse || '';

    if (supportId) {
      this.supportsById.set(supportId, supportObj);
    }

    // Index support id and address (lowercase)
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

    // Collect filter values + précalcul des paires tech/freq par row
    supportObj.data.forEach(row => {
      this.filterValues.operateurs.add(row.operateur);
      this.filterValues.actions.add(row.action);

      // Précalcul une seule fois à l'ingestion
      row._techFreqPairs = [];
      if (row.technologie) {
        row.technologie.split(',').forEach(techRaw => {
          const tech = techRaw.trim();
          const baseTech = Utils.extractBaseTech(tech);
          const freq = Utils.extractFreq(tech);
          if (baseTech) this.filterValues.technos.add(baseTech);
          if (freq) this.filterValues.freqs.add(freq);
          if (baseTech && freq) {
            const pair = `${baseTech}_${freq}`;
            this.filterValues.techFreqPairs.add(pair);
            row._techFreqPairs.push({ baseTech, freq, pair });
          }
        });
      }
    });
  }

  findSupportById(supportId) {
  return this.supportsById.get(String(supportId)) || null;
  }

  findSupportByIdAndOperator(supportId, operateur) {
    const key = `${supportId}_${operateur}`;
    return this.supports.get(key) || null;
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
      if (this.advancedFilterMode) {
        if (!this.matchesAdvancedSupportFilter(supportData)) {
          continue;
        }
      }
      let shouldDisplay = false;
      for (const row of supportData.data) {
        if (this.matchesFilters(row)) {
          shouldDisplay = true;
          break;
        }
      }
      if (shouldDisplay) filtered.push(supportData);
    }
    return filtered;
  }

  matchesAdvancedSupportFilter(supportData) {
    if (this.activeAdvancedPairs.size === 0) return true;

    // Utilise les paires précalculées — plus de Set reconstruit à chaque appel
    const sitePairs = new Set();
    for (const row of supportData.data) {
      if (row._techFreqPairs) {
        for (const { pair } of row._techFreqPairs) {
          sitePairs.add(pair);
        }
      }
    }

    if (this.advancedMatchMode === 'contains') {
      return [...this.activeAdvancedPairs].every(pair => sitePairs.has(pair));
    }
    return (
      sitePairs.size === this.activeAdvancedPairs.size &&
      [...this.activeAdvancedPairs].every(pair => sitePairs.has(pair))
    );
  }

  matchesFilters(row) {
    const matchOp = this.activeFilters.operateurs.has(row.operateur);
    const matchAction = this.activeFilters.actions.has(row.action);
    const matchZB = this.activeFilters.zb.has(row.is_zb);
    const matchNew = this.activeFilters.new.has(row.is_new);

    const changeActions = new Set(['CHI', 'CHA', 'CHL', 'CHT', 'CHH', 'CHP']);
    let techFreqMatch = true;

    if (
      !this.advancedFilterMode &&
      !changeActions.has(row.action) &&
      row._techFreqPairs?.length
    ) {
      // Utilise les paires précalculées — plus de split/regex ici
      techFreqMatch = row._techFreqPairs.some(
        ({ baseTech, freq }) =>
          this.activeFilters.technos.has(baseTech) &&
          this.activeFilters.freqs.has(freq)
      );
    }

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
    return new Promise((resolve) => {
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
          const iconUrl = `${CONFIG.baseIconUrl}${opConfig.id}${actionId}.svg`;

          const icon = L.icon({
            iconUrl,
            iconSize: [48,48],
            iconAnchor: [24,48],
            popupAnchor: [0,-40]
          });

          const marker = L.marker([lat, lon], { icon, title: firstRow.operateur });
          marker.bindPopup(PopupGenerator.generate(supportRows, lat, lon), { maxWidth: 320 });
          const storeObj = { marker, data: supportRows, coords: { lat, lon } };

          this.addSupport(key, storeObj);
          this.mapManager.addMarkerToCluster(marker);
        }

        if (index < entries.length) {
          setTimeout(processBatch, 0);
        } else {
          resolve();
        }
      };

      processBatch();
    });
  }
}