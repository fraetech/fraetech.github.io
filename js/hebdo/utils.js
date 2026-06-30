// hebdo/utils.js - utilitaires spécifiques à la variante hebdomadaire (parsing CSV)
import { Utils as CoreUtils } from '../core/utils.js';

export const Utils = {
  ...CoreUtils,

  csvToRows(text) {
    if (!text) return [];
    const clean = text.replace(/^\uFEFF/, '').trim();
    const lines = clean.split(/\r?\n/);
    if (lines.length <= 1) return [];
    const header = lines.shift();

    const headers = header.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    const columnMap = {};
    headers.forEach((h, i) => { columnMap[h] = i; });

    return lines.map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
      return {
        id_support: values[columnMap['id_support']],
        operateur: values[columnMap['operateur']],
        action: values[columnMap['action']],
        technologie: values[columnMap['technologie']],
        adresse: values[columnMap['adresse']],
        code_insee: values[columnMap['code_insee']],
        coordonnees: values[columnMap['coordonnees']],
        type_support: values[columnMap['type_support']],
        hauteur_support: values[columnMap['hauteur_support']],
        proprietaire_support: values[columnMap['proprietaire_support']],
        date_activ: values[columnMap['date_activ']] || '',
        infos: values[columnMap['infos']] || '',
        is_zb: values[columnMap['is_zb']]?.toLowerCase().trim() || 'false',
        is_new: values[columnMap['is_new']]?.toLowerCase().trim() || 'false'
      };
    });
  },

  extractBaseTech(tech) {
    return tech.replace(/\s*\d{3,4}$/, '').trim();
  },

  extractFreq(tech) {
    return (tech.match(/(\d{3,4})$/) || [])[1] || null;
  },

  makeUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const csvPath = params.get('csv');
    const baseUrl = (csvPath ? csvPath : 'hebdo/index');
    return {
      csvUrl: `${CONFIG.baseDataUrl}${baseUrl}.csv?t=${Date.now()}`,
      timestampUrl: `${CONFIG.baseDataUrl}${baseUrl.replace('index', 'timestamp')}.txt?t=${Date.now()}`
    };
  }
};
