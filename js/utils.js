// utils.js - utilitaires généraux
export const Utils = {
  csvToRows(text) {
    if (!text) return [];
    // Ignore BOMs and normalize line endings
    const clean = text.replace(/^\uFEFF/, '').trim();
    const lines = clean.split(/\r?\n/);
    if (lines.length <= 1) return [];
    const header = lines.shift();
    
    // Parse header to determine column indices dynamically
    const headers = header.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    const columnMap = {};
    headers.forEach((h, i) => {
      columnMap[h] = i;
    });

    
    return lines.map(line => {
      let values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));

      // Some generated rows leave commas in `infos` unquoted. Recover the
      // expected columns by locating the standalone azimuth list near the end.
      if (values.length > headers.length && columnMap.infos !== undefined) {
        const fixedPrefix = values.slice(0, columnMap.infos);
        const trailingFlags = values.slice(-2);
        const middle = values.slice(columnMap.infos, -2);
        const azimuthIndex = middle.findIndex(value =>
          /^\s*-?\d+(?:\|\s*-?\d+)*\s*$/.test(value)
        );

        if (azimuthIndex > 0) {
          values = [
            ...fixedPrefix,
            middle.slice(0, azimuthIndex).join(','),
            middle[azimuthIndex],
            ...middle.slice(azimuthIndex + 1),
            ...trailingFlags
          ];
        } else {
          values = [
            ...fixedPrefix,
            middle.slice(0, -2).join(','),
            ...middle.slice(-2),
            ...trailingFlags
          ];
        }
      }

        const valueFor = (...names) => {
          for (const name of names) {
            if (columnMap[name] !== undefined && values[columnMap[name]]) {
              return values[columnMap[name]];
            }
          }
          return '';
        };
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
        date_activ: valueFor('date_activ', 'date_modif'),
        date_modif: valueFor('date_modif'),
        liste_azimut: valueFor('liste_azimut', 'list_azimut', 'list_azimut_last', 'azimut', 'azimuth'),
        list_azimut_old: valueFor('list_azimut_old', 'liste_azimut_old'),
        list_azimut_last: valueFor('list_azimut_last', 'liste_azimut_last'),
        infos: valueFor('infos'),
        is_zb: valueFor('is_zb').toLowerCase().trim() || 'false',
        is_new: valueFor('is_new').toLowerCase().trim() || 'false'
      };
    });
  },

  extractBaseTech(tech) {
    return tech.replace(/\s*\d{3,4}$/, '').trim();
  },

  extractFreq(tech) {
    return (tech.match(/(\d{3,4})$/) || [])[1] || null;
  },

  // Charge un script externe de manière asynchrone, avec fallback local
  loadScript(src, { module = false, integrity = null, crossOrigin = null, fallback = null } = {}) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      if (module) s.type = 'module';
      s.src = src;
      if (integrity) s.integrity = integrity;
      if (crossOrigin) s.crossOrigin = crossOrigin;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        if (fallback) {
          const s2 = document.createElement('script');
          s2.src = fallback;
          s2.async = true;
          s2.onload = () => resolve();
          s2.onerror = () => reject(new Error('Both script and fallback failed: ' + src));
          document.head.appendChild(s2);
        } else {
          reject(new Error('Script load failed: ' + src));
        }
      };
      document.head.appendChild(s);
    });
  },

  loadCss(href, { preload = false } = {}) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('CSS load failed: ' + href));
      document.head.appendChild(link);
    });
  },

  debounce(fn, wait = 200) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  safeParseFloatPair(coordString) {
    if (!coordString) return [NaN, NaN];
    const parts = coordString.split(',').map(s => parseFloat(s.trim()));
    return parts.length >= 2 ? [parts[0], parts[1]] : [NaN, NaN];
  },

  makeUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const csvPath = params.get('csv');
    const baseUrl = (csvPath ? csvPath : 'hebdo/index');
    return {
      csvUrl: `${CONFIG.baseDataUrl}${baseUrl}.csv?t=${Date.now()}`,
      timestampUrl: `${CONFIG.baseDataUrl}${baseUrl.replace('index','timestamp')}.txt?t=${Date.now()}`
    };
  }
};
