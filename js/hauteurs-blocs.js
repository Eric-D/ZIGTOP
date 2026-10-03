// Hauteurs mesurées (px, impression, 703 px de large) : max sur 5 graines et toutes les options, + 4 %.
// FICHIER GÉNÉRÉ : ne pas modifier à la main. Pour le régénérer, dans un autre terminal :
//   python3 -m http.server 8766        (depuis la racine du dépôt)
// puis :
//   node programme/outils/mesurer-blocs.mjs --ecrire
// À refaire après tout changement du rendu d'un bloc, du CSS d'impression, ou l'ajout d'une fiche.

// Par fiche : la hauteur de chaque exercice sur la page élève, puis sur le corrigé.
export const HAUTEURS_BLOCS = {
  'ce2-addition-posee': { eleve: [172,172,137,220], corrige: [172,172,137,151] },
  'ce2-soustraction-posee': { eleve: [172,172,112,220], corrige: [172,172,112,151] },
  'ce2-multiplication': { eleve: [97,136,209,179], corrige: [97,136,210,151] },
  'ce2-nombres-lire-ecrire': { eleve: [304,135,101,125], corrige: [199,116,89,125] },
  'ce2-nombres-comparer': { eleve: [112,171,152,175], corrige: [112,128,134,133] },
  'ce2-fractions-lire': { eleve: [168,173,208,116], corrige: [164,173,209,116] },
  'ce2-fractions-comparer': { eleve: [163,77,141,115], corrige: [163,103,167,115] },
  'ce2-fractions-calculer': { eleve: [150,75,75,243], corrige: [156,146,146,200] },
  'ce2-monnaie': { eleve: [163,93,205,158], corrige: [177,100,131,114] },
  'ce2-longueurs': { eleve: [93,93,192,171], corrige: [100,100,171,263] },
  'ce2-heures': { eleve: [169,171,171,193], corrige: [161,164,165,164] },
  'ce2-masses-contenances': { eleve: [124,93,192,219], corrige: [136,100,171,164] },
  'ce2-durees': { eleve: [93,93,288,199], corrige: [93,93,281,174] },
  'ce2-solides': { eleve: [133,245,112,104], corrige: [134,245,112,167] },
  'ce2-polygones': { eleve: [141,152,209,154], corrige: [141,152,209,154] },
  'ce2-symetrie': { eleve: [192,136,246,154], corrige: [192,136,246,195] },
  'ce2-donnees': { eleve: [180,198,183,81], corrige: [180,198,183,81] },
};

// En-tête d'une feuille panachée (titre sur deux lignes, QR, ligne Nom / Date) et du corrigé (avec sa note).
export const HAUTEURS_PAGE = {"enteteEleve":126,"enteteCorrige":183};

// Une ligne de mini-rappel (l'objectif « Je sais… » de la fiche), selon qu'il tient sur une ou deux lignes.
export const HAUTEURS_RAPPEL = {
  'ce2-addition-posee': 23,
  'ce2-soustraction-posee': 23,
  'ce2-multiplication': 39,
  'ce2-nombres-lire-ecrire': 39,
  'ce2-nombres-comparer': 39,
  'ce2-fractions-lire': 23,
  'ce2-fractions-comparer': 23,
  'ce2-fractions-calculer': 39,
  'ce2-monnaie': 23,
  'ce2-longueurs': 23,
  'ce2-heures': 23,
  'ce2-masses-contenances': 23,
  'ce2-durees': 39,
  'ce2-solides': 23,
  'ce2-polygones': 23,
  'ce2-symetrie': 23,
  'ce2-donnees': 23,
};
