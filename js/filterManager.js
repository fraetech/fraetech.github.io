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

  _createSubcategoryHeader(title, toggleBtn) {
    const header = document.createElement('div');
    header.className = 'filter-subcategory-header';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    header.appendChild(titleSpan);
    header.appendChild(toggleBtn);
    return header;
  }

  createFilterGroups() {
    const opContainer = document.getElementById('opFilters');
    const techContainer = document.getElementById('technoFilters');
    const freqContainer = document.getElementById('freqFilters');
    const actionContainer = document.getElementById('actionFilters');
    const zbContainer = document.getElementById('zbFilter');
    const newSiteContainer = document.getElementById('newSiteFilter');
    const advancedContainer = document.getElementById('advancedFilters');

    // === OPERATORS: Split into FR Métrop and DROM/COM ===
    const frMetropOps = ['BOUYGUES TELECOM', 'FREE MOBILE', 'ORANGE', 'SFR'];
    const sortedAllOps = [...this.dataStore.filterValues.operateurs].sort();
    const frOps = sortedAllOps.filter(op => frMetropOps.includes(op)).sort();
    const dromComOps = sortedAllOps.filter(op => !frMetropOps.includes(op)).sort();
    
    if (frOps.length > 0) {
      const frToggleBtn = document.createElement('button');
      frToggleBtn.className = 'toggle-subcategory-btn';
      frToggleBtn.textContent = 'Tout décocher'; // toutes cochées par défaut à l'init

      const frHeader = this._createSubcategoryHeader('France Métropolitaine', frToggleBtn);
      opContainer.appendChild(frHeader);

      const frGroup = document.createElement('div');
      frGroup.className = 'filter-subgroup';
      frGroup.style.marginBottom = '10px';
      opContainer.appendChild(frGroup);

      const frCheckboxes = [];
      frOps.forEach(op => {
        const chk = this.createCheckbox(frGroup, op, 'operateurs', op);
        if (chk) frCheckboxes.push(chk);
      });

      frToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = !frCheckboxes.some(chk => chk.checked);
        clearTimeout(this.updateTimeout);
        frCheckboxes.forEach(chk => {
          chk.checked = newState;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        });
        this.updateFilters();
        frToggleBtn.textContent = newState ? 'Tout décocher' : 'Tout cocher';
      });
    }
    
    if (dromComOps.length > 0) {
      const dromToggleBtn = document.createElement('button');
      dromToggleBtn.className = 'toggle-subcategory-btn';
      dromToggleBtn.textContent = 'Tout décocher';

      const dromHeader = this._createSubcategoryHeader('DROM/COM', dromToggleBtn);
      opContainer.appendChild(dromHeader);

      const dromGroup = document.createElement('div');
      dromGroup.className = 'filter-subgroup';
      dromGroup.style.marginBottom = '10px';
      opContainer.appendChild(dromGroup);

      const dromCheckboxes = [];
      dromComOps.forEach(op => {
        const chk = this.createCheckbox(dromGroup, op, 'operateurs', op);
        if (chk) dromCheckboxes.push(chk);
      });

      dromToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = !dromCheckboxes.some(chk => chk.checked);
        clearTimeout(this.updateTimeout);
        dromCheckboxes.forEach(chk => {
          chk.checked = newState;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        });
        this.updateFilters();
        dromToggleBtn.textContent = newState ? 'Tout décocher' : 'Tout cocher';
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

    // === ACTIONS: Split into Habituelles and Spéciales ===
    const habituellesActions = ['AJO','ALL','EXT','SUP','AAV', 'ART'];

    // Alias : si AJA ou AJR sont présents, leurs parents doivent apparaître dans les filtres
    const ALIAS_PARENTS = {
      'AJA': ['AJO', 'ALL'],
      'AJR': ['AJO', 'ART'],
    };
    Object.entries(ALIAS_PARENTS).forEach(([alias, parents]) => {
      if (this.dataStore.filterValues.actions.has(alias)) {
        parents.forEach(p => this.dataStore.filterValues.actions.add(p));
      }
    });
    
    const specialesActions = [...this.dataStore.filterValues.actions]
      .filter(a => a.startsWith('CH'))
      .sort();

    const ALIAS_ACTIONS = new Set(['AJA', 'AJR']);
    const otherActions = [...this.dataStore.filterValues.actions]
      .filter(a => !habituellesActions.includes(a) && !a.startsWith('CH') && !ALIAS_ACTIONS.has(a))
      .sort();

    // Sous-catégorie Actions habituelles
    const habCheckboxes = [];
    habituellesActions.forEach(action => {
      if (this.dataStore.filterValues.actions.has(action)) {
        const chk = this.createCheckbox(
          actionContainer,
          action,
          'actions',
          window.CONFIG?.actions?.[action] || action
        );
        if (chk) habCheckboxes.push(chk);
      }
    });

    // Sous-catégorie Spéciales (CH…)
    if (specialesActions.length > 0) {
      const specToggleBtn = document.createElement('button');
      specToggleBtn.className = 'toggle-subcategory-btn';
      specToggleBtn.textContent = 'Tout décocher';

      const specHeader = this._createSubcategoryHeader('Spéciales', specToggleBtn);
      actionContainer.appendChild(specHeader);

      const specGroup = document.createElement('div');
      specGroup.className = 'filter-subgroup';
      specGroup.style.marginBottom = '10px';
      actionContainer.appendChild(specGroup);

      const specCheckboxes = [];
      specialesActions.forEach(action => {
        const chk = this.createCheckbox(
          specGroup,
          action,
          'actions',
          window.CONFIG?.actions?.[action] || action
        );
        if (chk) specCheckboxes.push(chk);
      });

      specToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = !specCheckboxes.some(chk => chk.checked);
        clearTimeout(this.updateTimeout);
        specCheckboxes.forEach(chk => {
          chk.checked = newState;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        });
        this.updateFilters();
        specToggleBtn.textContent = newState ? 'Tout décocher' : 'Tout cocher';
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
    // Listener individuel — nécessaire car Leaflet bloque la propagation vers document
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

  createAdvancedMatrix() {
    const container = document.getElementById('advancedFilters');
    if (!container) return;

    const pairs = [...this.dataStore.filterValues.techFreqPairs];
    const techs = new Set();
    const freqs = new Set();

    pairs.forEach(pair => {
      const [tech, freq] = pair.split('_');
      techs.add(tech);
      freqs.add(freq);
    });

    const sortedTechs = CONFIG.techOrder.filter(
      tech => techs.has(tech)
    );
    const sortedFreqs = [...freqs].sort((a, b) => Number(a) - Number(b));

    let html = `
      <div class="filter-category-header">
        Filtres avancés
        <span class="tooltip-icon"
          title="Sélectionnez les couples technologie/fréquence souhaités. Les filtres Technologie et Fréquence classiques sont ignorés dans ce mode.">
          ⓘ
        </span>
      </div>
      <div class="advanced-help">
        Sélectionnez les couples technologie / fréquence à rechercher.
      </div>
      <table class="advanced-matrix">
        <thead>
          <tr><th></th>
          ${sortedFreqs.map(freq => `<th title="${freq} MHz">${freq}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${sortedTechs.map(tech => `
            <tr><th>${tech}</th>
              ${sortedFreqs.map(freq => {
                const pair = `${tech}_${freq}`;
                return `<td>${pairs.includes(pair)
                  ? `<input type="checkbox" class="advanced-pair" data-pair="${pair}">`
                  : ''}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="advanced-match-mode">
        <div class="filter-category-header">Correspondance</div>
        <label>
          <input type="radio" name="advancedMatchMode" value="contains" checked>
          Contient tous les couples
        </label>
        <span class="tooltip-icon"
          title="Le site doit contenir tous les couples sélectionnés mais peut en contenir d'autres.">ⓘ</span>
        <br>
        <label>
          <input type="radio" name="advancedMatchMode" value="exact">
          Correspondance exacte
        </label>
        <span class="tooltip-icon"
          title="Le site doit contenir exactement les couples sélectionnés.">ⓘ</span>
      </div>
    `;

    // Injection d'abord...
    container.innerHTML = html;

    // ...PUIS lecture de l'état et attachement des listeners
    this.dataStore.activeAdvancedPairs = new Set(
      [...container.querySelectorAll('.advanced-pair:checked')]
        .map(cb => cb.dataset.pair)
    );
    this.dataStore.advancedMatchMode =
      container.querySelector('input[name="advancedMatchMode"]:checked')?.value ?? 'contains';

    container.querySelectorAll('.advanced-pair, input[name="advancedMatchMode"]')
      .forEach(el => el.addEventListener('change', () => this.updateFilters()));
  }

  applyOperatorFilter(operateur) {
    const checkboxes = document.querySelectorAll('#opFilters input[type="checkbox"]');
    if (!checkboxes.length) return;

    // Vérifier que l'opé demandé existe bien dans les filtres
    const exists = [...checkboxes].some(cb => cb.value === operateur);
    if (!exists) return;

    checkboxes.forEach(cb => {
      cb.checked = (cb.value === operateur);
    });

    // Mettre à jour les labels "Tout cocher/décocher" des sous-catégories
    document.querySelectorAll('.toggle-subcategory-btn').forEach(btn => {
      const group = btn.closest('.filter-subcategory-header')?.nextElementSibling;
      if (!group) return;
      const groupCheckboxes = group.querySelectorAll('input[type="checkbox"]');
      const allChecked = [...groupCheckboxes].every(cb => cb.checked);
      btn.textContent = allChecked ? 'Tout décocher' : 'Tout cocher';
    });

    this.updateFilters();
  }

  updateAllToggleLabels() {
    // Bouton mère global
    document.dispatchEvent(new Event('filtersLabelUpdate'));

    // Boutons de catégorie (Techno, Freq, Op, Action) — ont data-category
    document.querySelectorAll('.toggle-category-btn[data-category]').forEach(btn => {
      const categoryId = btn.getAttribute('data-category');
      const container = document.getElementById(categoryId);
      if (!container) return;
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const anyChecked = Array.from(checkboxes).some(chk => chk.checked);
      btn.textContent = anyChecked ? 'Tout décocher' : 'Tout cocher';
    });

    // Boutons de sous-catégorie (France Métro, DROM/COM, Spéciales) — ont toggle-subcategory-btn
    document.querySelectorAll('.toggle-subcategory-btn').forEach(btn => {
      const group = btn.closest('.filter-subcategory-header')?.nextElementSibling;
      if (!group) return;
      const checkboxes = group.querySelectorAll('input[type="checkbox"]');
      const anyChecked = Array.from(checkboxes).some(chk => chk.checked);
      btn.textContent = anyChecked ? 'Tout décocher' : 'Tout cocher';
    });
  }

  updateFilters() {
    clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
      this._doUpdateFilters();
      this.updateAllToggleLabels();
    }, 120);
  }

  _doUpdateFilters() {
    const opVals = new Set();
    const technoVals = new Set();
    const freqVals = new Set();
    const actionVals = new Set();

    // Un seul parcours DOM pour toutes les checkboxes cochées
    document.querySelectorAll(
      '#opFilters input[type="checkbox"]:checked,' +
      '#technoFilters input[type="checkbox"]:checked,' +
      '#freqFilters input[type="checkbox"]:checked,' +
      '#actionFilters input[type="checkbox"]:checked'
    ).forEach(cb => {
      const group = cb.closest(
        '#opFilters, #technoFilters, #freqFilters, #actionFilters'
      )?.id;
      if (group === 'opFilters')     opVals.add(cb.value);
      else if (group === 'technoFilters') technoVals.add(cb.value);
      else if (group === 'freqFilters')   freqVals.add(cb.value);
      else if (group === 'actionFilters') actionVals.add(cb.value);
    });

    // AJA = alias de AJO + ALL
    if (actionVals.has('AJO') || actionVals.has('ALL')) actionVals.add('AJA');
    // AJR = alias de AJO + ART
    if (actionVals.has('AJO') || actionVals.has('ART')) actionVals.add('AJR');

    this.dataStore.updateActiveFilters('operateurs', opVals);
    this.dataStore.updateActiveFilters('technos', technoVals);
    this.dataStore.updateActiveFilters('freqs', freqVals);
    this.dataStore.updateActiveFilters('actions', actionVals);

    const zbRadio = document.querySelector('input[name="zoneBlanche"]:checked');
    this.dataStore.updateActiveFilters('zb',
      zbRadio?.value === 'all' ? new Set(['true', 'false']) : new Set([zbRadio?.value])
    );

    const newRadio = document.querySelector('input[name="siteNeuf"]:checked');
    this.dataStore.updateActiveFilters('new',
      newRadio?.value === 'all' ? new Set(['true', 'false']) : new Set([newRadio?.value])
    );

    const advancedMode =
      document.querySelector('input[name="filterMode"]:checked')?.value === 'advanced';

    this.dataStore.advancedFilterMode = advancedMode;

    const advancedContainer = document.getElementById('advancedFilters');

    if (advancedMode) {
      advancedContainer.classList.remove('hidden');
      advancedContainer.classList.add('expanded');
      if (!this._matrixBuilt) {
        this._matrixBuilt = true;
        setTimeout(() => this.createAdvancedMatrix(), 0);
      } else {
        this.dataStore.activeAdvancedPairs = new Set(
          [...document.querySelectorAll('.advanced-pair:checked')]
            .map(cb => cb.dataset.pair)
        );
        this.dataStore.advancedMatchMode =
          document.querySelector('input[name="advancedMatchMode"]:checked')?.value ?? 'contains';
      }
    } else {
      advancedContainer.classList.add('hidden');
      advancedContainer.classList.remove('expanded');
      this.dataStore.activeAdvancedPairs = new Set();
      this.dataStore.advancedMatchMode = 'contains';
    }

    document.querySelectorAll('#technoFilters input, #freqFilters input')
      .forEach(el => { el.disabled = advancedMode; });

    this.mapManager.updateMarkers(this.dataStore.getFilteredSupports());
  }

  resetAllFilters() {
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(cb => cb.checked = true);
    document.querySelectorAll('input[name="zoneBlanche"][value="all"], input[name="siteNeuf"][value="all"]').forEach(r => r.checked = true);
    this.updateFilters();
  }

  attachEvents() {
    document.addEventListener('change', (e) => {
      const el = e.target;

      if (el.type === 'radio' && el.name === 'filterMode') {
        this._doUpdateFilters();
        return;
      }

      if (el.type === 'radio' &&
          (el.name === 'zoneBlanche' || el.name === 'siteNeuf')) {
        this.updateFilters();
        return;
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('#resetFilters')) {
        e.stopPropagation();
        this.resetAllFilters();
      }
      if (e.target.matches('.filter-category')) {
        const group = e.target.nextElementSibling;
        if (group) {
          group.style.maxHeight = group.style.maxHeight ? null : group.scrollHeight + 'px';
        }
      }
    });
  }
}