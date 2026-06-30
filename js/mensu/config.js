// mensu/config.js
export const CONFIG = {
  baseDataUrl: '/files/o-data-5w/',
  baseIconUrl: '/icons/',

  colors: { add: '#27ae60', del: '#e74c3c', mod: '#f39c12' },
  typeLabels: { add: 'Ajout', del: 'Suppression', mod: 'Modification' },

  unitLabels: { M: 'MHz', K: 'kHz', G: 'GHz' },

  // Ordre d'affichage souhaité pour les systèmes/technologies
  sysOrder: [
    'FM', 'DAB', 'DAB+', 'AM', 'TNT', 'DVB-T2', 'DVB-T', 'FH',
    'PMR', 'TETRAPOL', 'TETRA',
    'GSM 900', 'GSM 1800', 'UMTS 900', 'UMTS 2100',
    'LTE 700', 'LTE 800', 'LTE 900', 'LTE 1800', 'LTE 2100', 'LTE 2600',
    '5G NR 700', '5G NR 2100', '5G NR 3500', '5G NR 26000',
    'NR 700', 'NR 2100', 'NR 3500',
  ],

  fieldLabels: {
    nat: 'Nature', haut: 'Hauteur (m)', prop: 'Propriétaire', exp: 'Exploitant',
    lieu: 'Lieu', adr: 'Adresse', cp: 'Code postal', insee: 'INSEE',
    dt_impl: 'Date implantation', dt_mod: 'Date modification', dt_svc: 'Date service',
    lat: 'Latitude', lon: 'Longitude',
    type: 'Type antenne', dim: 'Dimension (m)', ray: 'Rayon', az: 'Azimut (°)', alt: 'Altitude bas (m)',
    sys: 'Système',
  },
};
