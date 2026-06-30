// core/utils.js - utilitaires généraux partagés entre toutes les variantes
export const Utils = {
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
  }
};
