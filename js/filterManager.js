// filterManager.js
export class FilterManager {
  constructor(dataStore, mapManager) {
    this.dataStore = dataStore;
    this.mapManager = mapManager;
    this.updateTimeout = null;
  }

  initFilters() {
    this.createFilterGroups();
    this.attachEvents();
  }

  createFilterGroups() {
    const opContainer = document.getElementById('opFilters');
    const techContainer = document.getElementById('technoFilters');
    const freqContainer = document.getElementById('freqFilters');
    const actionContainer = document.getElementById('actionFilters');
    const zbContainer = document.getElementById('zbFilter');
    const newSiteContainer = document.getElementById('newSiteFilter');

    // === OPERATORS: Split into FR Métrop and DROM/COM ===
    const frMetropOps = ['BOUYGUES TELECOM', 'FREE MOBILE', 'ORANGE', 'SFR'];
    const sortedAllOps = [...this.dataStore.filterValues.operateurs].sort();
    const frOps = sortedAllOps.filter(op => frMetropOps.includes(op)).sort();
    const dromComOps = sortedAllOps.filter(op => !frMetropOps.includes(op)).sort();
    
    if (frOps.length > 0) {
      const frHeader = document.createElement('div');
      frHeader.className = 'filter-category-header';
      frHeader.style.fontSize = '0.9em';
      frHeader.style.marginTop = '5px';
      const frTitle = document.createElement('span');
      frTitle.textContent = 'France Métropolitaine';
      frHeader.appendChild(frTitle);
      
      const frToggleBtn = document.createElement('button');
      frToggleBtn.className = 'toggle-subcategory-btn';
      frToggleBtn.textContent = 'Tout décocher';
      frToggleBtn.style.fontSize = '0.8em';
      frToggleBtn.style.padding = '2px 6px';
      frToggleBtn.style.cursor = 'pointer';
      frToggleBtn.style.border = '1px solid #ccc';
      frToggleBtn.style.background = '#fff';
      frToggleBtn.style.borderRadius = '3px';
      frHeader.appendChild(frToggleBtn);
      opContainer.appendChild(frHeader);
      
      const frCheckboxes = [];
      frOps.forEach(op => {
        const chk = this.createCheckbox(opContainer, op, 'operateurs', op);
        if (chk) frCheckboxes.push(chk);
      });
      
      frToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const allChecked = frCheckboxes.every(chk => chk.checked);
        frCheckboxes.forEach(chk => { 
          chk.checked = !allChecked; 
          chk.dispatchEvent(new Event('change')); 
        });
        frToggleBtn.textContent = allChecked ? 'Tout cocher' : 'Tout décocher';
      });
    }
    
    if (dromComOps.length > 0) {
      const dromHeader = document.createElement('div');
      dromHeader.className = 'filter-category-header';
      dromHeader.style.fontSize = '0.9em';
      dromHeader.style.marginTop = '5px';
      const dromTitle = document.createElement('span');
      dromTitle.textContent = 'DROM/COM';
      dromHeader.appendChild(dromTitle);
      
      const dromToggleBtn = document.createElement('button');
      dromToggleBtn.className = 'toggle-subcategory-btn';
      dromToggleBtn.textContent = 'Tout décocher';
      dromToggleBtn.style.fontSize = '0.8em';
      dromToggleBtn.style.padding = '2px 6px';
      dromToggleBtn.style.cursor = 'pointer';
      dromToggleBtn.style.border = '1px solid #ccc';
      dromToggleBtn.style.background = '#fff';
      dromToggleBtn.style.borderRadius = '3px';
      dromHeader.appendChild(dromToggleBtn);
      opContainer.appendChild(dromHeader);
      
      const dromCheckboxes = [];
      dromComOps.forEach(op => {
        const chk = this.createCheckbox(opContainer, op, 'operateurs', op);
        if (chk) dromCheckboxes.push(chk);
      });
      
      dromToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const allChecked = dromCheckboxes.every(chk => chk.checked);
        dromCheckboxes.forEach(chk => { 
          chk.checked = !allChecked; 
          chk.dispatchEvent(new Event('change')); 
        });
        dromToggleBtn.textContent = allChecked ? 'Tout cocher' : 'Tout décocher';
      });
    }

    // === TECHNOLOGIES ===
    const sortedTechs = [...this.dataStore.filterValues.technos].sort((a,b) => {
      const order = this.dataStore.mapManager ? (window.CONFIG?.techOrder || []) : [];
      return order.indexOf(a) - order.indexOf(b);
    });
    sortedTechs.forEach(tech => {
      this.createCheckbox(techContainer, tech, 'technos', window.CONFIG?.technologies?.[tech] || tech);
    });

    // === FREQUENCIES ===
    const sortedFreqs = [...this.dataStore.filterValues.freqs].map(Number).sort((a,b)=>a-b).map(String);
    sortedFreqs.forEach(freq => {
      this.createCheckbox(freqContainer, freq, 'freqs', freq + ' MHz');
    });

    // === ACTIONS ===
    const baseActions = ['AJO','ALL','EXT','SUP','AAV'];

    const changeActions = [...this.dataStore.filterValues.actions]
      .filter(a => a.startsWith('CH'))
      .sort();

    const otherActions = [...this.dataStore.filterValues.actions]
      .filter(a => !baseActions.includes(a) && !a.startsWith('CH'))
      .sort();

    // Base actions visible directement
    baseActions.forEach(action => {
      if (this.dataStore.filterValues.actions.has(action)) {
        this.createCheckbox(
          actionContainer,
          action,
          'actions',
          window.CONFIG?.actions?.[action] || action
        );
      }
    });

    // Sous-catégorie Changements divers (CH…)
    if (changeActions.length > 0) {
      const chHeader = document.createElement('div');
      chHeader.className = 'filter-category-header';
      chHeader.textContent = 'Changements divers';
      actionContainer.appendChild(chHeader);

      const chToggle = document.createElement('button');
      chToggle.className = 'toggle-subcategory-btn';
      chToggle.textContent = 'Tout décocher';
      chHeader.appendChild(chToggle);

      const chGroup = document.createElement('div');
      chGroup.className = 'filter-group';
      actionContainer.appendChild(chGroup);

      const chCheckboxes = [];
      changeActions.forEach(action => {
        const chk = this.createCheckbox(
          chGroup,
          action,
          'actions',
          window.CONFIG?.actions?.[action] || action
        );
        if (chk) chCheckboxes.push(chk);
      });

      chToggle.addEventListener('click', e => {
        e.stopPropagation();
        const allChecked = chCheckboxes.every(c => c.checked);
        chCheckboxes.forEach(c => {
          c.checked = !allChecked;
          c.dispatchEvent(new Event('change'));
        });
        chToggle.textContent = allChecked ? 'Tout cocher' : 'Tout décocher';
      });
    }

    // Autres actions éventuelles
    otherActions.forEach(action => {
      this.createCheckbox(
        actionContainer,
        action,
        'actions',
        window.CONFIG?.actions?.[action] || action
      );
    });

    // Radio groups
    this.createRadioGroup(zbContainer, 'zoneBlanche', [
      { value: 'all', label: 'Toutes' },
      { value: 'true', label: 'Zone blanche' },
      { value: 'false', label: 'Non zone blanche' }
    ]);
    this.createRadioGroup(newSiteContainer, 'siteNeuf', [
      { value: 'all', label: 'Tous' },
      { value: 'true', label: 'Site neuf' },
      { value: 'false', label: 'Site existant' }
    ]);
  }

  createCheckbox(container, value, filterType, displayName) {
    if (!container) return null;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.checked = true;
    checkbox.addEventListener('change', () => this.updateFilters());
    label.appendChild(checkbox);
    label.append(' ' + displayName);
    container.appendChild(label);

    this.dataStore.activeFilters[filterType].add(value);
    
    return checkbox;
  }

  createRadioGroup(container, name, options) {
    if (!container) return;
    options.forEach((opt, i) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = name;
      radio.value = opt.value;
      radio.checked = i === 0;
      radio.addEventListener('change', () => this.updateFilters());
      label.appendChild(radio);
      label.append(' ' + opt.label);
      container.appendChild(label);
    });
  }

  updateFilters() {
    clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => this._doUpdateFilters(), 120);
  }

  _doUpdateFilters() {
    const opVals = new Set();
    document.querySelectorAll('#opFilters input:checked').forEach(cb => opVals.add(cb.value));
    this.dataStore.updateActiveFilters('operateurs', opVals);

    const technoVals = new Set();
    document.querySelectorAll('#technoFilters input:checked').forEach(cb => technoVals.add(cb.value));
    this.dataStore.updateActiveFilters('technos', technoVals);

    const freqVals = new Set();
    document.querySelectorAll('#freqFilters input:checked').forEach(cb => freqVals.add(cb.value));
    this.dataStore.updateActiveFilters('freqs', freqVals);

    const actionVals = new Set();
    document.querySelectorAll('#actionFilters input:checked').forEach(cb => actionVals.add(cb.value));
    this.dataStore.updateActiveFilters('actions', actionVals);

    const zbRadio = document.querySelector('input[name="zoneBlanche"]:checked');
    const zbVals = zbRadio?.value === 'all' ? new Set(['true','false']) : new Set([zbRadio.value]);
    this.dataStore.updateActiveFilters('zb', zbVals);

    const newRadio = document.querySelector('input[name="siteNeuf"]:checked');
    const newVals = newRadio?.value === 'all' ? new Set(['true','false']) : new Set([newRadio.value]);
    this.dataStore.updateActiveFilters('new', newVals);

    const filtered = this.dataStore.getFilteredSupports();
    this.mapManager.updateMarkers(filtered);
  }

  resetAllFilters() {
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(cb => cb.checked = true);
    document.querySelectorAll('input[name="zoneBlanche"][value="all"], input[name="siteNeuf"][value="all"]').forEach(r => r.checked = true);
    this.updateFilters();
  }

  attachEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('#resetFilters')) {
        e.stopPropagation();
        this.resetAllFilters();
      }
      if (e.target.matches('.filter-category')) {
        const group = e.target.nextElementSibling;
        if (group) {
          group.style.maxHeight = group.style.maxHeight ? null : group.scrollHeight + "px";
        }
      }
      if (e.target.matches('.filter-category-header') && !e.target.closest('button')) {
        const group = e.target.nextElementSibling;
        if (group && group.classList.contains('filter-group')) {
          group.style.maxHeight = group.style.maxHeight ? null : group.scrollHeight + "px";
        }
      }
    });
  }
}