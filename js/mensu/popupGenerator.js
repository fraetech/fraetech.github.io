// mensu/popupGenerator.js
// Structure calquée sur hebdo/popupGenerator.js :
//   popup-operator-bg  (fond logo exploitant)
//     bandeau          (couleur exploitant + lien ANFR + STA_NM_ANFR)
//     popup-content-wrapper
//       icone-container  (Cartoradio / GMaps / RNC / Cellmapper / Carte-FH / Partage)
//       titre            (adresse)
//       contenu          (actions / diff hiérarchique)
//       titre footer     (nature · hauteur · propriétaire)
import { CONFIG, getOperator, getCellmapperMccMnc, getPrimaryAction } from './config.js';

export class PopupGenerator {

  // ── Systèmes ─────────────────────────────────────────────────────────────

  static sortSys(arr) {
    return [...arr].sort((a, b) => {
      const ia = CONFIG.sysOrder.indexOf(a), ib = CONFIG.sysOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
  }

  static sysBadge(s) { return `<span class="sys-chip">${s}</span>`; }
  static sysBadges(arr) { return this.sortSys(arr).map(s => this.sysBadge(s)).join(' '); }

  static hasMobileSystem(d) {
    const allSys = this._collectAllSys(d);
    return allSys.some(s => CONFIG.mobileSystems.has(s));
  }

  static _collectAllSys(d) {
    const sys = [];
    const fromAnts = ants => ants.forEach(a =>
      (a.emr || a.emetteurs || []).forEach(e => { const s = e.sys||e.systeme; if(s) sys.push(s); })
    );
    fromAnts(d.ant || d.antennes || d['ant+'] || []);
    fromAnts(d['ant-'] || []);
    (d['ant~'] || []).forEach(a => {
      (a.ctx?.sys || []).forEach(s => sys.push(s));
      (a['emr+'] || []).forEach(e => { if(e.sys) sys.push(e.sys); });
      (a['emr-'] || []).forEach(e => { if(e.sys) sys.push(e.sys); });
      (a['emr~'] || []).forEach(e => { if(e.sys) sys.push(e.sys); });
    });
    return sys;
  }

  // ── Bandeau (identique à hebdo) ──────────────────────────────────────────

  static generateBandeau(d, lat, lon) {
    const op = getOperator(d.exp || d.exploitant);
    const link = `https://data.anfr.fr/visualisation/map/?id=observatoire_2g_3g_4g&location=17,${lat},${lon}`;
    return `<div class="bandeau" style="background-color:${op.color};">
      <a href="${link}" target="_blank" rel="noopener">Support n°${d.sta}</a>
    </div>`;
  }

  // ── Icônes services (aligné hebdo) ───────────────────────────────────────

  static generateIcons(d, lat, lon) {
    const base = CONFIG.baseIconUrl;
    const expName = (d.exp || d.exploitant || '').trim();
    const adresse = d.adr || d.adresse || '';
    const isFree = CONFIG.freeOperators.has(expName.toUpperCase());
    const hasMobile = this.hasMobileSystem(d);
    const icons = [];

    icons.push(`<a href="https://cartoradio.fr/index.html#/cartographie/lonlat/${lon}/${lat}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}cartoradio.svg" alt="Cartoradio"></a>`);
    icons.push(`<a href="https://www.google.fr/maps/place/${lat},${lon}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}maps.svg" alt="Google Maps"></a>`);

    if (isFree) {
      icons.push(`<a href="https://rncmobile.net/site/${lat},${lon}" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}rnc.avif" alt="RNC Mobile"></a>`);
    }

    if (hasMobile) {
      const { mcc, mnc } = getCellmapperMccMnc(expName, adresse);
      icons.push(`<a href="https://www.cellmapper.net/map?MCC=${mcc}&MNC=${mnc}&type=LTE&latitude=${lat}&longitude=${lon}&zoom=16" target="_blank" rel="noopener" class="icone"><img loading="lazy" src="${base}cellmapper.avif" alt="Cellmapper"></a>`);
    }

    icons.push(`<a href="#" onclick="shareLocation('${d.sta}'); return false;" class="icone" title="Partager ce support"><img loading="lazy" src="${base}share.svg" alt="Partager"></a>`);

    return `<div class="icone-container">${icons.join('')}</div>`;
  }

  // ── Titre (adresse) ──────────────────────────────────────────────────────

  static generateTitre(d) {
    // Badges d'actions mensuelles (équivalent ZB/Site neuf chez hebdo)
    const acts = d.act || [];
    const badges = acts.map(code => {
      const cfg = CONFIG.actions[code] || CONFIG.actions.MISC;
      return `<span class="popup-badge popup-badge--action">${cfg.label}</span>`;
    });
    const badgeHtml = badges.length
      ? `<br><span class="popup-badge-row">${badges.join('')}</span>`
      : '';

    const adresse = [d.lieu, d.adr || d.adresse].filter(Boolean).join(', ')
      || d.cp || d.insee || '—';

    return `<div class="titre"><strong>${adresse}</strong>${badgeHtml}</div>`;
  }

  // ── Footer (nature · hauteur · propriétaire) — identique à hebdo ─────────

  static generateFooter(d) {
    const parts = [
      d.nat || d.nature || '—',
      d.haut != null ? `${d.haut} m` : null,
      d.prop || d.proprietaire || null,
    ].filter(Boolean);
    return `<div class="titre">${parts.join(' · ')}</div>`;
  }

  // ── Helpers diff ─────────────────────────────────────────────────────────

  static bandLine(b) {
    const fd = b.fd ?? b.f_debut, ff = b.ff ?? b.f_fin;
    const u = CONFIG.unitLabels[b.u || b.unite] || b.u || b.unite || '';
    return `<div class="band-line">↝ ${fd} – ${ff} ${u}</div>`;
  }

  static diffRow(key, avant, apres) {
    const label = CONFIG.fieldLabels[key] || key;
    return `<div class="diff-row">
      <span class="diff-key">${label}</span>
      <span class="diff-old">${avant ?? '∅'}</span>
      <span class="diff-arrow">→</span>
      <span class="diff-new">${apres ?? '∅'}</span>
    </div>`;
  }

  static renderEmetteur(e, cls = '') {
    const sys = e.sys || e.systeme || '';
    const dt = e.dt_svc || e.date_service || '';
    const bandes = e.ban || e.bandes || [];
    return `<div class="emr-block ${cls}">
      <div class="emr-title">
        ${sys ? this.sysBadge(sys) : ''}
        ${dt ? `<span style="color:#888;font-size:11px">${dt}</span>` : ''}
      </div>
      ${bandes.map(b => this.bandLine(b)).join('')}
    </div>`;
  }

  static renderAntenne(a, cls = '') {
    const aer = a.aer || a.aer_id || '';
    const type = a.type || a.type_antenne || '';
    const az = a.az ?? a.azimut;
    const alt = a.alt ?? a.alt_bas;
    const dim = a.dim ?? a.dimension;
    const emrs = a.emr || a.emetteurs || [];
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
      ${sysSet.size ? `<div style="margin-bottom:4px">${this.sysBadges([...sysSet])}</div>` : ''}
      ${emrs.map(e => this.renderEmetteur(e)).join('')}
    </div>`;
  }

  static renderAntenneMod(a) {
    const ctx = a.ctx || {};
    const metaParts = [
      ctx.type,
      ctx.az != null ? `Az. ${ctx.az}°` : '',
      ctx.alt != null ? `Alt. ${ctx.alt} m` : '',
      ctx.dim != null ? `Dim. ${ctx.dim} m` : '',
    ].filter(Boolean).join(' · ');
    let html = `<div class="ant-block">
      <div class="ant-title">Antenne ${a.aer}</div>
      ${metaParts ? `<div class="ant-meta">${metaParts}</div>` : ''}
      ${ctx.sys?.length ? `<div style="margin-bottom:5px">${this.sysBadges(ctx.sys)}</div>` : ''}`;
    if (a.diff) {
      for (const [k, [av, ap]] of Object.entries(a.diff)) html += this.diffRow(k, av, ap);
    }
    if (a['emr+']?.length) {
      html += `<div class="label-sm added">+ Émetteurs ajoutés</div>`;
      html += a['emr+'].map(e => this.renderEmetteur(e, 'added')).join('');
    }
    if (a['emr-']?.length) {
      html += `<div class="label-sm deleted">- Émetteurs supprimés</div>`;
      html += a['emr-'].map(e => this.renderEmetteur(e, 'deleted')).join('');
    }
    if (a['emr~']?.length) {
      html += `<div class="label-sm modified">~ Émetteurs modifiés</div>`;
      a['emr~'].forEach(e => { html += this.renderEmetteurMod(e); });
    }
    html += '</div>';
    return html;
  }

  static renderEmetteurMod(e) {
    const sysLabel = e.diff?.sys ? `${e.diff.sys[0]} → ${e.diff.sys[1]}` : (e.sys || '?');
    let html = `<div class="emr-block"><div class="emr-title">${this.sysBadge(sysLabel)}</div>`;
    if (e.diff) {
      for (const [k, [av, ap]] of Object.entries(e.diff)) {
        if (k === 'sys') continue;
        html += this.diffRow(k, av, ap);
      }
    }
    if (e['ban+']?.length) html += `<div class="label-sm added">+ Bandes</div>` + e['ban+'].map(b => this.bandLine(b)).join('');
    if (e['ban-']?.length) html += `<div class="label-sm deleted">- Bandes</div>` + e['ban-'].map(b => this.bandLine(b)).join('');
    html += '</div>';
    return html;
  }

  // ── Contenu (bloc central : champs diff + antennes) ──────────────────────

  static generateContenu(type, d) {
    let html = '<div class="contenu">';

    if (type === 'add') {
      const ants = d.ant || d.antennes || [];
      if (ants.length) {
        html += `<div class="action-groupe">
          <div class="action-titre">${ants.length} antenne${ants.length > 1 ? 's' : ''} :</div>
          ${ants.map(a => this.renderAntenne(a)).join('')}
        </div>`;
      }
    }

    else if (type === 'del') {
      const ants = d.ant || d.antennes || [];
      if (ants.length) {
        html += `<div class="action-groupe">
          <div class="action-titre">${ants.length} antenne${ants.length > 1 ? 's' : ''} (supprimée${ants.length > 1 ? 's' : ''}) :</div>
          ${ants.map(a => this.renderAntenne(a, 'deleted')).join('')}
        </div>`;
      }
    }

    else { // mod
      if (d.diff && Object.keys(d.diff).length) {
        html += `<div class="action-groupe">
          <div class="action-titre modified">Champs modifiés :</div>
          ${Object.entries(d.diff).map(([k,[av,ap]]) => this.diffRow(k, av, ap)).join('')}
        </div>`;
      }
      if (d['ant+']?.length) {
        html += `<div class="action-groupe">
          <div class="action-titre added">+ ${d['ant+'].length} antenne${d['ant+'].length>1?'s':''} ajoutée${d['ant+'].length>1?'s':''} :</div>
          ${d['ant+'].map(a => this.renderAntenne(a, 'added')).join('')}
        </div>`;
      }
      if (d['ant-']?.length) {
        html += `<div class="action-groupe">
          <div class="action-titre deleted">- ${d['ant-'].length} antenne${d['ant-']?.length>1?'s':''} supprimée${d['ant-'].length>1?'s':''} :</div>
          ${d['ant-'].map(a => this.renderAntenne(a, 'deleted')).join('')}
        </div>`;
      }
      if (d['ant~']?.length) {
        html += `<div class="action-groupe">
          <div class="action-titre modified">~ ${d['ant~'].length} antenne${d['ant~'].length>1?'s':''} modifiée${d['ant~'].length>1?'s':''} :</div>
          ${d['ant~'].map(a => this.renderAntenneMod(a)).join('')}
        </div>`;
      }
    }

    html += '</div>';
    return html;
  }

  // ── Point d'entrée public ────────────────────────────────────────────────

  static generate(type, d) {
    const lat = d.lat, lon = d.lon;
    const op = getOperator(d.exp || d.exploitant);
    const logoUrl = `${CONFIG.baseIconUrl}opes/L_${op.id}.avif`;

    return `<div class="popup-operator-bg" style="--logo-url: url('${logoUrl}');">
      ${this.generateBandeau(d, lat, lon)}
      <div class="popup-content-wrapper">
        ${this.generateIcons(d, lat, lon)}
        ${this.generateTitre(d)}
        ${this.generateContenu(type, d)}
        ${this.generateFooter(d)}
      </div>
    </div>`;
  }

  // Aliases pour compatibilité avec dataStore.js
  static generateAddDel(type, d) { return this.generate(type, d); }
  static generateMod(d)          { return this.generate('mod', d); }
}
