// config.js
export const CONFIG = {
  operators: {
    'ORANGE': { id: 'ora', color: '#FD7B02' },
    'FREE MOBILE': { id: 'fmb', color: '#6D6E71' },
    'SFR': { id: 'sfr', color: '#E40012' },
    'BOUYGUES TELECOM': { id: 'byt', color: '#009BCE' },
    'TELCO OI': { id: 'fmb', color: '#6D6E71' },
    'SRR': { id: 'sfr', color: '#E40012' },
    'FREE CARAIBES': { id: 'fmb', color: '#6D6E71' },
    'ZEOP': { id: 'zop', color: '#681260' },
    'DIGICEL': { id: 'dig', color: '#E4002B' },
    'GOUV NELLE CALEDONIE (OPT)': { id: 'opt', color: '#292C83' },
    'OUTREMER TELECOM': { id: 'ott', color: '#DE006F' },
    'PMT/VODAFONE': { id: 'pmt', color: '#FF0E00' },
    'MISC': { id: 'misc', color: '#000000' }
  },
  actions: {
    'ALL': 'Activation fréquence',
    'AAV': 'Activation prévisionnelle',
    'AJO': 'Ajout fréquence',
    'SUP': 'Suppression fréquence',
    'EXT': 'Extinction fréquence'
  },
  technologies: {
    'GSM': 'GSM (2G)',
    'UMTS': 'UMTS (3G)',
    'LTE': 'LTE (4G)',
    '5G NR': 'NR (5G)'
  },
  techOrder: ['GSM', 'UMTS', 'LTE', '5G NR'],
  baseIconUrl: 'https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/',
  baseDataUrl: 'https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/files/'
};
