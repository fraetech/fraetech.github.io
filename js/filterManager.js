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
    // Build DOM containers expected by control (these exist inside the control markup created in app.js)
    const opContainer = document.getElementById('opFilters');
    const techContainer = document.getElementById('technoFilters');
    const freqContainer = document.getElementById('freqFilters');
    const actionContainer = document.getElementById('actionFilters');
    const zbContainer = document.getElementById('zbFilter');
    const newSiteContainer = document.getElementById('newSiteFilter');

    // Operators (sorted)
    const sortedOps = [...this.dataStore.filterValues.operateurs].sort();
    sortedOps.forEach(op => this.createCheckbox(opContainer, op, 'operateurs', op));

    // Techs in predefined order
    const sortedTechs = [...this.dataStore.filterValues.technos].sort((a,b) => {
      const order = this.dataStore.mapManager ? (window.CONFIG?.techOrder || []) : [];
      return order.indexOf(a) - order.indexOf(b);
    });
    sortedTechs.forEach(tech => this.createCheckbox(techContainer, tech, 'technos', window.CONFIG?.technologies?.[tech] || tech));

    // Freqs numeric sort
    const sortedFreqs = [...this.dataStore.filterValues.freqs].map(Number).sort((a,b)=>a-b).map(String);
    sortedFreqs.forEach(freq => this.createCheckbox(freqContainer, freq, 'freqs', freq + ' MHz'));

    // Actions
    [...this.dataStore.filterValues.actions].sort().forEach(action => this.createCheckbox(actionContainer, action, 'actions', window.CONFIG?.actions?.[action] || action));

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
    if (!container) return;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.checked = true;
    checkbox.addEventListener('change', () => this.updateFilters());
    label.appendChild(checkbox);
    label.append(' ' + displayName);
    container.appendChild(label);

    // Initialize active filters sets
    this.dataStore.activeFilters[filterType].add(value);
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
    // Collect checkboxes
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

    // Radio groups
    const zbRadio = document.querySelector('input[name="zoneBlanche"]:checked');
    const zbVals = zbRadio?.value === 'all' ? new Set(['true','false']) : new Set([zbRadio.value]);
    this.dataStore.updateActiveFilters('zb', zbVals);

    const newRadio = document.querySelector('input[name="siteNeuf"]:checked');
    const newVals = newRadio?.value === 'all' ? new Set(['true','false']) : new Set([newRadio.value]);
    this.dataStore.updateActiveFilters('new', newVals);

    // Apply filters to map
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
    });
  }
}