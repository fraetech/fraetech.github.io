// config.js
export const CONFIG = {
  operators: {
    'ORANGE': { id: 'ora', color: '#FD7B02', mcc: 208, mnc: 1 },
    'FREE MOBILE': { id: 'fmb', color: '#6D6E71', mcc: 208, mnc: 15 },
    'SFR': { id: 'sfr', color: '#E40012', mcc: 208, mnc: 10 },
    'BOUYGUES TELECOM': { id: 'byt', color: '#009BCE', mcc: 208, mnc: 20 },
    'TELCO OI': { id: 'fmb', color: '#6D6E71', mcc1: 647, mnc1: 2, mcc2: 647, mnc2: 3 },
    'SRR': { id: 'sfr', color: '#E40012', mcc: 647, mnc: 10 },
    'FREE CARAIBES': { id: 'fmb', color: '#6D6E71', mcc: 340, mnc: 4 },
    'ZEOP': { id: 'zop', color: '#681260', mcc: 647, mnc: 4 },
    'DIGICEL': { id: 'dig', color: '#E4002B', mcc: 340, mnc: 20 },
    'Gouv Nelle Calédonie (OPT)': { id: 'opt', color: '#292C83' },
    'OUTREMER TELECOM': { id: 'ott', color: '#DE006F' },
    'PMT/VODAFONE': { id: 'pmt', color: '#FF0E00', mcc: 547, mnc: 15 },
    // ONATI (Polynésie Française)
    // VITI (Polynésie Française)
    // BPT/SPT (Wallis & Futuna)
    // SPM (St-Pierre-et-Miquelon)
    // GLOBALTEL (St-Pierre-et-Miquelon)
    // Dauphin Telecom (St-Martin)
    // UTS Caraïbes (St-Martin)
    'MISC': { id: 'misc', color: '#000000' }
  },
  actions: {
    'ALL': 'Activation fréquence',
    'AAV': 'Activation prévisionnelle',
    'AJO': 'Ajout fréquence',
    'SUP': 'Suppression fréquence',
    'EXT': 'Extinction fréquence',
    'CHI': 'Changement identifiant support',
    'CHA': 'Changement adresse',
    'CHL': 'Changement localisation',
    'CHT': 'Changement type support',
    'CHH': 'Changement hauteur support',
    'CHP': 'Changement propriétaire support'
  },
  technologies: {
    'GSM': 'GSM (2G)',
    'UMTS': 'UMTS (3G)',
    'LTE': 'LTE (4G)',
    '5G NR': 'NR (5G)'
  },
  techOrder: ['GSM', 'UMTS', 'LTE', '5G NR'],
  baseIconUrl: 'https://fraetech.github.io/icons/',
  baseDataUrl: 'https://fraetech.github.io/files/'
};
