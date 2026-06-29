/* map.js — ANFR Mensu */

// ── Constantes ────────────────────────────────────────────────────────────────
const COLORS = { add: '#27ae60', del: '#e74c3c', mod: '#f39c12' };
const TYPE_LABELS = { add: 'Ajout', del: 'Suppression', mod: 'Modification' };
const UNIT = { M: 'MHz', K: 'kHz', G: 'GHz' };

// Ordre d'affichage souhaité pour les systèmes
const SYS_ORDER = [
  'FM','DAB','DAB+','AM','TNT','DVB-T2','DVB-T','FH',
  'PMR','TETRAPOL','TETRA',
  'GSM 900','GSM 1800','UMTS 900','UMTS 2100',
  'LTE 700','LTE 800','LTE 900','LTE 1800','LTE 2100','LTE 2600',
  '5G NR 700','5G NR 2100','5G NR 3500','5G NR 26000',
  'NR 700','NR 2100','NR 3500',
];

const FIELD_LABELS = {
  nat:'Nature', haut:'Hauteur (m)', prop:'Propriétaire', exp:'Exploitant',
  lieu:'Lieu', adr:'Adresse', cp:'Code postal', insee:'INSEE',
  dt_impl:'Date implantation', dt_mod:'Date modification', dt_svc:'Date service',
  lat:'Latitude', lon:'Longitude',
  type:'Type antenne', dim:'Dimension (m)', ray:'Rayon', az:'Azimut (°)', alt:'Altitude bas (m)',
  sys:'Système',
};

// ── État global ───────────────────────────────────────────────────────────────
let DIFF = null;
let ALL_MARKERS = [];   // [{type, sys:Set, marker}]
let map, clusters;
let activeFilters = { types: new Set(['add','del','mod']), sys: new Set() };
let allSys = new Set();

// ── Carte ─────────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([46.5, 2.5], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  clusters = {
    add: L.markerClusterGroup({ maxClusterRadius: 50, chunkedLoading: true }),
    del: L.markerClusterGroup({ maxClusterRadius: 50, chunkedLoading: true }),
    mod: L.markerClusterGroup({ maxClusterRadius: 50, chunkedLoading: true }),
  };
  Object.values(clusters).forEach(c => c.addTo(map));
}

// ── Helpers HTML ──────────────────────────────────────────────────────────────
function sysBadge(s) {
  return `<span class="sys-chip">${s}</span>`;
}

function sysBadges(arr) {
  return sortSys(arr).map(sysBadge).join(' ');
}

function sortSys(arr) {
  return [...arr].sort((a, b) => {
    const ia = SYS_ORDER.indexOf(a), ib = SYS_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function bandLine(b) {
  const fd = b.fd ?? b.f_debut, ff = b.ff ?? b.f_fin;
  const u = UNIT[b.u || b.unite] || b.u || b.unite || '';
  return `<div class="band-line">↝ ${fd} – ${ff} ${u}</div>`;
}

function infoTable(rows) {
  const trs = rows
    .filter(([, v]) => v != null && v !== '')
    .map(([l, v]) => `<tr><td>${l}</td><td><b>${v}</b></td></tr>`)
    .join('');
  return trs ? `<table class="info">${trs}</table>` : '';
}

function renderEmetteur(e, cls = '') {
  const sys = e.sys || e.systeme || '';
  const dt = e.dt_svc || e.date_service || '';
  const bandes = e.ban || e.bandes || [];
  return `<div class="emr-block ${cls}">
    <div class="emr-title">
      ${sys ? sysBadge(sys) : ''}
      ${dt ? `<span style="color:#888;font-size:11px">${dt}</span>` : ''}
    </div>
    ${bandes.map(bandLine).join('')}
  </div>`;
}

function renderAntenne(a, cls = '') {
  const aer = a.aer || a.aer_id || '';
  const type = a.type || a.type_antenne || '';
  const az = a.az ?? a.azimut;
  const alt = a.alt ?? a.alt_bas;
  const dim = a.dim ?? a.dimension;
  const emrs = a.emr || a.emetteurs || [];

  // Systèmes portés
  const sysSet = new Set();
  emrs.forEach(e => { const s = e.sys || e.systeme; if (s) sysSet.add(s); });

  const metaParts = [
    type,
    az != null ? `Az. ${az}°` : '',
    alt != null ? `Alt. ${alt} m` : '',
    dim != null ? `Dim. ${dim} m` : '',
  ].filter(Boolean).join(' · ');

  return `<div class="ant-block ${cls}">
    <div class="ant-title">Antenne ${aer}</div>
    ${metaParts ? `<div class="ant-meta">${metaParts}</div>` : ''}
    ${sysSet.size ? `<div style="margin-bottom:4px">${sysBadges([...sysSet])}</div>` : ''}
    ${emrs.map(e => renderEmetteur(e)).join('')}
  </div>`;
}

// ── Popup station ajout / suppression ─────────────────────────────────────────
function popupAddDel(type, d) {
  const ants = d.ant || d.antennes || [];
  const typeCls = `badge-${type}`;

  let html = `<div class="popup-header">
    <div class="popup-sta">${d.sta}</div>
    <div class="popup-exp">${d.exp || d.exploitant || '—'} <span class="popup-type-badge ${typeCls}">${TYPE_LABELS[type]}</span></div>
    <div class="popup-meta">${[d.nat||d.nature, d.haut ? `${d.haut} m` : ''].filter(Boolean).join(' · ')}</div>
  </div>`;

  html += infoTable([
    ['Propriétaire', d.prop || d.proprietaire],
    ['Lieu', d.lieu],
    ['Adresse', d.adr || d.adresse],
    ['CP / INSEE', [d.cp||d.code_postal, d.insee].filter(Boolean).join(' / ')],
    ['Lat / Lon', d.lat != null ? `${d.lat}, ${d.lon}` : null],
    ['Date implantation', d.dt_impl || d.date_implantation],
    ['Date service', d.dt_svc || d.date_service],
  ]);

  if (ants.length) {
    html += `<div class="popup-section">
      <div class="popup-section-title">${ants.length} antenne${ants.length > 1 ? 's' : ''}</div>
      ${ants.map(a => renderAntenne(a)).join('')}
    </div>`;
  }
  return html;
}

// ── Popup station modification ────────────────────────────────────────────────
function popupMod(d) {
  let html = `<div class="popup-header">
    <div class="popup-sta">${d.sta}</div>
    <div class="popup-exp">${d.exp || '—'} <span class="popup-type-badge badge-mod">Modification</span></div>
    <div class="popup-meta">${[d.nat, d.haut ? `${d.haut} m` : ''].filter(Boolean).join(' · ')}</div>
  </div>`;

  // Adresse
  const adresseStr = [d.lieu, d.adr, d.cp && d.insee ? `${d.cp} (${d.insee})` : (d.cp||d.insee)].filter(Boolean).join(', ');
  if (adresseStr) html += `<div style="font-size:12px;color:#555;margin-bottom:8px">📍 ${adresseStr}</div>`;

  // Champs station modifiés
  if (d.diff && Object.keys(d.diff).length) {
    html += `<div class="popup-section">
      <div class="popup-section-title modified">Champs modifiés</div>`;
    for (const [k, [av, ap]] of Object.entries(d.diff)) {
      html += `<div class="diff-row">
        <span class="diff-key">${FIELD_LABELS[k]||k}</span>
        <span class="diff-old">${av ?? '∅'}</span>
        <span class="diff-arrow">→</span>
        <span class="diff-new">${ap ?? '∅'}</span>
      </div>`;
    }
    html += '</div>';
  }

  // Antennes ajoutées
  if (d['ant+']?.length) {
    html += `<div class="popup-section">
      <div class="popup-section-title added">+ ${d['ant+'].length} antenne${d['ant+'].length>1?'s':''} ajoutée${d['ant+'].length>1?'s':''}</div>
      ${d['ant+'].map(a => renderAntenne(a, 'added')).join('')}
    </div>`;
  }

  // Antennes supprimées (contexte complet)
  if (d['ant-']?.length) {
    html += `<div class="popup-section">
      <div class="popup-section-title deleted">- ${d['ant-'].length} antenne${d['ant-'].length>1?'s':''} supprimée${d['ant-'].length>1?'s':''}</div>
      ${d['ant-'].map(a => renderAntenne(a, 'deleted')).join('')}
    </div>`;
  }

  // Antennes modifiées
  if (d['ant~']?.length) {
    html += `<div class="popup-section">
      <div class="popup-section-title modified">~ ${d['ant~'].length} antenne${d['ant~'].length>1?'s':''} modifiée${d['ant~'].length>1?'s':''}</div>`;

    d['ant~'].forEach(a => {
      const ctx = a.ctx || {};
      const metaParts = [
        ctx.type,
        ctx.az != null ? `Az. ${ctx.az}°` : '',
        ctx.alt != null ? `Alt. ${ctx.alt} m` : '',
        ctx.dim != null ? `Dim. ${ctx.dim} m` : '',
      ].filter(Boolean).join(' · ');

      html += `<div class="ant-block">
        <div class="ant-title">Antenne ${a.aer}</div>
        ${metaParts ? `<div class="ant-meta">${metaParts}</div>` : ''}
        ${ctx.sys?.length ? `<div style="margin-bottom:5px">${sysBadges(ctx.sys)}</div>` : ''}`;

      // Champs antenne modifiés
      if (a.diff) {
        for (const [k, [av, ap]] of Object.entries(a.diff)) {
          html += `<div class="diff-row">
            <span class="diff-key">${FIELD_LABELS[k]||k}</span>
            <span class="diff-old">${av??'∅'}</span>
            <span class="diff-arrow">→</span>
            <span class="diff-new">${ap??'∅'}</span>
          </div>`;
        }
      }

      // Émetteurs ajoutés
      if (a['emr+']?.length) {
        html += `<div class="label-sm added">+ Émetteurs ajoutés</div>`;
        html += a['emr+'].map(e => renderEmetteur(e, 'added')).join('');
      }

      // Émetteurs supprimés
      if (a['emr-']?.length) {
        html += `<div class="label-sm deleted">- Émetteurs supprimés</div>`;
        html += a['emr-'].map(e => renderEmetteur(e, 'deleted')).join('');
      }

      // Émetteurs modifiés
      if (a['emr~']?.length) {
        html += `<div class="label-sm modified">~ Émetteurs modifiés</div>`;
        a['emr~'].forEach(e => {
          const sysLabel = e.diff?.sys
            ? `${e.diff.sys[0]} → ${e.diff.sys[1]}`
            : (e.sys || '?');
          html += `<div class="emr-block">
            <div class="emr-title">${sysBadge(sysLabel)}</div>`;
          if (e.diff) {
            for (const [k, [av, ap]] of Object.entries(e.diff)) {
              if (k === 'sys') continue;
              html += `<div class="diff-row">
                <span class="diff-key">${FIELD_LABELS[k]||k}</span>
                <span class="diff-old">${av??'∅'}</span>
                <span class="diff-arrow">→</span>
                <span class="diff-new">${ap??'∅'}</span>
              </div>`;
            }
          }
          if (e['ban+']?.length) {
            html += `<div class="label-sm added">+ Bandes</div>` + e['ban+'].map(bandLine).join('');
          }
          if (e['ban-']?.length) {
            html += `<div class="label-sm deleted">- Bandes</div>` + e['ban-'].map(bandLine).join('');
          }
          html += '</div>';
        });
      }

      html += '</div>'; // ant-block
    });
    html += '</div>';
  }

  return html;
}

// ── Collecte des systèmes d'un item ──────────────────────────────────────────
function collectSys(type, d) {
  const s = new Set();
  const addFromAnts = ants => ants.forEach(a => {
    (a.emr || a.emetteurs || []).forEach(e => { const v = e.sys||e.systeme; if(v) s.add(v); });
  });
  if (type === 'add' || type === 'del') {
    addFromAnts(d.ant || d.antennes || []);
  } else {
    addFromAnts(d['ant+'] || []);
    addFromAnts(d['ant-'] || []);
    (d['ant~'] || []).forEach(a => {
      (a.ctx?.sys || []).forEach(v => s.add(v));
      (a['emr+'] || []).forEach(e => { if(e.sys) s.add(e.sys); });
      (a['emr-'] || []).forEach(e => { if(e.sys) s.add(e.sys); });
      (a['emr~'] || []).forEach(e => {
        if(e.sys) s.add(e.sys);
        if(e.diff?.sys) { s.add(e.diff.sys[0]); s.add(e.diff.sys[1]); }
      });
    });
  }
  return s;
}

// ── Création d'un marker ─────────────────────────────────────────────────────
function makeMarker(type, d, popup) {
  return L.circleMarker([d.lat, d.lon], {
    radius: 7, color: '#fff', weight: 1.5,
    fillColor: COLORS[type], fillOpacity: 0.85,
  }).bindPopup(popup, { maxHeight: 460, maxWidth: 440 });
}

// ── Chargement des données ────────────────────────────────────────────────────
async function loadDiff() {
  const qs = new URLSearchParams(location.search).get('diff');
  const candidates = [qs, 'diff.json'].filter(Boolean);
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
    } catch {}
  }
  return null;
}

// ── Filtrage ─────────────────────────────────────────────────────────────────
function applyFilters() {
  Object.keys(clusters).forEach(t => clusters[t].clearLayers());

  ALL_MARKERS.forEach(({ type, sys, marker }) => {
    if (!activeFilters.types.has(type)) return;
    if (activeFilters.sys.size > 0) {
      const match = [...activeFilters.sys].some(s => sys.has(s));
      if (!match) return;
    }
    clusters[type].addLayer(marker);
  });

  updateFilterCount();
}

function updateFilterCount() {
  let count = 0;
  ALL_MARKERS.forEach(({ type, sys }) => {
    if (!activeFilters.types.has(type)) return;
    if (activeFilters.sys.size > 0 && ![...activeFilters.sys].some(s => sys.has(s))) return;
    count++;
  });
  document.querySelector('#btn-filtres .count-badge').textContent = count;
}

// ── Construction du panneau filtres ──────────────────────────────────────────
function buildFilterPanel() {
  const panel = document.getElementById('panel-filtres');

  // Groupe types
  const statsEl = document.getElementById('filter-types');
  statsEl.innerHTML = [
    ['add', `Ajouts (${DIFF.stats.add})`],
    ['del', `Suppressions (${DIFF.stats.del})`],
    ['mod', `Modifications (${DIFF.stats.mod})`],
  ].map(([t, label]) => `
    <div class="filter-row">
      <input type="checkbox" id="ft-${t}" checked onchange="toggleType('${t}', this.checked)" />
      <label for="ft-${t}"><span class="dot dot-${t}"></span>${label}</label>
    </div>`).join('');

  // Groupe systèmes
  const sysEl = document.getElementById('filter-sys');
  sysEl.innerHTML = sortSys([...allSys]).map(s => `
    <div class="filter-row">
      <input type="checkbox" id="fs-${s.replace(/\s/g,'_')}" onchange="toggleSys('${s}', this.checked)" />
      <label for="fs-${s.replace(/\s/g,'_')}">${sysBadge(s)}</label>
    </div>`).join('');
}

window.toggleType = (t, checked) => {
  if (checked) activeFilters.types.add(t); else activeFilters.types.delete(t);
  applyFilters();
};

window.toggleSys = (s, checked) => {
  if (checked) activeFilters.sys.add(s); else activeFilters.sys.delete(s);
  applyFilters();
};

window.resetFilters = () => {
  activeFilters = { types: new Set(['add','del','mod']), sys: new Set() };
  document.querySelectorAll('#panel-filtres input[type=checkbox]').forEach(cb => {
    cb.checked = cb.id.startsWith('ft-');
  });
  applyFilters();
};

window.toggleFiltres = () => {
  document.getElementById('panel-filtres').classList.toggle('open');
};

// ── Légende ───────────────────────────────────────────────────────────────────
function addLegend() {
  const fmt = s => s.length === 6
    ? ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][+s.slice(4)-1] + ' ' + s.slice(0,4)
    : s;

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:white;padding:10px 14px;border-radius:6px;box-shadow:0 1px 5px rgba(0,0,0,.3);font-size:13px;line-height:1.9';
    div.innerHTML = `<b style="display:block;margin-bottom:4px">ANFR Mensu — ${fmt(DIFF.old)} → ${fmt(DIFF.new)}</b>
      <span class="dot dot-add"></span> Ajouts (${DIFF.stats.add})<br>
      <span class="dot dot-del"></span> Suppressions (${DIFF.stats.del})<br>
      <span class="dot dot-mod"></span> Modifications (${DIFF.stats.mod})`;
    return div;
  };
  legend.addTo(map);
}

// ── Init principale ───────────────────────────────────────────────────────────
async function init() {
  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  initMap();

  const loading = document.getElementById('loading-overlay');
  loading.querySelector('p').textContent = 'Chargement du diff…';

  DIFF = await loadDiff();
  if (!DIFF) {
    loading.querySelector('p').textContent = 'diff.json introuvable. Placez-le à la racine ou passez ?diff=url';
    return;
  }

  loading.querySelector('p').textContent = 'Construction des marqueurs…';

  const add = (type, d) => {
    if (d.lat == null || d.lon == null) return;
    const sys = collectSys(type, d);
    sys.forEach(s => allSys.add(s));
    const popup = type === 'mod' ? popupMod(d) : popupAddDel(type, d);
    const marker = makeMarker(type, d, popup);
    clusters[type].addLayer(marker);
    ALL_MARKERS.push({ type, sys, marker });
  };

  (DIFF.add || []).forEach(d => add('add', d));
  (DIFF.del || []).forEach(d => add('del', d));
  (DIFF.mod || []).forEach(d => add('mod', d));

  buildFilterPanel();
  addLegend();
  updateFilterCount();

  loading.classList.add('hidden');
}

init();
