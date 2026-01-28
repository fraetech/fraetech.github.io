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

  static getCellmapperMccMnc(operateur, adresse) {
    const opConfig = CONFIG.operators[operateur];
    
    // Gestion spécifique pour TELCO OI
    if (operateur === 'TELCO OI') {
      const postalMatch = adresse.match(/\b(974\d{2}|976\d{2})\b/);
      if (postalMatch) {
        const postalCode = postalMatch[1];
        if (postalCode.startsWith('976')) {
          return { mcc: opConfig.mcc1, mnc: opConfig.mnc1 };
        } else if (postalCode.startsWith('974')) {
          return { mcc: opConfig.mcc2, mnc: opConfig.mnc2 };
        }
      }
      // Par défaut, utiliser mcc1/mnc1 si pas de code postal détecté
      return { mcc: opConfig.mcc1 || 'NaN', mnc: opConfig.mnc1 || 'NaN' };
    }
    
    // Pour les autres opérateurs
    return { 
      mcc: opConfig?.mcc || 'NaN', 
      mnc: opConfig?.mnc || 'NaN' 
    };
  }

  static generateIcons(firstAction, lat, lon) {
    const icons = [];
    const base = CONFIG.baseIconUrl;
    
    icons.push(`<a href="https://cartoradio.fr/index.html#/cartographie/lonlat/${lon}/${lat}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}cartoradio.svg" alt="Cartoradio"></a>`);
    icons.push(`<a href="https://www.google.fr/maps/place/${lat},${lon}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}maps.svg" alt="Google Maps"></a>`);
    
    if (['FREE MOBILE','TELCO OI'].includes(firstAction.operateur)) {
      icons.push(`<a href="https://rncmobile.net/site/${lat},${lon}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}rnc.avif" alt="RNC Mobile"></a>`);
    }
    
    const { mcc, mnc } = this.getCellmapperMccMnc(firstAction.operateur, firstAction.adresse);
    const cellmapperUrl = `https://www.cellmapper.net/map?MCC=${mcc}&MNC=${mnc}&type=LTE&latitude=${lat}&longitude=${lon}&zoom=16`;
    icons.push(`<a href="${cellmapperUrl}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}cellmapper.avif" alt="Cellmapper"></a>`);
    
    const carteFhUrl = `https://carte-fh.lafibre.info/index.php?no_sup_init=${firstAction.id_support}`;
    icons.push(`<a href="${carteFhUrl}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}carte-fh.avif" alt="Carte-FH"></a>`);
    
    icons.push(`<a href="#" onclick="shareLocation('${lat}', '${lon}', '${firstAction.id_support}'); return false;" class="icone" title="Partager ce support"><img loading="lazy" src="${base}share.svg" alt="Partager"></a>`);
    
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

    // Labels + messages souhaités
    const infosActions = {
      'CHI': { label: 'Ancien identifiant', message: 'Nouvel identifiant support en haut du pop-up.' },
      'CHA': { label: 'Ancienne adresse', message: 'Nouvelle adresse ci-dessus.' },
      'CHL': { label: 'Ancienne localisation', message: '' },
      'CHT': { label: 'Ancien type', message: 'Nouveau type de support ci-dessous.' },
      'CHH': { label: 'Ancienne hauteur', message: 'Nouvelle hauteur ci-dessous.' },
      'CHP': { label: 'Ancien propriétaire', message: 'Nouveau propriétaire ci-dessous.' }
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

        const actionInfo = infosActions[actionType];

        html += `<div class="action-groupe">
          <div class="action-titre">${actionTitle} :</div>
          <div>
            ${actions.map(a => `
              ${actionInfo.label} :<br>
              <strong>${a.infos || 'N/A'}</strong>
              ${actionInfo.message ? `<br><br><em>${actionInfo.message}</em>` : ``}
            `).join('<br>')}
          </div>
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