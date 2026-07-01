// mensu/config.js
export const CONFIG = {
  baseDataUrl: '/files/o-data-5w/',
  baseIconUrl: '/icons/',

  operators: {
    // Opérateurs mobiles métropole
    'BOUYGUES TELECOM': { id: 'byt', color: '#009BCE', mcc: 208, mnc: 20 },
    'ORANGE':           { id: 'ora', color: '#FD7B02', mcc: 208, mnc: 1  },
    'FREE MOBILE':      { id: 'fmb', color: '#6D6E71', mcc: 208, mnc: 15 },
    'SFR':              { id: 'sfr', color: '#E40012', mcc: 208, mnc: 10 },
    // Outre-mer
    'FREE CARAIBES':    { id: 'fmb', color: '#6D6E71', mcc: 340, mnc: 4  },
    'TELCO OI':         { id: 'fmb', color: '#6D6E71', mcc1: 647, mnc1: 2, mcc2: 647, mnc2: 3 },
    'SRR':              { id: 'sfr', color: '#E40012', mcc: 647, mnc: 10 },
    'ZEOP':             { id: 'zop', color: '#681260', mcc: 647, mnc: 4  },
    'DIGICEL':          { id: 'dig', color: '#E4002B', mcc: 340, mnc: 20 },
    'OUTREMER TELECOM': { id: 'ott', color: '#DE006F' },
    'PMT-VODAFONE':     { id: 'pmt', color: '#FF0E00', mcc: 547, mnc: 15 },
    'Gouv Nelle Calédonie (OPT)': { id: 'opt', color: '#292C83' },
    // Diffuseurs broadcast
    'TDF':              { id: 'tdf', color: '#003d7c' },
    'TOWERCAST':        { id: 'twc', color: '#e8511a' },
    'ITAS TIM':         { id: 'ita', color: '#6ab04c' },
    // Fallback
    'MISC':             { id: 'misc', color: '#555555' },
  },

  // Exploitants Free pour lesquels RNC Mobile est disponible
  freeOperators: new Set(['FREE MOBILE', 'FREE CARAIBES', 'TELCO OI']),

  // Systèmes considérés "mobile" pour Cellmapper
  mobileSystems: new Set([
    'GSM 900','GSM 1800',
    'UMTS 900','UMTS 2100',
    'LTE 700','LTE 800','LTE 900','LTE 1800','LTE 2100','LTE 2600',
    '5G NR 700','5G NR 2100','5G NR 3500','5G NR 26000',
    'NR 700','NR 2100','NR 3500',
  ]),

  // ── Actions mensuelles ───────────────────────────────────────────────────
  // Pour modifier l'icône d'une action : changer le champ "icon"
  // (nom du fichier SVG sans extension dans /icons/mensu/)
  // Pour modifier le libellé affiché : changer le champ "label"
  actions: {
    AJO:  { label: 'Ajout de station',          icon: 'ajo'  },
    SUP:  { label: 'Suppression de station',     icon: 'sup'  },
    AJA:  { label: 'Antenne ajoutée',            icon: 'aja'  },
    SUA:  { label: 'Antenne supprimée',          icon: 'sua'  },
    AJE:  { label: 'Émetteur ajouté',            icon: 'aje'  },
    SUE:  { label: 'Émetteur supprimé',          icon: 'sue'  },
    AJB:  { label: 'Bande ajoutée',              icon: 'ajb'  },
    SUB:  { label: 'Bande supprimée',            icon: 'sub'  },
    ACT:  { label: 'Activation',                 icon: 'act'  },
    CHZ:  { label: 'Azimut modifié',             icon: 'chz'  },
    CHY:  { label: "Type d'antenne modifié",     icon: 'chy'  },
    CHX:  { label: 'Dimensions antenne',         icon: 'chx'  },
    CHS:  { label: 'Système modifié',            icon: 'chs'  },
    CHH:  { label: 'Hauteur modifiée',           icon: 'chh'  },
    CHP:  { label: 'Propriétaire modifié',       icon: 'chp'  },
    CHA:  { label: 'Adresse modifiée',           icon: 'cha'  },
    CHN:  { label: 'Nature modifiée',            icon: 'chn'  },
    CHD:  { label: 'Date de service modifiée',   icon: 'chd'  },
    MISC: { label: 'Modification',               icon: 'misc' },
  },

  unitLabels: { M: 'MHz', K: 'kHz', G: 'GHz' },

  sysOrder: [
    'FM','DAB','DAB+','AM','TNT','DVB-T2','DVB-T','FH',
    'PMR','TETRAPOL','TETRA',
    'GSM 900','GSM 1800','UMTS 900','UMTS 2100',
    'LTE 700','LTE 800','LTE 900','LTE 1800','LTE 2100','LTE 2600',
    '5G NR 700','5G NR 2100','5G NR 3500','5G NR 26000',
    'NR 700','NR 2100','NR 3500',
  ],

  fieldLabels: {
    nat:'Nature', haut:'Hauteur (m)', prop:'Propriétaire', exp:'Exploitant',
    lieu:'Lieu', adr:'Adresse', cp:'Code postal', insee:'INSEE',
    dt_impl:'Date implantation', dt_mod:'Date modification', dt_svc:'Date service',
    type:"Type d'antenne", dim:'Dimension (m)', ray:'Rayon',
    az:'Azimut (°)', alt:'Altitude bas (m)', sys:'Système',
  },
};

// ── Helpers exportés ─────────────────────────────────────────────────────────

/** Retourne la config exploitant (ou fallback MISC). Insensible à la casse. */
export function getOperator(name) {
  if (!name) return CONFIG.operators['MISC'];
  const key = name.trim().toUpperCase();
  if (CONFIG.operators[key]) return CONFIG.operators[key];
  for (const [k, v] of Object.entries(CONFIG.operators)) {
    if (k === 'MISC') continue;
    if (key.includes(k) || k.includes(key)) return v;
  }
  return CONFIG.operators['MISC'];
}

/** MCC/MNC pour Cellmapper, avec gestion spéciale TELCO OI (Réunion/Mayotte). */
export function getCellmapperMccMnc(opName, adresse) {
  const op = getOperator(opName);
  if (opName === 'TELCO OI' && adresse) {
    const m = adresse.match(/\b(974\d{2}|976\d{2})\b/);
    if (m) {
      return m[1].startsWith('976')
        ? { mcc: op.mcc1, mnc: op.mnc1 }
        : { mcc: op.mcc2, mnc: op.mnc2 };
    }
    return { mcc: op.mcc1 || 'NaN', mnc: op.mnc1 || 'NaN' };
  }
  return { mcc: op.mcc ?? 'NaN', mnc: op.mnc ?? 'NaN' };
}

/** Code d'action principal d'un objet diff (premier de la liste act, ou AJO/SUP). */
export function getPrimaryAction(type, data) {
  if (type === 'add') return 'AJO';
  if (type === 'del') return 'SUP';
  return (data.act && data.act.length > 0) ? data.act[0] : 'MISC';
}
