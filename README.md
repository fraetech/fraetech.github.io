# FRAETECH.GITHUB.IO
Vous trouverez sur [ce site](https://fraetech.github.io/) chaque semaine plusieurs cartes répertoriant toutes les modifications des antennes-relais déclarées par les opérateurs de téléphonie mobile auprès de l’Agence Nationale des Fréquences (ANFR), en France.

## Description
Ce projet se distingue par son automatisation complète : toutes les mises à jour sont générées automatiquement, ce qui rend la publication plus rapide (et m’évite de cliquer frénétiquement tous les jeudis aprèm' ou vendredis midi selon l'humeur de l'ANFR :D).

Sur la carte, toutes les technologies sont représentées (de la 2G à la 5G) ainsi que tous les opérateurs, en fonction des modifications déclarées chaque semaine.

Vous pouvez filtrer les données par :
- **Technologie** (2G, 3G, 4G, 5G, …) ;
- **Fréquence** (700 MHz, 1800 MHz, 3500 MHz, …) ;
- **Opérateur** (Orange, SFR, Bouygues, Free, …) ;
- **Action** (Ajout d’un site, activation, suppression, …)
- **Zone Blanche** (sites faisant partie du dispositif de couverture ciblée du *New Deal Mobile*) ;
- **Sites neufs** (un site activé pour la toute première fois).

### Icônes utilisées
*La couleur de l’icône change selon l’opérateur !*

- **Activation déclarée en avance** : l’opérateur a indiqué qu’une fréquence/un site allait être activé à une date future (par "site", comprendre "station de base") ;
![Activation déclarée en avance](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_aav.avif)

- **Ajout site/fréquence** : ajout d’une fréquence sur un site existant ou déclaration d’un nouveau site ;
![Ajout site/fréquence](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_ajo.avif)

- **Activation site/fréquence** : activation d’une fréquence sur un site existant ou activation d’un nouveau site ;
![Activation site/fréquence](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_all.avif)

- **Changement d’adresse** : l’adresse ANFR du site concerné a changé ;
![Changement d'adresse](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_cha.avif)

- **Changement de numéro de support** : le numéro de support ANFR a été modifié (souvent synonyme de modification de hauteur, de type de support, ou arrivée prochaine d’un nouvel opérateur) ;
![Changement de numéro de support](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_chi.avif)

- **Changement de position (coordonnées GPS)** : les coordonnées GPS du site ont changé ;
![Changement de position](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_chl.avif)

- **Extinction site/fréquence** : une fréquence (ou un site entier) a été éteint ;
![Extinction site/fréquence](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_ext.avif)

- **Suppression site/fréquence** : une fréquence (ou un site entier) a été supprimé ;
![Suppression site/fréquence](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt_sup.avif)

- **Plusieurs actions à la fois** : quand tout part en vrille ;
![Plusieurs actions](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/icons/byt.avif)

### Popups et options
En cliquant sur une icône, un popup affiche le détail de la modification :
- Le **numéro de support** *(+ lien vers data.anfr.fr)* ;
- Un **lien Cartoradio** ;
- Un **lien Google Maps** ;
- Une **option de partage** pour envoyer la modif à votre fan d'antenne préféré ;
- Un lien vers le *très bon* site [RNC Mobile](https://rncmobile.net/) (pour Free Mobile, Telco OI ou Free Caraïbes).

On retrouve aussi l’adresse du site, le détail de(s) modification(s), le type de support, sa hauteur et son propriétaire.

### Recherche et historique
- Utilisez la loupe (sous le +/-) pour chercher une adresse, un numéro de support ou une antenne précise.
- La date de la mise à jour en cours est indiquée dans le popup qui s’affiche à l’arrivée.
- Pour les modifications plus anciennes, rendez-vous dans l’[historique](https://fraetech.github.io/history.html).
- Il existe aussi des cartes propres à chacun des 4 grands opérateurs de France métropolitaine (liens dans le popup d’accueil).

## Code source
Oui, le code est dispo !
- Le *front* est sur [ce repo](https://github.com/fraetech/fraetech.github.io) (où vous êtes en ce moment-même d'ailleurs)
- Le *back* est par ici -> [anfr_hebdo](https://github.com/fraetech/anfr_hebdo)

## Contribuer
Tout dépend du type de contribution :
- **Remonter un bug / suggestion** → utilisez le menu "Issues".
- **Modifier le code source** → *fork*, modif, *pull request*. Rien de sorcier ! :D

## Licence
Le projet est sous la licence [GNU GPL-v3](./LICENSE). Consultez le fichier LICENSE pour plus de détails.

## Contact
Pour toute autre raison (ou juste pour dire coucou :p), vous pouvez me joindre via :
- Mes réseaux (Bluesky, Mastodon, Discord, et consorts…)
- Ou par mail : [fraetech@free.fr](mailto:fraetech@free.fr)

Bonne visite, et n’hésitez pas à partager la bonne adresse si elle vous a rendu service !

## Avancé
Pour les plus curieux (ou les *data nerds* qui veulent faire parler les chiffres), je mets aussi à disposition les fichiers CSV bruts utilisés par le site et générés à chaque MAJ ANFR (généralement le jeudi apm, parfois le vendredi midi, plus rarement le lundi (quand une MAJ a été sautée pour x ou y raison)).
Ils contiennent les différences publiées par l’ANFR, avec un fichier par grand opérateur français et un fichier global qui regroupe toutes les modifs (y compris DROM/COM).

Vous pouvez donc les utiliser pour :
- faire vos propres cartes,
- nourrir vos scripts maison,
- ou simplement les collectionner (chacun son hobby, qui suis-je pour juger…).

Les fichiers sont disponibles en *raw* :
- [Index](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/files/hebdo/index.csv) (toutes les modifs)
- [Bouygues Telecom](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/files/hebdo/bouygues.csv)
- [Free Mobile](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/files/hebdo/free.csv) (inclut Telco OI, Free Caraïbes)
- [Orange](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/files/hebdo/orange.csv)
- [SFR](https://raw.githubusercontent.com/fraetech/maj-hebdo/refs/heads/data/files/hebdo/sfr.csv) (inclut SRR)

Le header, commun aux fichiers est le suivant :
```id_support,operateur,action,technologie,adresse,code_insee,coordonnees,type_support,hauteur_support,proprietaire_support,date_activ,is_zb,is_new```

### Description des champs
- `id_support` : identifiant ANFR du support *(int)*
- `operateur` : opérateur concerné par la modif *(str)*
- `action` : action réalisée *(str)* :
  - AAV = déclaration en avance
  - AJO = ajout site/fréquence
  - ACT = activation site/fréquence
  - CHA = changement d’adresse
  - CHI = changement support id
  - CHL = changement coordonnées GPS
  - EXT = extinction site/fréquence
  - SUP = suppression site/fréquence
- `technologie` : fréquence(s) concernée(s) *(str)*
- `adresse` : adresse concaténée avec CP et ville *(str)*
- `code_insee` : code INSEE de la commune *(int)*
- `coordonnees` : latitude/longitude du site *(str)*
- `type_support` : type de support (déjà traduit de l’ANFR, parce que je suis sympa) *(str)*
- `hauteur_support` : hauteur en mètres du support *(str)*
- `proprietaire_support` : propriétaire du support *(str)*
- `date_activ` : surtout utile pour les AAV, date prévue d’activation *(YYYY-MM-DD)*
- `is_zb` : le site fait partie (True) ou non (False) du dispositif **New Deal Mobile** *(bool)*
- `is_new` : site neuf (True, première activation) ou non (False) *(bool)*

Voili voilou :))