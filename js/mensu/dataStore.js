// mensu/dataStore.js
import { CONFIG, getOperator, getPrimaryAction } from './config.js';
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

      const op = getOperator(d.exp || d.exploitant);
      const actionCode = getPrimaryAction(type, d);
      const actionCfg = CONFIG.actions[actionCode] || CONFIG.actions.MISC;
      const iconFile = `${CONFIG.baseIconUrl}${actionCfg.icon}.svg`;

      // Icône SVG colorée dynamiquement via CSS filter ou via teinte CSS
      // On génère un DivIcon avec l'SVG inliné et la couleur de l'exploitant
      const icon = this._makeIcon(iconFile, op.color);

      const popupHtml = type === 'mod'
        ? PopupGenerator.generateMod(d)
        : PopupGenerator.generateAddDel(type, d);

      const marker = L.marker([d.lat, d.lon], {
        icon,
        title: `${d.exp || d.exploitant || '?'} — ${actionCfg.label}`,
      }).bindPopup(popupHtml, { maxHeight: 500, maxWidth: 500 });

      this.mapManager.addMarkerToCluster(marker);
      this.records.push({ type, data: d, marker, sys });
    };

    (this.diff.add || []).forEach(d => push('add', d));
    (this.diff.del || []).forEach(d => push('del', d));
    (this.diff.mod || []).forEach(d => push('mod', d));
  }

  _makeIcon(svgUrl, color) {
    // Les <img> ne supportent pas currentColor - on applique un filtre CSS
    // calculé pour approximer la couleur de l'exploitant.
    const filter = this._hexToFilter(color);
    return L.divIcon({
      className: '',
      html: `<div class="mensu-marker">
               <img src="${svgUrl}" width="40" height="40"
                    style="filter:${filter};drop-shadow(0 2px 3px rgba(0,0,0,.3))"
                    onerror="this.parentElement.innerHTML='<svg viewBox=&quot;0 0 40 40&quot; width=&quot;40&quot; height=&quot;40&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;><circle cx=&quot;20&quot; cy=&quot;20&quot; r=&quot;16&quot; fill=&quot;${color}&quot; stroke=&quot;white&quot; stroke-width=&quot;2&quot;/></svg>'"/>
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  }

  /**
   * Convertit une couleur hex en filtre CSS pour coloriser un SVG noir chargé en <img>.
   * Approximation rapide via hue-rotate + saturate + brightness.
   * Source: calcul inspiré de https://codepen.io/sosuke/pen/Pjoqqp
   * Pour une précision maximale, intégrer la lib css-color-filter-gen.
   */
  _hexToFilter(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g-b)/d + (g<b?6:0)) * 60;
      else if (max === g) h = ((b-r)/d + 2) * 60;
      else h = ((r-g)/d + 4) * 60;
    }
    const l = (max + min) / 2;
    const s = max === min ? 0 : (l > 0.5 ? (max-min)/(2-max-min) : (max-min)/(max+min));
    const brightness = l > 0.5 ? 1.2 : 0.8;
    return `brightness(0) saturate(100%) hue-rotate(${Math.round(h)}deg) saturate(${Math.round(s*300)}%) brightness(${brightness})`;
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
