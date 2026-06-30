// mensu/popupGenerator.js
import { CONFIG } from './config.js';

export class PopupGenerator {
  static sortSys(arr) {
    return [...arr].sort((a, b) => {
      const ia = CONFIG.sysOrder.indexOf(a), ib = CONFIG.sysOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  static sysBadge(s) {
    return `<span class="sys-chip">${s}</span>`;
  }

  static sysBadges(arr) {
    return this.sortSys(arr).map(s => this.sysBadge(s)).join(' ');
  }

  static bandLine(b) {
    const fd = b.fd ?? b.f_debut, ff = b.ff ?? b.f_fin;
    const u = CONFIG.unitLabels[b.u || b.unite] || b.u || b.unite || '';
    return `<div class="band-line">↝ ${fd} – ${ff} ${u}</div>`;
  }

  static infoTable(rows) {
    const trs = rows
      .filter(([, v]) => v != null && v !== '')
      .map(([l, v]) => `<tr><td>${l}</td><td><b>${v}</b></td></tr>`)
      .join('');
    return trs ? `<table class="info">${trs}</table>` : '';
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

  static generateAddDel(type, d) {
    const ants = d.ant || d.antennes || [];
    const typeCls = `badge-${type}`;

    let html = `<div class="popup-header">
      <div class="popup-sta">${d.sta}</div>
      <div class="popup-exp">${d.exp || d.exploitant || '—'} <span class="popup-type-badge ${typeCls}">${CONFIG.typeLabels[type]}</span></div>
      <div class="popup-meta">${[d.nat || d.nature, d.haut ? `${d.haut} m` : ''].filter(Boolean).join(' · ')}</div>
    </div>`;

    html += `<div class="popup-body">`;
    html += this.infoTable([
      ['Propriétaire', d.prop || d.proprietaire],
      ['Lieu', d.lieu],
      ['Adresse', d.adr || d.adresse],
      ['CP / INSEE', [d.cp || d.code_postal, d.insee].filter(Boolean).join(' / ')],
      ['Lat / Lon', d.lat != null ? `${d.lat}, ${d.lon}` : null],
      ['Date implantation', d.dt_impl || d.date_implantation],
      ['Date service', d.dt_svc || d.date_service],
    ]);

    if (ants.length) {
      html += `<div class="popup-section">
        <div class="popup-section-title">${ants.length} antenne${ants.length > 1 ? 's' : ''}</div>
        ${ants.map(a => this.renderAntenne(a)).join('')}
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  static generateMod(d) {
    let html = `<div class="popup-header">
      <div class="popup-sta">${d.sta}</div>
      <div class="popup-exp">${d.exp || '—'} <span class="popup-type-badge badge-mod">Modification</span></div>
      <div class="popup-meta">${[d.nat, d.haut ? `${d.haut} m` : ''].filter(Boolean).join(' · ')}</div>
    </div>`;

    html += `<div class="popup-body">`;

    const adresseStr = [d.lieu, d.adr, d.cp && d.insee ? `${d.cp} (${d.insee})` : (d.cp || d.insee)].filter(Boolean).join(', ');
    if (adresseStr) html += `<div style="font-size:12px;color:#555;margin-bottom:8px">📍 ${adresseStr}</div>`;

    if (d.diff && Object.keys(d.diff).length) {
      html += `<div class="popup-section"><div class="popup-section-title modified">Champs modifiés</div>`;
      for (const [k, [av, ap]] of Object.entries(d.diff)) {
        html += this.diffRow(k, av, ap);
      }
      html += '</div>';
    }

    if (d['ant+']?.length) {
      html += `<div class="popup-section">
        <div class="popup-section-title added">+ ${d['ant+'].length} antenne${d['ant+'].length > 1 ? 's' : ''} ajoutée${d['ant+'].length > 1 ? 's' : ''}</div>
        ${d['ant+'].map(a => this.renderAntenne(a, 'added')).join('')}
      </div>`;
    }

    if (d['ant-']?.length) {
      html += `<div class="popup-section">
        <div class="popup-section-title deleted">- ${d['ant-'].length} antenne${d['ant-'].length > 1 ? 's' : ''} supprimée${d['ant-'].length > 1 ? 's' : ''}</div>
        ${d['ant-'].map(a => this.renderAntenne(a, 'deleted')).join('')}
      </div>`;
    }

    if (d['ant~']?.length) {
      html += `<div class="popup-section">
        <div class="popup-section-title modified">~ ${d['ant~'].length} antenne${d['ant~'].length > 1 ? 's' : ''} modifiée${d['ant~'].length > 1 ? 's' : ''}</div>`;
      d['ant~'].forEach(a => { html += this.renderAntenneMod(a); });
      html += '</div>';
    }

    html += `</div>`;
    return html;
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
      for (const [k, [av, ap]] of Object.entries(a.diff)) {
        html += this.diffRow(k, av, ap);
      }
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
    if (e['ban+']?.length) {
      html += `<div class="label-sm added">+ Bandes</div>` + e['ban+'].map(b => this.bandLine(b)).join('');
    }
    if (e['ban-']?.length) {
      html += `<div class="label-sm deleted">- Bandes</div>` + e['ban-'].map(b => this.bandLine(b)).join('');
    }
    html += '</div>';
    return html;
  }
}
