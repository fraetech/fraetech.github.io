// mensu/dataStore.js
import { CONFIG } from './config.js';
import { PopupGenerator } from './popupGenerator.js';

export class DataStore {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.diff = null;
    this.records = [];        // [{type, data, marker, sys:Set}]
    this.allSys = new Set();
  }

  /**
   * Charge le diff JSON pour une période donnée.
   * @param {String} base - ex: "202604_202605" ou "index" pour la dernière période dispo
   */
  async load(base) {
    const url = `${CONFIG.baseDataUrl}diff_${base}.json?t=${Date.now()}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Diff inaccessible (HTTP ${resp.status})`);
    const diff = await resp.json();
    this.diff = diff;
    return diff;
  }

  /**
   * Construit les markers Leaflet pour toutes les entrées du diff
   * et les ajoute aux clusters du mapManager.
   */
  buildMarkers() {
    this.records = [];
    this.allSys = new Set();

    const push = (type, d) => {
      if (d.lat == null || d.lon == null) return;
      const sys = this.collectSys(type, d);
      sys.forEach(s => this.allSys.add(s));

      const popupHtml = type === 'mod'
        ? PopupGenerator.generateMod(d)
        : PopupGenerator.generateAddDel(type, d);

      const marker = L.circleMarker([d.lat, d.lon], {
        radius: 7, color: '#fff', weight: 1.5,
        fillColor: CONFIG.colors[type], fillOpacity: 0.85,
      }).bindPopup(popupHtml, { maxHeight: 460, maxWidth: 440 });

      this.mapManager.addMarkerToCluster(marker, type);
      this.records.push({ type, data: d, marker, sys });
    };

    (this.diff.add || []).forEach(d => push('add', d));
    (this.diff.del || []).forEach(d => push('del', d));
    (this.diff.mod || []).forEach(d => push('mod', d));
  }

  collectSys(type, d) {
    const s = new Set();
    const addFromAnts = ants => ants.forEach(a => {
      (a.emr || a.emetteurs || []).forEach(e => {
        const v = e.sys || e.systeme;
        if (v) s.add(v);
      });
    });

    if (type === 'add' || type === 'del') {
      addFromAnts(d.ant || d.antennes || []);
    } else {
      addFromAnts(d['ant+'] || []);
      addFromAnts(d['ant-'] || []);
      (d['ant~'] || []).forEach(a => {
        (a.ctx?.sys || []).forEach(v => s.add(v));
        (a['emr+'] || []).forEach(e => { if (e.sys) s.add(e.sys); });
        (a['emr-'] || []).forEach(e => { if (e.sys) s.add(e.sys); });
        (a['emr~'] || []).forEach(e => {
          if (e.sys) s.add(e.sys);
          if (e.diff?.sys) { s.add(e.diff.sys[0]); s.add(e.diff.sys[1]); }
        });
      });
    }
    return s;
  }

  findBySta(staId) {
    return this.records.find(r => r.data.sta === staId);
  }

  // Index de recherche générique pour searchManager
  searchIndex() {
    return this.records.map(r => ({
      sta: r.data.sta,
      exp: r.data.exp || r.data.exploitant || '',
      nat: r.data.nat || r.data.nature || '',
      lieu: r.data.lieu || '',
      adr: r.data.adr || r.data.adresse || '',
      insee: r.data.insee || '',
      cp: r.data.cp || r.data.code_postal || '',
      sys: [...r.sys].join(' '),
      type: r.type,
      record: r,
    }));
  }
}
