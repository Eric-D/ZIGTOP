// Hauteurs mesurées (px, impression, 673 px de large) : max sur 5 graines et toutes les options, + 4 %.
// FICHIER GÉNÉRÉ : ne pas modifier à la main. Pour le régénérer, dans un autre terminal :
//   python3 -m http.server 8766        (depuis la racine du dépôt)
// puis :
//   node programme/outils/mesurer-blocs.mjs --ecrire
// À refaire après tout changement du rendu d'un bloc, du CSS d'impression, ou l'ajout d'une fiche.

// Par fiche : la hauteur de chaque exercice sur la page élève, puis sur le corrigé.
export const HAUTEURS_BLOCS = {
  'ce2-addition-posee': { eleve: [174,174,154,212], corrige: [173,173,154,155] },
  'ce2-soustraction-posee': { eleve: [174,174,110,212], corrige: [173,173,110,155] },
  'ce2-multiplication': { eleve: [96,144,249,183], corrige: [96,144,249,155] },
  'ce2-nombres-lire-ecrire': { eleve: [309,140,125,130], corrige: [203,121,112,130] },
  'ce2-nombres-comparer': { eleve: [117,174,155,194], corrige: [117,135,136,153] },
  'ce2-fractions-lire': { eleve: [161,178,232,131], corrige: [156,178,233,131] },
  'ce2-fractions-comparer': { eleve: [186,77,161,116], corrige: [186,138,205,116] },
  'ce2-fractions-calculer': { eleve: [168,80,80,248], corrige: [175,151,151,204] },
  'ce2-monnaie': { eleve: [180,97,210,163], corrige: [188,105,136,119] },
  'ce2-longueurs': { eleve: [97,97,197,175], corrige: [105,105,178,285] },
  'ce2-heures': { eleve: [162,181,162,180], corrige: [162,181,162,162] },
  'ce2-masses-contenances': { eleve: [129,97,197,223], corrige: [140,105,178,175] },
  'ce2-durees': { eleve: [97,97,257,204], corrige: [97,97,245,172] },
  'ce2-solides': { eleve: [137,203,116,128], corrige: [154,203,116,195] },
  'ce2-polygones': { eleve: [160,168,214,157], corrige: [160,168,214,157] },
  'ce2-symetrie': { eleve: [190,139,250,146], corrige: [187,139,250,209] },
  'ce2-donnees': { eleve: [198,175,176,86], corrige: [198,175,176,86] },
};

// En-tête d'une feuille panachée (titre sur deux lignes, QR, ligne Nom / Date) et du corrigé (avec sa note).
export const HAUTEURS_PAGE = {"enteteEleve":128,"enteteCorrige":186};

// Une ligne de mini-rappel (l'objectif « Je sais… » de la fiche), selon qu'il tient sur une ou deux lignes.
export const HAUTEURS_RAPPEL = {
  'ce2-addition-posee': 23,
  'ce2-soustraction-posee': 39,
  'ce2-multiplication': 39,
  'ce2-nombres-lire-ecrire': 39,
  'ce2-nombres-comparer': 39,
  'ce2-fractions-lire': 23,
  'ce2-fractions-comparer': 39,
  'ce2-fractions-calculer': 39,
  'ce2-monnaie': 23,
  'ce2-longueurs': 39,
  'ce2-heures': 23,
  'ce2-masses-contenances': 23,
  'ce2-durees': 39,
  'ce2-solides': 39,
  'ce2-polygones': 23,
  'ce2-symetrie': 23,
  'ce2-donnees': 39,
};
