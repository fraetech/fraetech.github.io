// utils.js - utilitaires généraux
export const Utils = {
  csvToRows(text) {
    if (!text) return [];
    // Ignore BOMs and normalize line endings
    const clean = text.replace(/^\uFEFF/, '').trim();
    const lines = clean.split(/\r?\n/);
    if (lines.length <= 1) return [];
    const header = lines.shift();
    
    // Parse header to get column indices dynamically
    const headerValues = header.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    const columnIndex = {};
    headerValues.forEach((col, idx) => {
      columnIndex[col] = idx;
    });
    
    return lines.map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
      return {
        id_support: values[columnIndex['id_support']] || '',
        operateur: values[columnIndex['operateur']] || '',
        action: values[columnIndex['action']] || '',
        technologie: values[columnIndex['technologie']] || '',
        adresse: values[columnIndex['adresse']] || '',
        code_insee: values[columnIndex['code_insee']] || '',
        coordonnees: values[columnIndex['coordonnees']] || '',
        type_support: values[columnIndex['type_support']] || '',
        hauteur_support: values[columnIndex['hauteur_support']] || '',
        proprietaire_support: values[columnIndex['proprietaire_support']] || '',
        date_activ: values[columnIndex['date_activ']] || '',
        is_zb: (values[columnIndex['is_zb']] || 'false').toLowerCase().trim(),
        is_new: (values[columnIndex['is_new']] || 'false').toLowerCase().trim()
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
