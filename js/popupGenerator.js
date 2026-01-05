import { CONFIG } from './config.js';

export class PopupGenerator {
  static generate(actionsData) {
      if (!actionsData || actionsData.length === 0) return '';
      
      const firstAction = actionsData[0];
      const [lat, lon] = firstAction.coordonnees.split(',').map(s => s.trim());
      
      // Récupère ID opérateur et URL logo GitHub
      const opConfig = CONFIG.operators[firstAction.operateur] || CONFIG.operators['MISC'];
      const logoUrl = `${CONFIG.baseIconUrl}opes/L_${opConfig.id}.avif`;

      // Retourner directement le contenu sans div wrapper supplémentaire
      const content = `
          <div class="popup-operator-bg" style="--logo-url: url('${logoUrl}');">
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

  static generateBandeau(firstAction, lat, lon) {
    const color = CONFIG.operators[firstAction.operateur]?.color || '#000000';
    const link = `https://data.anfr.fr/visualisation/map/?id=observatoire_2g_3g_4g&location=17,${lat},${lon}`;
    return `<div class="bandeau" style="background-color:${color};">
      <a href="${link}" target="_blank" rel="noopener">Support n°${firstAction.id_support}</a>
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
    
    // Bouton partage
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

    // Actions qui affichent le champ "infos" au lieu de "technologie"
    const infosActions = {
      'CHI': { label: 'Ancien identifiant', position: 'above' },
      'CHA': { label: 'Ancienne adresse', position: 'above' },
      'CHL': { label: 'Ancienne localisation', position: 'above' },
      'CHT': { label: 'Ancien type', position: 'below' },
      'CHH': { label: 'Ancienne hauteur', position: 'below' },
      'CHP': { label: 'Ancien propriétaire', position: 'below' }
    };

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
      else if (infosActions[actionType]) {
        // Pour les actions de changement, afficher le champ "infos" avec meilleure lisibilité
        const actionInfo = infosActions[actionType];
        const positionNote = actionInfo.position === 'above' 
          ? '(Nouvelle valeur juste au-dessus)'
          : '(Nouvelle valeur juste en-dessous)';
        
        html += `<div class="action-groupe">
          <div class="action-titre">${actionTitle} :</div>
          <div>${actions.map(a => `${actionInfo.label} :<br><strong>${a.infos || 'N/A'}</strong><br><br><em>${positionNote}</em>`).join('<br>')}</div>
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