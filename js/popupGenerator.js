import { CONFIG } from './config.js';

export class PopupGenerator {
  static generate(actionsData) {
      if (!actionsData || actionsData.length === 0) return '';
      
      const firstAction = actionsData[0];
      const [lat, lon] = firstAction.coordonnees.split(',').map(s => s.trim());
      
      // Récupère ID opérateur et URL logo GitHub
      const opConfig = CONFIG.operators[firstAction.operateur] || CONFIG.operators['MISC'];
      const logoUrl = `https://raw.githubusercontent.com/fraetech/fraetech.github.io/refs/heads/data/icons/opes/L_${opConfig.id}.avif`;
      
      // Générer les ampoules aléatoires
      const bulbsHtml = this.generateRandomBulbs();
      
      // Retourner directement le contenu sans div wrapper supplémentaire
      const content = `
          <div class="popup-operator-bg" style="--logo-url: url('${logoUrl}');">
              ${bulbsHtml}
              ${this.generateBandeau(firstAction, lat, lon)}
              <div class="popup-content-wrapper">
                  ${this.generateIcons(firstAction, lat, lon)}
                  ${this.generateTitle(firstAction)}
                  ${this.generateActions(actionsData)}
                  ${this.generateFooter(firstAction)}
              </div>
          </div>
      `;
      
      return content;
  }

  static generateRandomBulbs() {
    const numBulbs = Math.floor(Math.random() * 6) + 10; // 10 à 15 ampoules
    const numStars = Math.floor(Math.random() * 3) + 2; // 2 à 4 étoiles
    const numGifts = Math.floor(Math.random() * 3) + 1; // 1 à 3 cadeaux
    const colors = ['color1', 'color2', 'color3', 'color4', 'color5'];
    let html = '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 9999; overflow: visible;">';
    
    // Créer une grille pour bien répartir les ampoules
    const usedPositions = new Set();
    let addedBulbs = 0;
    
    for (let i = 0; i < numBulbs; i++) {
      let top, left, posKey;
      
      // Essayer de trouver une position qui n'est pas trop proche d'une autre
      let attempts = 0;
      do {
        top = Math.floor(Math.random() * 90) + 5; // 5% à 95%
        left = Math.floor(Math.random() * 90) + 5; // 5% à 95%
        posKey = Math.round(top / 15) + '-' + Math.round(left / 15); // Grille de 15%
        attempts++;
      } while (usedPositions.has(posKey) && attempts < 10);
      
      if (attempts < 10) {
        usedPositions.add(posKey);
        const color = colors[Math.floor(Math.random() * colors.length)];
        html += `<div class="popup-bulb ${color}" style="top: ${top}%; left: ${left}%; transform: translate(-50%, -50%);"></div>`;
        addedBulbs++;
      }
    }
    
    // Ajouter des étoiles ⭐
    for (let i = 0; i < numStars; i++) {
      let top, left, posKey;
      let attempts = 0;
      do {
        top = Math.floor(Math.random() * 90) + 5;
        left = Math.floor(Math.random() * 90) + 5;
        posKey = Math.round(top / 15) + '-' + Math.round(left / 15);
        attempts++;
      } while (usedPositions.has(posKey) && attempts < 10);
      
      if (attempts < 10) {
        usedPositions.add(posKey);
        html += `<div style="position: absolute; top: ${top}%; left: ${left}%; transform: translate(-50%, -50%); font-size: 16px; animation: starTwinkle 1.5s ease-in-out infinite;">⭐</div>`;
      }
    }
    
    // Ajouter des cadeaux 🎁
    for (let i = 0; i < numGifts; i++) {
      let top, left, posKey;
      let attempts = 0;
      do {
        top = Math.floor(Math.random() * 90) + 5;
        left = Math.floor(Math.random() * 90) + 5;
        posKey = Math.round(top / 15) + '-' + Math.round(left / 15);
        attempts++;
      } while (usedPositions.has(posKey) && attempts < 10);
      
      if (attempts < 10) {
        usedPositions.add(posKey);
        html += `<div style="position: absolute; top: ${top}%; left: ${left}%; transform: translate(-50%, -50%); font-size: 18px; animation: pulse 1s ease-in-out infinite;">🎁</div>`;
      }
    }
    
    html += '</div>';
    return html;
  }

  static generateBandeau(firstAction, lat, lon) {
    const color = CONFIG.operators[firstAction.operateur]?.color || '#000000';
    const link = `https://data.anfr.fr/visualisation/map/?id=observatoire_2g_3g_4g&location=17,${lat},${lon}`;
    return `<div class="bandeau-container">
      <div class="bandeau" style="background-color:${color};">
        <a href="${link}" target="_blank" rel="noopener">Support n°${firstAction.id_support}</a>
      </div>
      <div class="bandeau-bulb bandeau-bulb-1" style="animation: bulbTwinkle1 1.5s infinite;"></div>
      <div class="bandeau-bulb bandeau-bulb-2" style="animation: bulbTwinkle2 1.7s infinite 0.2s;"></div>
      <div class="bandeau-bulb bandeau-bulb-3" style="animation: bulbTwinkle3 1.9s infinite 0.4s;"></div>
    </div>`;
  }

  static generateIcons(firstAction, lat, lon) {
    const icons = [];
    const base = CONFIG.baseIconUrl;
    
    // Icônes existantes
    icons.push(`<a href="https://cartoradio.fr/index.html#/cartographie/lonlat/${lon}/${lat}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}cartoradio.avif" alt="Cartoradio"></a>`);
    icons.push(`<a href="https://www.google.fr/maps/place/${lat},${lon}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}maps.avif" alt="Google Maps"></a>`);
    
    if (['FREE MOBILE','TELCO OI'].includes(firstAction.operateur)) {
      icons.push(`<a href="https://rncmobile.net/site/${lat},${lon}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}rnc.avif" alt="RNC Mobile"></a>`);
    }
    
    // NOUVEAU : Bouton partage
    icons.push(`<button onclick="shareLocation('${lat}', '${lon}', '${firstAction.id_support}')" class="icone share-btn" title="Partager ce support"><img loading="lazy" src="${base}share.avif" alt="Partager"></button>`);
    
    return `<div class="icone-container">${icons.join('')}</div>`;
  }

  static generateTitle(firstAction) {
    return `<div class="titre"><strong>${firstAction.adresse}</strong></div>`;
  }

  static generateActions(actionsData) {
    const actionsByType = {};
    actionsData.forEach(action => {
      if (!actionsByType[action.action]) actionsByType[action.action] = [];
      actionsByType[action.action].push(action);
    });

    let html = '<div class="contenu">';
    for (const [actionType, actions] of Object.entries(actionsByType)) {
      const actionTitle = CONFIG.actions[actionType] || actionType;

      if (actionType === 'AAV') {
        html += `<div class="action-groupe">
          <div class="action-titre">Activation prévisionnelle :</div>
          <div>${actions.map(a => {
            let dateBrackets = '';
            if (a.date_activ) {
              const [y, m, d] = a.date_activ.split('-');
              dateBrackets = ` [Activation prévue le : ${d}/${m}/${y}]`;
            }
            return `${a.technologie}<br>${dateBrackets}`;
          }).join('<br>')}</div>
        </div>`;
      }
      else {
        html += `<div class="action-groupe">
          <div class="action-titre">${actionTitle} :</div>
          <div>${actions.map(a => a.technologie).join('<br>')}</div>
        </div>`;
      }
    }
    html += '</div>';

    return html;
  }

  static generateFooter(firstAction) {
    return `<div class="titre">${firstAction.type_support} - ${firstAction.hauteur_support} - ${firstAction.proprietaire_support}</div>`;
  }
}

// Lazy load logos après insertion du popup
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('popupopen', (e) => {
    const popupEl = e.popup.getElement();
    if (popupEl) {
      const bg = popupEl.querySelector('.popup-operator-bg');
      if (bg && bg.dataset.logo) {
        bg.style.setProperty('--logo-url', `url("${bg.dataset.logo}")`);
      }
    }
  });
});