import { CONFIG } from './config.js';

export class PopupGenerator {
  static generate(actionsData, lat, lon) {
    if (!actionsData || actionsData.length === 0) return '';

    const firstAction = actionsData[0];

    // lat/lon passés directement depuis dataStore (déjà parsés), fallback sur split si absent
    if (lat === undefined || lon === undefined) {
      [lat, lon] = firstAction.coordonnees.split(',').map(s => parseFloat(s.trim()));
    }

    const opConfig = CONFIG.operators[firstAction.operateur] || CONFIG.operators['MISC'];
    const logoUrl = `${CONFIG.baseIconUrl}opes/L_${opConfig.id}.avif`;

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
    
    icons.push(`<a href="#" onclick="shareLocation('${firstAction.id_support}', '${firstAction.operateur}'); return false;" class="icone" title="Partager ce support"><img loading="lazy" src="${base}share.svg" alt="Partager"></a>`);
    
    return `<div class="icone-container">${icons.join('')}</div>`;
  }

  static generateTitle(firstAction) {
    const badges = [];
    if (firstAction.is_zb === 'true') {
      badges.push(`<span class="popup-badge popup-badge--zb">ZB</span>`);
    }
    if (firstAction.is_new === 'true') {
      badges.push(`<span class="popup-badge popup-badge--new">Site neuf</span>`);
    }
    const badgeHtml = badges.length
      ? `<br><span class="popup-badge-row">${badges.join('')}</span>`
      : '';
    return `<div class="titre"><strong>${firstAction.adresse}</strong>${badgeHtml}</div>`;
  }

  static escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  static formatDate(value) {
    if (!value) return '';
    return String(value)
      .replace(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g,
        (_, year, month, day) => `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`)
      .replace(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g,
        (_, day, month, year) => `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`);
  }

  static parseAzimuths(value) {
    if (!value) return [];
    const matches = String(value).match(/-?\d+(?:\.\d+)?/g) || [];
    return [...new Set(matches.map(item => Number.parseFloat(item))
      .filter(angle => Number.isFinite(angle))
      .map(angle => ((angle % 360) + 360) % 360))];
  }

  static formatAzimuthList(value) {
    return this.parseAzimuths(value).map(angle => `${angle}°`).join(' · ');
  }

  static lightenColor(color, amount = 0.55) {
    const match = String(color || '').match(/^#([\da-f]{6})$/i);
    if (!match) return '#9aa4ad';
    const channels = match[1].match(/[\da-f]{2}/gi).map(value => parseInt(value, 16));
    return `#${channels.map(channel => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0')).join('')}`;
  }

  static azimuthEntries(value) {
    return String(value || '').split(';').map(part => {
      const separator = part.indexOf(':');
      if (separator < 0) return { label: '', value: part.trim() };
      return { label: part.slice(0, separator).trim(), value: part.slice(separator + 1).trim() };
    }).filter(entry => entry.value);
  }

  static parseAzimuthChanges(actionsData) {
    const changes = [];
    const pattern = /CHZ\s*\((?:(?:fréquences|frequences):\s*([^)]*)|site)\s*\)\s*:\s*([^;]+?)\s*->\s*([^;]+)/gi;
    actionsData.filter(action => action.action === 'CHZ').forEach(action => {
      let match;
      const infos = String(action.infos || '');
      while ((match = pattern.exec(infos)) !== null) {
        changes.push({
          frequency: (match[1] || 'Site').trim(),
          oldValue: match[2].trim(),
          newValue: match[3].trim()
        });
      }
      pattern.lastIndex = 0;
    });
    return changes;
  }

  static generateAzimuthChangeDetails(actionsData) {
    const changes = this.parseAzimuthChanges(actionsData);
    if (!changes.length) return '';
    const changeSignatures = new Set(changes.map(change => [
      this.parseAzimuths(change.oldValue).join('|'),
      this.parseAzimuths(change.newValue).join('|')
    ].join('->')));
    if (changeSignatures.size === 1) {
      const change = changes[0];
      const oldValue = this.escapeHtml(this.formatAzimuthList(change.oldValue));
      const newValue = this.escapeHtml(this.formatAzimuthList(change.newValue));
      const oldAngles = this.parseAzimuths(change.oldValue);
      const newAngles = this.parseAzimuths(change.newValue);
      const oldSet = new Set(oldAngles);
      const newSet = new Set(newAngles);
      const noteText = oldAngles.length > newAngles.length
        ? (oldAngles.length - newAngles.length > 1 ? 'Secteurs supprimés' : 'Secteur supprimé')
        : oldAngles.length < newAngles.length
          ? (newAngles.length - oldAngles.length > 1 ? 'Secteurs ajoutés' : 'Secteur ajouté')
          : [...oldSet].some(angle => !newSet.has(angle))
            ? 'Secteurs modifiés'
            : '';
      const note = noteText ? ` <span class="azimut-change-note">(${noteText})</span>` : '';
      return `<div class="azimut-change-details azimut-change-details--simple">
        <div class="azimut-change-heading">Changement d’azimut commun aux fréquences</div>
        <div class="azimut-change-summary"><span class="azimut-old">${oldValue}</span><span class="azimut-arrow">→</span><span class="azimut-new">${newValue}</span>${note}</div>
      </div>`;
    }
    const rows = (field, className) => changes.map(change => `
      <div class="azimut-change-row">
        <span class="azimut-change-frequency">${this.escapeHtml(change.frequency)}</span>
        <span class="azimut-change-value ${className}">${this.escapeHtml(this.formatAzimuthList(change[field]))}</span>
      </div>`).join('');
    return `<div class="azimut-change-details">
      <div class="azimut-change-heading">Azimuts concernés</div>
      <div class="azimut-change-table" data-azimut-mode="old">${rows('oldValue', 'azimut-old')}</div>
      <div class="azimut-change-table" data-azimut-mode="new" hidden>${rows('newValue', 'azimut-new')}</div>
      <button type="button" class="azimut-toggle" data-azimut-mode="old" aria-pressed="false">Afficher les nouveaux azimuts</button>
    </div>`;
  }

  static generateAzimuthDiagram(value) {
    const entries = this.azimuthEntries(value);
    if (!entries.length || !entries.some(entry => this.parseAzimuths(entry.value).length)) return '';
    const size = 112;
    const center = size / 2;
    const radius = 42;
    const sectors = [];
    const arrows = [];
    const colors = ['#1677b8', '#e67e22', '#2e9f5b', '#8e44ad', '#c0392b'];

    const point = (angle, distance) => {
      const radians = (angle - 90) * Math.PI / 180;
      return [center + Math.cos(radians) * distance, center + Math.sin(radians) * distance];
    };
    const sectorPath = (angle, color) => {
      const start = point(angle - 60, radius);
      const end = point(angle + 60, radius);
      return `<path class="azimut-secteur" d="M ${center} ${center} L ${start[0].toFixed(1)} ${start[1].toFixed(1)} A ${radius} ${radius} 0 0 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)} Z" fill="${color}"/>`;
    };

    entries.forEach((entry, index) => {
      const color = colors[index % colors.length];
      this.parseAzimuths(entry.value).forEach(angle => {
        sectors.push(sectorPath(angle, color));
        const [x, y] = point(angle, radius + 5);
        arrows.push(`<line class="azimut-fleche azimut-fleche-overlay" x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}"/>`);
      });
    });

    const labels = entries.map((entry, index) => `<span class="azimut-legende"><i style="background:${colors[index % colors.length]}"></i>${this.escapeHtml(entry.label ? `${entry.label}: ` : '')}${this.escapeHtml(entry.value)}°</span>`).join('');
    return `<div class="azimut-bloc"><div class="azimut-titre">Azimuts</div><div class="azimut-rendu"><svg class="azimut-diagramme" viewBox="0 0 ${size} ${size}" role="img" aria-label="Diagramme des azimuts"><defs><marker id="azimut-pointe" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M 0 0 L 5 2.5 L 0 5 z" fill="context-stroke"/></marker></defs><circle class="azimut-cercle" cx="${center}" cy="${center}" r="${radius}"/>${sectors.join('')}${arrows.join('')}<circle class="azimut-centre" cx="${center}" cy="${center}" r="2.5"/></svg><div class="azimut-valeurs">${labels}</div></div></div>`;
  }

  static generateAzimuthOverlay(actionsData) {
    const changes = this.parseAzimuthChanges(actionsData);
    const values = actionsData
      .map(action => action.liste_azimut || action.list_azimut_last || '')
      .filter(Boolean);
    const value = values.find(item => item) || '';
    const entries = this.azimuthEntries(value);
    if (!entries.some(entry => this.parseAzimuths(entry.value).length)) return '';

    const size = 120;
    const center = size / 2;
    const radius = 47;
    const operatorColor = CONFIG.operators[actionsData[0]?.operateur]?.color || '#718096';
    const unchangedColor = this.lightenColor(operatorColor);
    const oldAngles = new Set(changes.flatMap(change => this.parseAzimuths(change.oldValue)));
    const newAngles = new Set(changes.flatMap(change => this.parseAzimuths(change.newValue)));
    const currentAngles = new Set(entries.flatMap(entry => this.parseAzimuths(entry.value)));
    const angleStates = changes.length
      ? new Map([...new Set([...oldAngles, ...newAngles, ...currentAngles])].map(angle => [
        angle,
        oldAngles.has(angle) && !newAngles.has(angle) ? { color: '#d64545', label: 'supprimé' } :
        !oldAngles.has(angle) && newAngles.has(angle) ? { color: '#2e9f5b', label: 'ajouté' } :
        { color: unchangedColor, label: 'inchangé' }
      ]))
      : new Map([...currentAngles].map(angle => [angle, { color: operatorColor, label: '' }]));
    const point = (angle, distance) => {
      const radians = (angle - 90) * Math.PI / 180;
      return [center + Math.cos(radians) * distance, center + Math.sin(radians) * distance];
    };
    const sectors = [];
    const arrows = [];
    const labels = [];
    [...angleStates.keys()].sort((a, b) => a - b).forEach(angle => {
      const state = angleStates.get(angle);
      const color = state.color;
        const start = point(angle - 60, radius);
        const end = point(angle + 60, radius);
        sectors.push(`<path class="azimut-secteur" d="M ${center} ${center} L ${start[0].toFixed(1)} ${start[1].toFixed(1)} A ${radius} ${radius} 0 0 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)} Z" fill="${color}" stroke="${color}"/>`);
        const [x, y] = point(angle, radius + 9);
        const [left, right] = [point(angle - 7, radius + 1), point(angle + 7, radius + 1)];
        arrows.push(`<line class="azimut-fleche" x1="${center}" y1="${center}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}"/><polygon class="azimut-pointe" points="${x.toFixed(1)},${y.toFixed(1)} ${left[0].toFixed(1)},${left[1].toFixed(1)} ${right[0].toFixed(1)},${right[1].toFixed(1)}" fill="${color}"/>`);
        const [labelX, labelY] = point(angle, radius + 19);
        labels.push(`<text class="azimut-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" fill="${color}">${angle}°</text>`);
    });

    return `<svg class="azimut-overlay" viewBox="0 0 ${size} ${size}" aria-hidden="true">${sectors.join('')}${arrows.join('')}${labels.join('')}<circle class="azimut-centre" cx="${center}" cy="${center}" r="2.5"/></svg>`;
  }

  static generateAzimuths(actionsData) {
    if (actionsData.some(action => action.action === 'CHZ')) return '';
    const value = actionsData.find(action => action.liste_azimut || action.list_azimut_last);
    const entries = this.azimuthEntries(value?.liste_azimut || value?.list_azimut_last || '');
    if (entries.length <= 1 || !entries.some(entry => entry.label)) return '';
    const labels = entries.map(entry => `<span class="azimut-legende">${this.escapeHtml(entry.label)}: ${this.escapeHtml(this.formatAzimuthList(entry.value))}</span>`).join('');
    return `<div class="azimut-actions"><div class="azimut-titre">Azimuts par fréquence</div><div class="azimut-valeurs">${labels}</div></div>`;
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
      'CHP': { label: 'Ancien propriétaire', message: 'Nouveau propriétaire ci-dessous.' },
      'CHZ': { label: 'Ancien azimut', message: 'Nouvel azimut représenté ci-dessous.' }
    };

    let html = '<div class="contenu">';

    for (const [actionType, actions] of Object.entries(actionsByType)) {
      const actionTitle = CONFIG.actions[actionType] || actionType;

      if (actionType === 'ALL') {
        html += `<div class="action-groupe">
          <div class="action-titre">Activation fréquence :</div>
          <div>${actions.map(a => {
            let dateBrackets = '';
            if (a.date_activ) dateBrackets = ` [Activation le : ${this.formatDate(a.date_activ)}]`;
            return `${this.escapeHtml(a.technologie)}<br>${dateBrackets}`;
          }).join('<br>')}</div>
        </div>`;
      }

      else if (actionType === 'AAV') {
        html += `<div class="action-groupe">
          <div class="action-titre">Activation prévisionnelle :</div>
          <div>${actions.map(a => {
            let dateBrackets = '';
            if (a.date_activ) dateBrackets = ` [Activation prévue le : ${this.formatDate(a.date_activ)}]`;
            return `${this.escapeHtml(a.technologie)}<br>${dateBrackets}`;
          }).join('<br>')}</div>
        </div>`;
      }

      else if (actionType === 'AJR') {
        html += `<div class="action-groupe">
          <div class="action-titre">Ajout et activation rattrapée :</div>
          <div>${actions.map(a => {
            let dateBrackets = '';
            if (a.date_activ) dateBrackets = ` [Déclaré actif depuis le : ${this.formatDate(a.date_activ)}]`;
            return `${this.escapeHtml(a.technologie)}<br>${dateBrackets}`;
          }).join('<br>')}</div>
        </div>`;
      }
      
      else if (actionType === 'ART') {
        html += `<div class="action-groupe">
          <div class="action-titre">Activation rattrapée :</div>
          <div>${actions.map(a => {
            let dateBrackets = '';
            if (a.date_activ) dateBrackets = ` [Déclaré actif depuis le : ${this.formatDate(a.date_activ)}]`;
            return `${this.escapeHtml(a.technologie)}<br>${dateBrackets}`;
          }).join('<br>')}</div>
        </div>`;
      }

      else if (actionType === 'CHZ') {
        html += this.generateAzimuthChangeDetails(actions);
      }

      else if (infosActions[actionType]) {

        const actionInfo = infosActions[actionType];

        html += `<div class="action-groupe">
          <div class="action-titre">${actionTitle} :</div>
          <div>
            ${actions.map(a => `
              ${actionInfo.label} :<br>
              <strong>${this.escapeHtml(a.infos || 'N/A')}</strong>
              ${actionInfo.message ? `<br><br><em>${actionInfo.message}</em>` : ``}
            `).join('<br>')}
          </div>
        </div>`;
      }

      else {
        html += `<div class="action-groupe">
          <div class="action-titre">${actionTitle} :</div>
          <div>${actions.map(a => this.escapeHtml(a.technologie)).join('<br>')}</div>
        </div>`;
      }
    }

    html += '</div>';
    html += this.generateAzimuths(actionsData);
    return html;
  }

  static generateFooter(firstAction) {
    return `<div class="titre">${firstAction.type_support} - ${firstAction.hauteur_support} - ${firstAction.proprietaire_support}</div>`;
  }
}

// Lazy load logos après insertion du popup
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.azimut-toggle');
    if (!button) return;
    const container = button.closest('.azimut-change-details');
    if (!container) return;
    const currentMode = button.dataset.azimutMode === 'new' ? 'new' : 'old';
    const nextMode = currentMode === 'old' ? 'new' : 'old';
    container.querySelectorAll('.azimut-change-table').forEach(table => {
      table.hidden = table.dataset.azimutMode !== nextMode;
    });
    button.dataset.azimutMode = nextMode;
    button.setAttribute('aria-pressed', String(nextMode === 'new'));
    button.textContent = nextMode === 'old' ? 'Afficher les nouveaux azimuts' : 'Afficher les anciens azimuts';
  });
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