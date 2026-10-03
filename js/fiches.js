// Fiches de révision imprimables.
// Une fiche = un générateur d'exercices + une mise en page A4 (voir @media print
// dans styles.css). Tout est régénérable : une nouvelle série à chaque clic.

import { rnd, pick, shuffle, fmt, enLettres, setAlea, generateurAleatoire } from './utils.js';
import { qrSVG } from './qr.js';
import { HAUTEURS_BLOCS } from './hauteurs-blocs.js';
import { demiDroite, figureFraction, regleFractions, monnaie, polygoneCote, horloge, ligneDuTemps, solide, patronCube, figurePlane, cercle, PX_PAR_CM, figureSymetrie, quadrillageSymetrie, diagrammeBarres, nbAxesFigure, FIGURES_SYMETRIQUES, FIGURES_ASYMETRIQUES, FIGURES_POLYGONES, FIGURES_NON_POLYGONES, NB_VARIANTES_FIGURE, NB_PATRONS, NB_ASSEMBLAGES, PIECES_EURO, BILLETS_EURO } from './visuels.js';

/* ------------------------------------------------------------------ */
/* Outils de mise en page                                              */
/* ------------------------------------------------------------------ */

const chiffres = (n, largeur) => String(n).padStart(largeur, ' ').split('');

// Retenues d'une addition posée, colonne par colonne (droite → gauche).
function retenues(a, b, largeur) {
  const A = chiffres(a, largeur), B = chiffres(b, largeur);
  const out = Array(largeur).fill('');
  let r = 0;
  for (let i = largeur - 1; i >= 0; i--) {
    const somme = (+A[i] || 0) + (+B[i] || 0) + r;
    r = somme >= 10 ? 1 : 0;
    if (r && i > 0) out[i - 1] = '1';
  }
  return out;
}

// Soustraction posée, notée comme dans le livret : on « casse » une unité de la
// colonne de gauche. Pour chaque colonne (gauche → droite) :
//   recoit : la colonne reçoit 10 unités de plus (le chiffre devient « 1 » + chiffre : 2 → 12) ;
//   prete  : la colonne prête une unité, son chiffre est barré et le nouveau s'écrit au-dessus ;
//   haut   : ce nouveau chiffre (6 → 5), vide si la colonne ne prête pas.
function emprunts(a, b, largeur) {
  const A = chiffres(a, largeur).map((c) => +c || 0);
  const B = chiffres(b, largeur).map((c) => +c || 0);
  const cur = [...A];
  const recoit = Array(largeur).fill(false);
  const prete = Array(largeur).fill(false);
  for (let i = largeur - 1; i > 0; i--) {
    if (cur[i] < B[i]) {
      cur[i] += 10; recoit[i] = true;
      cur[i - 1] -= 1; prete[i - 1] = true;
    }
  }
  return {
    recoit, prete, depart: A,
    haut: cur.map((v, i) => (prete[i] ? String(v) : '')),
    nombre: recoit.filter(Boolean).length,
  };
}

const ENTETES = ['u', 'd', 'c', 'm'];
const entetes = (largeur) => ENTETES.slice(0, largeur).reverse();

// Une opération posée. `mode` : 'vide' (tout à écrire), 'pose' (chiffres placés),
// 'corrige' (tout rempli, en couleur).
// Toutes les lignes ont exactement le même nombre de cellules — colonne du signe
// comprise — sinon les unités ne tomberaient pas sous les unités, ce qui est
// précisément ce que la leçon demande d'apprendre.
function operationPosee({ a, b, largeur, mode, numero, signe = '+' }) {
  const soustraction = signe === '−';
  const total = soustraction ? a - b : a + b;
  const resultat = String(total);
  const colonnes = Math.max(largeur, resultat.length);   // colonnes de chiffres
  const A = chiffres(a, colonnes);
  const B = chiffres(b, colonnes);
  const R = chiffres(total, colonnes);
  const ret = soustraction ? null : retenues(a, b, colonnes);
  const emp = soustraction ? emprunts(a, b, colonnes) : null;

  const cellule = (v, classe = '') => `<td class="${classe}">${v && v !== ' ' ? v : ''}</td>`;
  const vides = (n, classe = '') => (n > 0 ? Array(n).fill(`<td class="${classe}"></td>`).join('') : '');
  const signeTd = (v) => `<td class="signe">${v}</td>`;

  const entetesLigne = entetes(largeur);
  const ligneEntetes = `<tr class="pose__entetes">${signeTd('')}${vides(colonnes - largeur)}${entetesLigne.map((e) => `<td>${e}</td>`).join('')}</tr>`;

  // Addition : la retenue s'écrit en haut de la colonne suivante.
  // Soustraction (livret) : le nouveau chiffre s'écrit au-dessus du chiffre barré.
  const retenuesCorrige = soustraction ? emp.haut : ret;
  const ligneRetenues = mode === 'corrige'
    ? `<tr class="pose__retenues">${signeTd('')}${retenuesCorrige.map((r) => cellule(r, 'retenue')).join('')}</tr>`
    : `<tr class="pose__retenues">${signeTd('')}${vides(colonnes, 'retenue')}</tr>`;

  // Ligne du haut d'une soustraction corrigée : « 12 » pour la colonne qui reçoit 10 unités,
  // chiffre barré pour celle qui prête.
  const hautCorrige = () => A.map((c, i) => {
    if (c === ' ') return cellule('');
    const texte = emp.recoit[i] ? `<span class="un">1</span>${c}` : c;
    return `<td class="${emp.prete[i] ? 'barre' : ''}">${texte}</td>`;
  }).join('');

  const lignesNombres = mode === 'vide'
    ? `<tr class="pose__nombre">${signeTd('')}${vides(colonnes, 'case')}</tr>
       <tr class="pose__nombre pose__nombre--derniere">${signeTd(signe)}${vides(colonnes, 'case')}</tr>`
    : `<tr class="pose__nombre">${signeTd('')}${soustraction && mode === 'corrige' ? hautCorrige() : A.map((c) => cellule(c)).join('')}</tr>
       <tr class="pose__nombre pose__nombre--derniere">${signeTd(signe)}${B.map((c) => cellule(c)).join('')}</tr>`;

  const ligneResultat = mode === 'corrige'
    ? `<tr class="pose__resultat">${signeTd('')}${R.map((c) => cellule(c, 'reponse')).join('')}</tr>`
    : `<tr class="pose__resultat">${signeTd('')}${vides(colonnes, 'case')}</tr>`;

  return `
    <div class="op">
      ${numero || mode === 'vide' ? `<div class="op__titre">${numero ? `${numero}.` : ''} ${mode === 'vide' && numero ? `${fmt(a)} ${signe} ${fmt(b)} =` : ''}</div>` : ''}
      <table class="pose${mode === 'vide' ? ' pose--vide' : ''}">
        ${ligneEntetes}
        ${ligneRetenues}
        ${lignesNombres}
        ${ligneResultat}
      </table>
    </div>`;
}

// Retenues d'une multiplication posée par un chiffre `d`, dans l'ordre où on les écrit
// (unités d'abord). Comme dans le livret (« 5 × 7u = 35u, j'écris 5 et je retiens 3d »),
// la dernière retenue n'en est pas une : elle s'écrit directement dans le résultat.
function suiteRetenues(a, d) {
  const A = String(a).split('').reverse().map(Number);
  const out = [];
  let r = 0;
  for (let j = 0; j + 1 < A.length; j++) {
    r = Math.floor((A[j] * d + r) / 10);
    if (r) out.push(String(r));
  }
  return out;
}

// Une multiplication posée : `b` a un chiffre (une seule ligne de résultat) ou deux
// chiffres (deux lignes partielles : a × unités, puis a × dizaines décalé d'une colonne,
// avec son 0 des unités, comme 10 × 23 = 230 dans la leçon). Même modes que
// `operationPosee`. Toutes les lignes ont le même nombre de cellules, colonne du signe
// (et colonne des petites notes « 4 × 23 », quand il y en a) comprises.
function multiplicationPosee({ a, b, largeur = 0, mode, numero }) {
  const deux = b >= 10;
  const produit = a * b;
  const colonnes = Math.max(largeur, String(a).length, String(b).length, String(produit).length);
  const unites = b % 10, dizaines = Math.floor(b / 10);
  const partiel1 = a * unites;
  const partiel2 = a * dizaines * 10;
  const notes = true;   // colonne de droite : retenues (comme dans le livret) et notes « 4 × 23 »

  const cellule = (v, classe = '') => `<td class="${classe}">${v && v !== ' ' ? v : ''}</td>`;
  const vides = (n, classe = '') => Array(n).fill(`<td class="${classe}"></td>`).join('');
  const signeTd = (v) => `<td class="signe">${v}</td>`;
  const noteTd = (t = '') => (notes ? `<td class="note">${t}</td>` : '');
  const ligne = (classe, signe, cellules, note) => `<tr class="${classe}">${signeTd(signe)}${cellules}${noteTd(note)}</tr>`;
  // La lettre de l'exercice (« a. ») s'écrit dans la colonne du signe, au niveau des en-têtes :
  // pas de ligne de titre en plus au-dessus de la grille.
  const lettreTd = numero ? `<td class="signe signe--lettre">${numero}.</td>` : signeTd('');
  const chiffresDe = (n, classe = '') => chiffres(n, colonnes).map((c) => cellule(c, classe)).join('');
  const corrige = mode === 'corrige';
  const rempli = mode !== 'vide';

  const retSomme = deux ? retenues(partiel1, partiel2, colonnes) : null;

  // Retenues de la multiplication, notées comme dans le livret : en petit à droite de la
  // ligne du facteur, l'une après l'autre, la précédente barrée. Avec deux chiffres, celles
  // de a × unités, puis (après « ; ») celles de a × dizaines.
  const ecrire = (suite) => suite.map((r, i) => `<span class="retenue${i < suite.length - 1 ? ' retenue--barree' : ''}">${r}</span>`).join(' ');
  const suites = [suiteRetenues(a, deux ? unites : b), ...(deux ? [suiteRetenues(a, dizaines)] : [])].filter((s) => s.length);
  const retenuesNote = corrige ? suites.map(ecrire).join(' <span class="note__sep">;</span> ') : '';

  const lignes = [
    `<tr class="pose__entetes">${lettreTd}${entetes(colonnes).map((e) => `<td>${e}</td>`).join('')}${noteTd('')}</tr>`,
    ligne('pose__nombre', '', rempli ? chiffresDe(a) : vides(colonnes, 'case'), ''),
    ligne('pose__nombre pose__nombre--derniere', '×', rempli ? chiffresDe(b) : vides(colonnes, 'case'), retenuesNote),
  ];
  if (deux) {
    const partiel = (n) => (corrige ? chiffres(n, colonnes).map((c) => cellule(c, 'reponse')).join('') : vides(colonnes, 'case'));
    // Comme dans le livret, les petites retenues de l'addition sont entre les deux lignes.
    lignes.push(
      ligne('pose__nombre pose__partiel', '', partiel(partiel1), mode !== 'vide' ? `${unites} × ${a}` : ''),
      ligne('pose__retenues pose__retenues--somme', '', corrige ? retSomme.map((r) => cellule(r, 'retenue')).join('') : vides(colonnes, 'retenue'), ''),
      ligne('pose__nombre pose__partiel pose__nombre--derniere', '+', partiel(partiel2), mode !== 'vide' ? `${dizaines * 10} × ${a}` : ''),
    );
  }
  lignes.push(ligne('pose__resultat', '', corrige ? chiffresDe(produit, 'reponse') : vides(colonnes, 'case'), ''));

  return `
    <div class="op">
      <table class="pose pose--multiplication${mode === 'vide' ? ' pose--vide' : ''}">
        ${lignes.join('\n        ')}
      </table>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* CE2 — addition posée                                                */
/* ------------------------------------------------------------------ */

function nombreDe(chif) {
  return rnd(10 ** (chif - 1), 10 ** chif - 1);
}

// Tire une addition en contrôlant le nombre de retenues : on veut de la
// progressivité, pas une suite d'opérations toutes pareilles.
function additionAvec(chif, retenuesVoulues) {
  for (let essai = 0; essai < 400; essai++) {
    const a = nombreDe(chif), b = nombreDe(chif);
    if (a + b > 10 ** chif - 1) continue;
    const nb = retenues(a, b, chif).filter(Boolean).length;
    if (retenuesVoulues === 'aucune' && nb === 0) return { a, b };
    if (retenuesVoulues === 'une' && nb === 1) return { a, b };
    if (retenuesVoulues === 'plusieurs' && nb >= 2) return { a, b };
  }
  const a = nombreDe(chif), b = nombreDe(chif);
  return { a: Math.min(a, b), b: Math.min(a, b) };
}

const PRENOMS = ['Léa', 'Tom', 'Awa', 'Malo', 'Jade', 'Ilyes', 'Zoé', 'Noé', 'Nina', 'Sacha'];

function problemesAddition(chif) {
  const [p, q] = shuffle(PRENOMS);
  // Énoncés volontairement courts : deux problèmes doivent tenir côte à côte,
  // et une phrase longue n'ajoute rien à la difficulté mathématique.
  const modeles = [
    () => {
      const { a, b } = additionAvec(chif, 'plusieurs');
      return {
        enonce: `La bibliothèque a ${fmt(a)} livres. Elle en reçoit ${fmt(b)}. Combien en a-t-elle maintenant ?`,
        a, b, phrase: `La bibliothèque a ${fmt(a + b)} livres.`,
      };
    },
    () => {
      const { a, b } = additionAvec(chif, 'plusieurs');
      return {
        enonce: `${p} court ${fmt(a)} m le matin et ${fmt(b)} m le soir. Quelle distance en tout ?`,
        a, b, phrase: `${p} court ${fmt(a + b)} m en tout.`,
      };
    },
    () => {
      const { a, b } = additionAvec(chif, 'une');
      return {
        enonce: `Le stade a ${fmt(a)} places assises et ${fmt(b)} places debout. Combien de places en tout ?`,
        a, b, phrase: `Le stade a ${fmt(a + b)} places.`,
      };
    },
    () => {
      const { a, b } = additionAvec(chif, 'plusieurs');
      return {
        enonce: `${q} a ${fmt(a)} images dans un album et ${fmt(b)} dans l'autre. Combien d'images en tout ?`,
        a, b, phrase: `${q} a ${fmt(a + b)} images.`,
      };
    },
    () => {
      const { a, b } = additionAvec(chif, 'plusieurs');
      return {
        enonce: `Une ferme récolte ${fmt(a)} kg de pommes et ${fmt(b)} kg de poires. Quelle masse en tout ?`,
        a, b, phrase: `La ferme récolte ${fmt(a + b)} kg en tout.`,
      };
    },
  ];
  return shuffle(modeles).slice(0, 2).map((f) => f());
}

// Ordre de grandeur : on arrondit à la centaine, comme dans la leçon.
function estimations(chif) {
  return [1, 2, 3].map(() => {
    const { a, b } = additionAvec(chif, 'plusieurs');
    const arrondi = (n) => Math.round(n / 100) * 100;
    const bon = arrondi(a) + arrondi(b);
    const ecart = chif >= 4 ? pick([100, 200, 1000]) : 100;
    const faux = [bon + ecart, Math.max(100, bon - pick([ecart, 200]))];
    return { a, b, choix: shuffle([bon, ...faux]), reponse: bon, exact: a + b };
  });
}

function genererAdditionPosee(options) {
  const chif = options.taille === '3' ? 3 : options.taille === '4' ? 4 : null;
  const tailles = chif ? [chif, chif, chif, chif] : [3, 3, 4, 4];

  return {
    objectif: chif === 3
      ? 'Je sais poser et calculer des additions avec des nombres inférieurs à 1 000.'
      : 'Je sais poser et calculer des additions avec des nombres inférieurs à 10 000.',
    methode: {
      exemple: { a: 685, b: 267, largeur: 3 },
      etapes: [
        'Je pose l’addition en colonnes : les unités sous les unités, les dizaines sous les dizaines…',
        'Je commence par les unités : 5 u + 7 u = 12 u. 12 u, c’est 1 d et 2 u : j’écris 2 et je retiens 1 dizaine.',
        'Je continue avec les dizaines : 1 d + 8 d + 6 d = 15 d. C’est 1 c et 5 d : j’écris 5 et je retiens 1 centaine.',
        'Je termine avec les centaines : 1 c + 6 c + 2 c = 9 c. J’écris 9.',
        'Je vérifie avec un ordre de grandeur : 700 + 250 = 950, tout près de 952. C’est cohérent !',
      ],
    },
    // Les additions supplémentaires ne sont imprimées que lorsque le rappel de
    // méthode est masqué : la place libérée sert alors à s'entraîner davantage.
    posees: [
      { ...additionAvec(tailles[0], 'aucune'), largeur: tailles[0] },
      { ...additionAvec(tailles[1], 'une'), largeur: tailles[1] },
      { ...additionAvec(tailles[2], 'plusieurs'), largeur: tailles[2] },
      { ...additionAvec(tailles[3], 'plusieurs'), largeur: tailles[3] },
      { ...additionAvec(tailles[1], 'plusieurs'), largeur: tailles[1] },
      { ...additionAvec(tailles[3], 'une'), largeur: tailles[3] },
      { ...additionAvec(tailles[2], 'plusieurs'), largeur: tailles[2] },
      { ...additionAvec(tailles[0], 'plusieurs'), largeur: tailles[0] },
    ],
    aposer: [
      { ...additionAvec(tailles[0], 'une'), largeur: tailles[0] },
      { ...additionAvec(tailles[2], 'plusieurs'), largeur: tailles[2] },
      { ...additionAvec(tailles[3], 'plusieurs'), largeur: tailles[3] },
      { ...additionAvec(tailles[1], 'plusieurs'), largeur: tailles[1] },
    ],
    estimations: estimations(chif || 3),
    problemes: problemesAddition(chif || 3),
  };
}

/* ------------------------------------------------------------------ */
/* CE2 — soustraction posée                                            */
/* ------------------------------------------------------------------ */

// Tire une soustraction a − b (a > b) en contrôlant le nombre de colonnes où il
// faut « casser » une unité. Le grand nombre n'a pas de 0 : une retenue sur un 0
// demande un enchaînement que la leçon ne traite pas.
function soustractionAvec(chif, retenuesVoulues) {
  for (let essai = 0; essai < 600; essai++) {
    const a = nombreDe(chif), b = nombreDe(chif);
    if (a <= b || String(a).includes('0')) continue;
    const nb = emprunts(a, b, chif).nombre;
    if (retenuesVoulues === 'aucune' && nb === 0) return { a, b };
    if (retenuesVoulues === 'une' && nb === 1) return { a, b };
    if (retenuesVoulues === 'plusieurs' && nb >= 2) return { a, b };
  }
  // Repli sûr (jamais atteint en pratique) : une soustraction sans retenue.
  return { a: 10 ** chif - 1, b: 10 ** (chif - 1) };
}

function problemesSoustraction(chif) {
  const [p, q] = shuffle(PRENOMS);
  const modeles = [
    () => {
      const { a, b } = soustractionAvec(chif, 'plusieurs');
      return {
        enonce: `Un marchand a ${fmt(a)} pommes. Il en vend ${fmt(b)}. Combien lui en reste-t-il ?`,
        a, b, phrase: `Il lui reste ${fmt(a - b)} pommes.`,
      };
    },
    () => {
      const { a, b } = soustractionAvec(chif, 'une');
      return {
        enonce: `${p} a ${fmt(a)} billes et ${q} en a ${fmt(b)}. Quel est l’écart entre leurs billes ?`,
        a, b, phrase: `L’écart est de ${fmt(a - b)} billes.`,
      };
    },
    () => {
      const { a, b } = soustractionAvec(chif, 'plusieurs');
      return {
        enonce: `Un vélo coûte ${fmt(a)} €. ${p} a déjà ${fmt(b)} €. Combien lui manque-t-il ?`,
        a, b, phrase: `Il manque ${fmt(a - b)} € à ${p}.`,
      };
    },
    () => {
      const { a, b } = soustractionAvec(chif, 'plusieurs');
      return {
        enonce: `Le livre a ${fmt(a)} pages. ${q} en a lu ${fmt(b)}. Combien de pages lui reste-t-il à lire ?`,
        a, b, phrase: `Il reste ${fmt(a - b)} pages à lire à ${q}.`,
      };
    },
    () => {
      const { a, b } = soustractionAvec(chif, 'une');
      return {
        enonce: `Un train fait ${fmt(a)} km et un autre ${fmt(b)} km. Quelle est la différence de distance ?`,
        a, b, phrase: `La différence est de ${fmt(a - b)} km.`,
      };
    },
  ];
  return shuffle(modeles).slice(0, 2).map((f) => f());
}

function genererSoustractionPosee(options) {
  const chif = options.taille === '3' ? 3 : options.taille === '4' ? 4 : null;
  const tailles = chif ? [chif, chif, chif, chif] : [3, 3, 3, 4];
  const avec = (i, retenues) => ({ ...soustractionAvec(tailles[i], retenues), largeur: tailles[i] });

  return {
    objectif: chif === 3
      ? 'Je sais poser et calculer une soustraction avec retenue.'
      : 'Je sais poser et calculer une soustraction avec des nombres à 4 chiffres.',
    // L'exemple est celui de la page 18 du livret : 4 268 − 1 951.
    methode: {
      exemple: { a: 4268, b: 1951, largeur: 4 },
      etapes: [
        'Je commence par les unités. Retirer 1 unité à 8 unités, c’est possible : 8 − 1 = 7. J’écris 7.',
        'Je continue avec les dizaines. Retirer 5 dizaines à 6 dizaines, c’est possible : 6 − 5 = 1. J’écris 1.',
        'Je continue avec les centaines. 2 centaines − 9 centaines, c’est impossible. Je casse 1 millier pour avoir 10 centaines supplémentaires : 4m 2c 6d 8u devient 3m 12c 6d 8u. 12 − 9 = 3. J’écris 3.',
        'Je continue avec les milliers : 3 − 1 = 2. J’écris 2. Je vérifie : 2 317 + 1 951 = 4 268.',
      ],
    },
    posees: [
      avec(0, 'aucune'), avec(1, 'une'), avec(2, 'plusieurs'), avec(3, 'plusieurs'),
      avec(1, 'plusieurs'), avec(3, 'une'), avec(2, 'une'), avec(0, 'plusieurs'),
    ],
    aposer: [avec(0, 'une'), avec(2, 'plusieurs'), avec(3, 'plusieurs'), avec(1, 'plusieurs')],
    verifications: [avec(0, 'une'), avec(2, 'plusieurs'), avec(3, 'plusieurs')]
      .map(({ a, b }) => ({ a, b, r: a - b })),
    problemes: problemesSoustraction(chif || 3),
  };
}

/* ------------------------------------------------------------------ */
/* CE2 — multiplication (en ligne et posée)                            */
/* ------------------------------------------------------------------ */

// Facteurs sans 0 : un 0 dans un facteur ajoute un cas que la leçon ne traite pas.
const sansZero = (chif) => {
  for (let essai = 0; essai < 200; essai++) {
    const n = nombreDe(chif);
    if (!String(n).includes('0')) return n;
  }
  return 10 ** chif - 1;
};
const nbRetenues = (a, d) => suiteRetenues(a, d).length;

// a × (1 chiffre), avec au moins `min` retenues, pour que la colonne des retenues serve.
function produitUnChiffre(chif, min) {
  for (let essai = 0; essai < 400; essai++) {
    const a = sansZero(chif), b = rnd(2, 9);
    if (nbRetenues(a, b) >= min) return { a, b };
  }
  return { a: 10 ** chif - 1, b: 9 };
}

// a × (2 chiffres) avec a à 2 chiffres : produit < 10 000 (≤ 99 × 99). `dizainesMin` :
// 1 pour un facteur comme 14 (la ligne des dizaines est alors a × 10, sans retenue).
function produitDeuxChiffres(dizainesMin, dizainesMax) {
  for (let essai = 0; essai < 400; essai++) {
    const a = sansZero(2), b = rnd(dizainesMin, dizainesMax) * 10 + rnd(1, 9);
    if (a !== b) return { a, b };
  }
  return { a: 23, b: 14 };
}

// Produit en ligne par décomposition : a × 15 = a × 10 + a × 5.
function produitsEnLigne() {
  const vus = new Set(), out = [];
  while (out.length < 6) {
    const a = rnd(3, 9), b = 10 + rnd(2, 9), cle = `${a}-${b}`;
    if (vus.has(cle) || (a === 9 && b === 15)) continue;   // 9 × 15 est l'exemple de la leçon
    vus.add(cle);
    out.push({ a, b });
  }
  return out;
}

function problemesMultiplication() {
  const [p, q] = shuffle(PRENOMS);
  const modeles = [
    () => {
      const { a, b } = produitUnChiffre(2, 0);
      return {
        enonce: `Un paquet contient ${a} cartes. ${p} achète ${b} paquets. Combien de cartes cela fait-il ?`,
        a, b, phrase: `Cela fait ${fmt(a * b)} cartes.`,
      };
    },
    () => {
      const { a, b } = produitUnChiffre(2, 0);
      return {
        enonce: `Un cahier coûte ${a} €. ${q} en achète ${b}. Combien cela coûte-t-il en tout ?`,
        a, b, phrase: `Les ${b} cahiers coûtent ${fmt(a * b)} €.`,
      };
    },
    () => {
      const { a, b } = produitUnChiffre(2, 0);
      return {
        enonce: `Dans une salle de cinéma, il y a ${b} rangées de ${a} places. Combien y a-t-il de places ?`,
        a, b, phrase: `Il y a ${fmt(a * b)} places dans cette salle.`,
      };
    },
    () => {
      const { a, b } = produitUnChiffre(2, 0);
      return {
        enonce: `Une boîte contient ${a} crayons. La classe reçoit ${b} boîtes. Combien de crayons reçoit-elle ?`,
        a, b, phrase: `La classe reçoit ${fmt(a * b)} crayons.`,
      };
    },
    () => {
      const { a, b } = produitUnChiffre(2, 0);
      return {
        enonce: `Un autobus transporte ${a} passagers. Combien de passagers dans ${b} autobus pareils ?`,
        a, b, phrase: `${b} autobus transportent ${fmt(a * b)} passagers.`,
      };
    },
  ];
  return shuffle(modeles).slice(0, 2).map((f) => f());
}

function genererMultiplication(options) {
  const deux = options.facteur !== '1';
  const un = [produitUnChiffre(2, 1), produitUnChiffre(3, 1), produitUnChiffre(3, 2), produitUnChiffre(3, 1), produitUnChiffre(2, 1), produitUnChiffre(3, 2)];
  const suite = deux
    ? [produitDeuxChiffres(1, 1), produitDeuxChiffres(2, 9), produitDeuxChiffres(2, 9)]
    : [produitUnChiffre(3, 1), produitUnChiffre(3, 2), produitUnChiffre(3, 1), produitUnChiffre(2, 1), produitUnChiffre(3, 2), produitUnChiffre(3, 1)];

  return {
    deux,
    objectif: deux
      ? 'Je sais calculer en ligne des produits, et poser et calculer des multiplications.'
      : 'Je sais calculer en ligne des produits, et poser et calculer une multiplication par un nombre à 1 chiffre.',
    // Exemples du livret : 9 × 15 (pages 19), 427 × 5 (page 20) et 14 × 23 (page 21).
    methode: {
      enligne: { a: 9, b: 15 },
      exemples: deux ? [{ a: 427, b: 5 }, { a: 23, b: 14 }] : [{ a: 427, b: 5 }],
      etapes: [
        'Je calcule le nombre d’unités : 5 × 7u = 35u. 35u, c’est 3d 5u. J’écris 5 dans la colonne des unités et je retiens 3d.',
        'Je calcule le nombre de dizaines : 5 × 2d = 10d. J’ajoute les 3d que j’ai retenues : 10d + 3d = 13d. 13d, c’est 1c 3d. J’écris 3 dans la colonne des dizaines et je retiens 1c.',
        'Je calcule le nombre de centaines : 5 × 4c = 20c. J’ajoute 1c que j’ai retenue : 20c + 1c = 21c. 21c, c’est 2m 1c. J’écris 1 dans la colonne des centaines et 2 dans la colonne des milliers.',
        ...(deux ? ['Avec 14 × 23 : 14 fois 23, c’est 10 fois 23 plus 4 fois 23. J’écris 4 × 23 = 92, puis 10 × 23 = 230 en dessous. J’additionne : 92 + 230 = 322.'] : []),
      ],
    },
    enligne: produitsEnLigne(),
    posees1: un,
    posees2: suite,
    problemes: problemesMultiplication(),
  };
}

/* ------------------------------------------------------------------ */
/* CE2 — nombres : lire, écrire, décomposer                            */
/* ------------------------------------------------------------------ */

const pluriel = (x, un, plusieurs) => `${fmt(x)} ${x > 1 ? plusieurs : un}`;

// Nombre sans 0 : un 0 dans l'écriture ajoute des cas (« deux-cents », colonne vide)
// que la fiche ne traite pas.
function nombreSansZero(chif) {
  let n = 0;
  for (let i = 0; i < chif; i++) n = n * 10 + rnd(1, 9);
  return n;
}

// Les chiffres d'un nombre, de la colonne la plus à gauche aux unités.
const chiffresDe3 = (n) => String(n).split('').map(Number);
// Valeur de chaque terme de la décomposition : 4 726 → [4000, 700, 20, 6].
const termesDe = (n) => chiffresDe3(n).map((c, i, t) => c * 10 ** (t.length - 1 - i));

// Les façons de représenter un nombre, dans l'ordre et avec les mots de la leçon
// (3 258 : page 7 du livret ; avec trois chiffres, même contenu avec des centaines).
function representations(n) {
  const c = chiffresDe3(n);
  const noms = n >= 1000
    ? [['millier', 'milliers'], ['centaine', 'centaines'], ['dizaine', 'dizaines'], ['unité', 'unités']]
    : [['centaine', 'centaines'], ['dizaine', 'dizaines'], ['unité', 'unités']];
  const termes = termesDe(n).map(fmt).join(' + ');
  const produits = c.map((x, i) => `(${x} × ${fmt(10 ** (c.length - 1 - i))})`).join(' + ');
  const parNom = c.map((x, i) => pluriel(x, ...noms[i])).join(' + ');
  const unites = pluriel(n % 10, 'unité', 'unités');
  if (n >= 1000) {
    return [
      fmt(n), enLettres(n),
      `${pluriel(c[0], 'millier', 'milliers')} + ${pluriel(n % 1000, 'unité', 'unités')}`,
      termes, produits,
      `${pluriel(Math.floor(n / 100), 'centaine', 'centaines')} + ${pluriel(c[2], 'dizaine', 'dizaines')} + ${unites}`,
      parNom,
    ];
  }
  return [
    fmt(n), enLettres(n),
    `${pluriel(c[0], 'centaine', 'centaines')} + ${pluriel(n % 100, 'unité', 'unités')}`,
    termes, produits,
    `${pluriel(Math.floor(n / 10), 'dizaine', 'dizaines')} + ${unites}`,
    parNom,
  ];
}

function genererNombres(options) {
  const quatre = options.taille !== '1000';
  const chif = quatre ? 4 : 3;
  const exemple = quatre ? 3258 : 863;
  const vus = new Set([exemple]);
  const nouveau = () => {
    for (let essai = 0; essai < 500; essai++) {
      const n = nombreSansZero(chif);
      if (!vus.has(n)) { vus.add(n); return n; }
    }
    return exemple;
  };
  const nombres = (k) => Array.from({ length: k }, nouveau);

  // Les nombres supplémentaires ne sont imprimés que sans le rappel de méthode.
  const lire = nombres(6);
  const ecrire = nombres(6);
  // Décomposition : on garde deux termes sur trois ou quatre, les autres sont à compléter.
  const decomp = nombres(4).map((n) => {
    const k = chif;
    const vides = shuffle([...Array(k).keys()]).slice(0, 2).sort((a, b) => a - b);
    return { n, vides };
  });
  const recomp = nombres(4);
  const combien = nombres(6);
  // Tableau de numération : une ligne sur deux donne le nombre (à répartir dans les
  // colonnes), l'autre donne les colonnes (à lire comme un nombre).
  const tableau = nombres(6).map((n, i) => ({ n, sens: i % 2 === 0 ? 'nombre' : 'colonnes' }));

  return {
    quatre,
    objectif: quatre
      ? 'Je sais que 1 millier = 10 centaines et je sais représenter un nombre de différentes façons.'
      : 'Je sais qu’une centaine, c’est aussi dix dizaines et cent unités, et je sais représenter un nombre de différentes façons.',
    methode: { exemple, lignes: representations(exemple) },
    lire, ecrire, decomp, recomp, combien, tableau,
  };
}

/* ------------------------------------------------------------------ */
/* Mise en page de la fiche                                            */
/* ------------------------------------------------------------------ */

export const echappe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Le QR code rouvre exactement cette fiche dans l'application. Celui de la feuille
// de l'enfant ouvre les exercices seuls — les réponses ne sont pas à un scan près ;
// celui du corrigé, que l'adulte garde, ouvre la correction.
function enTete(fiche, sousTitre, contenu, base, identite = true, vue = 'eleve') {
  return enTeteHTML({
    surtitre: `${fiche.classe.toUpperCase()} · ${fiche.domaine}`,
    titre: `${fiche.titre}${sousTitre ? ` — <em>${sousTitre}</em>` : ''}`,
    code: contenu.code, base, identite, vue,
  });
}

// Le même en-tête sert aux feuilles panachées (voir panache.js).
export function enTeteHTML({ surtitre, titre, code, base, identite = true, vue = 'eleve' }) {
  const lien = base ? `${base}?fiche=${code}&vue=${vue}` : '';
  const qr = lien ? qrSVG(lien, { taille: 76, marge: 2 }) : '';
  return `
    <div class="feuille__entete">
      <div class="feuille__entete__texte">
        <div class="feuille__domaine">${surtitre}</div>
        <h1 class="feuille__titre">${titre}</h1>
        ${identite ? `<div class="feuille__identite">
          <span>Nom : <span class="pointilles"></span></span>
          <span>Date : <span class="pointilles pointilles--court"></span></span>
        </div>` : ''}
      </div>
      <div class="feuille__qr">
        ${qr}
        <div class="feuille__code">${code}</div>
      </div>
    </div>`;
}

const lettre = (i) => String.fromCharCode(97 + i);

// Une fiche décrit sa mise en page par un objet `mise` :
//   signe, combien(contenu, methode) → opérations imprimées,
//   noteCorrige (phrase d'en-tête du corrigé),
//   exercices(contenu, methode) / corriges(contenu, methode) → blocs HTML des exercices.
// Chaque exercice est un <div class="bloc"> de premier niveau : `blocsDe` (en fin de fichier)
// les découpe pour que les feuilles panachées réutilisent tels quels les fragments des fiches.
// Le reste (en-tête, objectif, rappel de méthode, pied de page) est commun.

const miseAddition = {
  signe: '+',
  // Combien d'exercices tiennent sur la page, selon qu'on imprime ou non la méthode.
  combien: (contenu, methode) => ({
    posees: contenu.posees.slice(0, methode ? 4 : 8),
    aposer: contenu.aposer.slice(0, methode ? 3 : 4),
  }),
  noteCorrige: 'les retenues sont notées en haut de chaque colonne.',
  exercices(contenu, methode) {
    const { posees, aposer } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1 — Calcule ces additions.</h2>
      <div class="operations">
        ${posees.map((o, i) => operationPosee({ ...o, mode: 'pose', numero: String.fromCharCode(97 + i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Pose l’opération, puis calcule.</h2>
      <div class="operations">
        ${aposer.map((o, i) => operationPosee({ ...o, largeur: o.largeur + 1, mode: 'vide', numero: String.fromCharCode(97 + i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Entoure le bon ordre de grandeur (sans calculer !).</h2>
      <ul class="estimations">
        ${contenu.estimations.map((e, i) => `
          <li><span class="estimation__op">${String.fromCharCode(97 + i)}. ${fmt(e.a)} + ${fmt(e.b)}</span>
              <span class="estimation__choix">${e.choix.map((c) => `<span class="pastille-choix">${fmt(c)}</span>`).join('')}</span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous ces problèmes.</h2>
      <div class="problemes">
      ${contenu.problemes.map((p, i) => `
        <div class="probleme">
          <p class="probleme__enonce">${String.fromCharCode(97 + i)}. ${echappe(p.enonce)}</p>
          <div class="probleme__espace">
            ${operationPosee({ a: p.a, b: p.b, largeur: String(p.a).length + 1, mode: 'vide', numero: '' })}
            <div class="probleme__phrase">Phrase réponse : <span class="pointilles"></span><span class="pointilles"></span></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { posees, aposer } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="operations">
        ${posees.map((o, i) => operationPosee({ ...o, mode: 'corrige', numero: String.fromCharCode(97 + i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="operations">
        ${aposer.map((o, i) => operationPosee({ ...o, mode: 'corrige', numero: String.fromCharCode(97 + i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <ul class="estimations">
        ${contenu.estimations.map((e, i) => `
          <li><span class="estimation__op">${String.fromCharCode(97 + i)}. ${fmt(e.a)} + ${fmt(e.b)}</span>
              <span class="estimation__choix"><span class="pastille-choix pastille-choix--bonne">${fmt(e.reponse)}</span>
              <span class="estimation__exact">(résultat exact : ${fmt(e.exact)})</span></span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      ${contenu.problemes.map((p, i) => `
        <div class="probleme probleme--corrige">
          <p class="probleme__enonce">${String.fromCharCode(97 + i)}. ${fmt(p.a)} + ${fmt(p.b)} = <strong>${fmt(p.a + p.b)}</strong></p>
          <p class="probleme__phrase">${echappe(p.phrase)}</p>
        </div>`).join('')}
    </div>
`;
  },
};

const miseSoustraction = {
  signe: '−',
  combien: (contenu, methode) => ({
    posees: contenu.posees.slice(0, methode ? 4 : 8),
    aposer: contenu.aposer.slice(0, methode ? 3 : 4),
  }),
  noteCorrige: 'comme dans le livret, le chiffre qui prête est barré et le nouveau chiffre s’écrit au-dessus ; la colonne qui reçoit 10 unités les note devant son chiffre (2 devient 12).',
  exercices(contenu, methode) {
    const { posees, aposer } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1 — Calcule ces soustractions.</h2>
      <div class="operations">
        ${posees.map((o, i) => operationPosee({ ...o, signe: '−', mode: 'pose', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Pose l’opération, puis calcule.</h2>
      <div class="operations">
        ${aposer.map((o, i) => operationPosee({ ...o, signe: '−', mode: 'vide', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Vérifie chaque résultat avec une addition.</h2>
      <ul class="estimations">
        ${contenu.verifications.map((v, i) => `
          <li><span class="estimation__op">${lettre(i)}. ${fmt(v.a)} − ${fmt(v.b)} = ${fmt(v.r)}</span>
              <span class="verification">Je calcule : ${fmt(v.r)} + ${fmt(v.b)} = <span class="pointilles pointilles--court"></span></span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous ces problèmes.</h2>
      <div class="problemes">
      ${contenu.problemes.map((p, i) => `
        <div class="probleme">
          <p class="probleme__enonce">${lettre(i)}. ${echappe(p.enonce)}</p>
          <div class="probleme__espace">
            ${operationPosee({ a: p.a, b: p.b, signe: '−', largeur: String(p.a).length, mode: 'vide', numero: '' })}
            <div class="probleme__phrase">Phrase réponse : <span class="pointilles"></span><span class="pointilles"></span></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { posees, aposer } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="operations">
        ${posees.map((o, i) => operationPosee({ ...o, signe: '−', mode: 'corrige', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="operations">
        ${aposer.map((o, i) => operationPosee({ ...o, signe: '−', mode: 'corrige', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <ul class="estimations">
        ${contenu.verifications.map((v, i) => `
          <li><span class="estimation__op">${lettre(i)}. ${fmt(v.a)} − ${fmt(v.b)} = ${fmt(v.r)}</span>
              <span class="verification verification--corrigee">${fmt(v.r)} + ${fmt(v.b)} = <strong>${fmt(v.a)}</strong></span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      ${contenu.problemes.map((p, i) => `
        <div class="probleme probleme--corrige">
          <p class="probleme__enonce">${lettre(i)}. ${fmt(p.a)} − ${fmt(p.b)} = <strong>${fmt(p.a - p.b)}</strong></p>
          <p class="probleme__phrase">${echappe(p.phrase)}</p>
        </div>`).join('')}
    </div>
`;
  },
};

const miseMultiplication = {
  signe: '×',
  combien: (contenu, methode) => ({
    enligne: contenu.enligne.slice(0, methode ? 3 : 6),
    posees1: contenu.posees1.slice(0, methode ? 3 : 6),
    posees2: contenu.posees2.slice(0, methode ? 2 : (contenu.deux ? 3 : 4)),
  }),
  noteCorrige: 'les retenues de chaque multiplication sont notées, comme dans le livret, en petit à droite de la ligne du facteur, l’une après l’autre, la précédente barrée (avec deux chiffres : celles de a × unités, puis, après un point-virgule, celles de a × dizaines) ; avec deux chiffres, les deux lignes partielles (a × unités, puis a × dizaines décalé d’une colonne, avec son 0) sont additionnées, et les petites retenues de cette addition sont notées entre les deux lignes.',
  // Rappel de méthode : les deux façons de calculer en ligne (Mila, Enzo), puis les étapes
  // de la multiplication posée, avec les exemples du livret.
  rappel(contenu) {
    const { enligne: { a, b }, exemples, etapes } = contenu.methode;
    const u = b % 10;
    const exemplesHtml = exemples.map((e) => `
          <div class="methode__exemple">${multiplicationPosee({ ...e, mode: 'corrige', numero: '' })}</div>`).join('');
    return `
      <div class="methode methode--multiplication">
        <div class="methode__exemples">${exemplesHtml}
        </div>
        <div class="methode__droite">
          <div class="enligne">
            <div class="enligne__methode">
              <div class="enligne__nom">Méthode de Mila</div>
              <div class="enligne__texte">${a} × ${b}, c’est ${a} fois 10 plus ${a} fois ${u}.</div>
              <div class="rectangle"><span class="rectangle__haut">${a} × 10 = ${a * 10}</span><span class="rectangle__bas">${a} × ${u} = ${a * u}</span></div>
              <div class="enligne__total">${a} × ${b} = ${a * 10} + ${a * u} = ${a * b}</div>
            </div>
            <div class="enligne__methode">
              <div class="enligne__nom">Méthode d’Enzo</div>
              <table class="arbre">
                <tr><td colspan="3">${a} × ${b}</td></tr>
                <tr><td>${a} × 10</td><td>+</td><td>${a} × ${u}</td></tr>
                <tr><td>${a * 10}</td><td>+</td><td>${a * u}</td></tr>
                <tr><td colspan="3"><strong>${a * b}</strong></td></tr>
              </table>
            </div>
          </div>
          <ol class="methode__etapes">${etapes.map((e) => `<li>${echappe(e)}</li>`).join('')}</ol>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { enligne, posees1, posees2 } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1 — Calcule en ligne, en décomposant le deuxième nombre.</h2>
      <ul class="decompositions">
        ${enligne.map((o, i) => `
          <li><span class="decomposition__op">${lettre(i)}. ${o.a} × ${o.b}</span>
              <span class="decomposition__ligne">= <span class="pointilles pointilles--mini"></span> × 10 + <span class="pointilles pointilles--mini"></span> × <span class="pointilles pointilles--mini"></span> = <span class="pointilles pointilles--mini"></span> + <span class="pointilles pointilles--mini"></span> = <span class="pointilles pointilles--mini"></span></span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Calcule ces multiplications posées.</h2>
      <div class="operations">
        ${posees1.map((o, i) => multiplicationPosee({ ...o, mode: 'pose', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — ${contenu.deux ? 'Calcule ces multiplications posées : écris chaque ligne.' : 'Calcule ces multiplications posées.'}</h2>
      <div class="operations">
        ${posees2.map((o, i) => multiplicationPosee({ ...o, mode: 'pose', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous ces problèmes.</h2>
      <div class="problemes">
      ${contenu.problemes.map((p, i) => `
        <div class="probleme">
          <p class="probleme__enonce">${lettre(i)}. ${echappe(p.enonce)}</p>
          <div class="probleme__espace">
            ${multiplicationPosee({ a: p.a, b: p.b, mode: 'vide', numero: '' })}
            <div class="probleme__phrase">Phrase réponse : <span class="pointilles"></span><span class="pointilles"></span></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { enligne, posees1, posees2 } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <ul class="decompositions">
        ${enligne.map((o, i) => `
          <li><span class="decomposition__op">${lettre(i)}. ${o.a} × ${o.b}</span>
              <span class="decomposition__ligne decomposition__ligne--corrigee">= ${o.a} × 10 + ${o.a} × ${o.b - 10} = ${o.a * 10} + ${o.a * (o.b - 10)} = <strong>${o.a * o.b}</strong></span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="operations">
        ${posees1.map((o, i) => multiplicationPosee({ ...o, mode: 'corrige', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="operations">
        ${posees2.map((o, i) => multiplicationPosee({ ...o, mode: 'corrige', numero: lettre(i) })).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      ${contenu.problemes.map((p, i) => `
        <div class="probleme probleme--corrige">
          <p class="probleme__enonce">${lettre(i)}. ${fmt(p.a)} × ${fmt(p.b)} = <strong>${fmt(p.a * p.b)}</strong></p>
          <p class="probleme__phrase">${echappe(p.phrase)}</p>
        </div>`).join('')}
    </div>
`;
  },
};

const rouge = (t) => `<span class="rouge">${t}</span>`;
const trou = '<span class="pointilles pointilles--mini"></span>';

// Tableau de numération : une ligne par nombre. `sens` 'nombre' : le nombre est donné, les
// colonnes sont à remplir ; 'colonnes' : les colonnes sont données, le nombre est à écrire.
function tableauNumeration(lignes, quatre, corrige, sens) {
  const colonnes = quatre ? ['m', 'c', 'd', 'u'] : ['c', 'd', 'u'];
  const rangs = lignes.filter((l) => l.sens === sens);
  const corps = rangs.map((l) => {
    const cases = chiffresDe3(l.n).map((c) => (sens === 'colonnes' ? `<td>${c}</td>` : `<td class="${corrige ? 'rouge' : 'vide'}">${corrige ? c : ''}</td>`)).join('');
    const nb = sens === 'nombre' ? `<td class="tab-num__nombre">${fmt(l.n)}</td>`
      : `<td class="tab-num__nombre ${corrige ? 'rouge' : 'vide'}">${corrige ? fmt(l.n) : ''}</td>`;
    return `<tr>${nb}${cases}</tr>`;
  }).join('');
  return `
      <table class="tab-num">
        <tr class="tab-num__entetes"><td class="tab-num__nombre">nombre</td>${colonnes.map((c) => `<td>${c}</td>`).join('')}</tr>
        ${corps}
      </table>`;
}

const miseNombres = {
  signe: '',
  combien: (contenu, methode) => ({
    lire: contenu.lire.slice(0, methode ? 4 : 6),
    ecrire: contenu.ecrire.slice(0, methode ? 4 : 6),
    decomp: contenu.decomp.slice(0, methode ? 3 : 4),
    recomp: contenu.recomp.slice(0, methode ? 3 : 4),
    combien: contenu.combien.slice(0, methode ? 4 : 6),
    tableau: contenu.tableau.slice(0, methode ? 4 : 6),
  }),
  noteCorrige: 'les écritures attendues sont en rouge : les nombres en lettres s’écrivent avec des traits d’union ; le nombre de dizaines (ou de centaines) est celui qu’on compte en tout dans le nombre, comme « 32 centaines » pour 3 258 dans le livret ; les colonnes du tableau sont m (milliers), c (centaines), d (dizaines) et u (unités).',
  // Rappel : tableau de numération avec l'exemple du livret, façons de représenter le nombre.
  rappel(contenu) {
    const { exemple, lignes } = contenu.methode;
    const quatre = contenu.quatre;
    const colonnes = quatre ? ['m', 'c', 'd', 'u'] : ['c', 'd', 'u'];
    const legende = quatre ? 'm milliers · c centaines · d dizaines · u unités' : 'c centaines · d dizaines · u unités';
    const relation = quatre ? '1 millier = 10 centaines = 100 dizaines = 1 000 unités' : '1 centaine = 10 dizaines = 100 unités';
    const nbChiffres = String(exemple).length;
    return `
      <div class="methode methode--nombres">
        <div class="methode__tableau">
          <table class="tab-num tab-num--exemple">
            <tr class="tab-num__entetes">${colonnes.map((c) => `<td>${c}</td>`).join('')}</tr>
            <tr>${chiffresDe3(exemple).map((c) => `<td>${c}</td>`).join('')}</tr>
          </table>
          <div class="methode__legende">${legende}</div>
          <div class="methode__legende">${fmt(exemple)} est un nombre à ${nbChiffres} chiffres. La valeur du chiffre dépend de sa position dans l’écriture du nombre.</div>
        </div>
        <div class="methode__droite">
          <div class="representations__titre">Je sais représenter le nombre ${fmt(exemple)} de différentes façons.</div>
          <ul class="representations">${lignes.map((l) => `<li>${l}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="methode__relation">${relation}</div>`;
  },
  exercices(contenu, methode) {
    const { lire, ecrire, decomp, recomp, combien, tableau } = this.combien(contenu, methode);
    const dec = (t, vides, corrige) => termesDe(t).map((v, i) => (vides.includes(i) ? (corrige ? rouge(fmt(v)) : trou) : fmt(v))).join(' + ');
    return `
    <div class="bloc">
      <h2>Exercice 1 — Écris chaque nombre en chiffres, ou en lettres.</h2>
      <ul class="lignes">
        ${lire.map((n, i) => `<li><span class="ligne__texte">${lettre(i)}. ${enLettres(n)}</span><span class="ligne__egal">=</span><span class="pointilles pointilles--ligne"></span></li>`).join('')}
      </ul>
      <ul class="lignes">
        ${ecrire.map((n, i) => `<li><span class="ligne__texte">${lettre(lire.length + i)}. ${fmt(n)}</span><span class="ligne__egal">=</span><span class="pointilles pointilles--ligne"></span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Complète les décompositions, puis recompose les nombres.</h2>
      <ul class="lignes lignes--deux">
        ${decomp.map(({ n, vides }, i) => `<li><span class="ligne__texte">${lettre(i)}. ${fmt(n)} = ${dec(n, vides, false)}</span></li>`).join('')}
        ${recomp.map((n, i) => `<li><span class="ligne__texte">${lettre(decomp.length + i)}. ${termesDe(n).map(fmt).join(' + ')} =</span>${trou}</li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Combien de dizaines et de centaines en tout dans chaque nombre ?</h2>
      <ul class="lignes lignes--deux">
        ${combien.map((n, i) => `<li><span class="ligne__texte">${lettre(i)}. Dans ${fmt(n)} :</span>${trou}<span class="ligne__texte">dizaines ;</span>${trou}<span class="ligne__texte">centaines</span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Range chaque nombre dans les colonnes, ou écris le nombre.</h2>
      <div class="tableaux">
        ${tableauNumeration(tableau, contenu.quatre, false, 'nombre')}
        ${tableauNumeration(tableau, contenu.quatre, false, 'colonnes')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { lire, ecrire, decomp, recomp, combien, tableau } = this.combien(contenu, methode);
    const dec = (t, vides) => termesDe(t).map((v, i) => (vides.includes(i) ? rouge(fmt(v)) : fmt(v))).join(' + ');
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <ul class="lignes lignes--deux lignes--corrigees">
        ${lire.map((n, i) => `<li><span class="ligne__texte">${lettre(i)}. ${enLettres(n)} = ${rouge(fmt(n))}</span></li>`).join('')}
      </ul>
      <ul class="lignes lignes--corrigees">
        ${ecrire.map((n, i) => `<li><span class="ligne__texte">${lettre(lire.length + i)}. ${fmt(n)} = ${rouge(enLettres(n))}</span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <ul class="lignes lignes--deux lignes--corrigees">
        ${decomp.map(({ n, vides }, i) => `<li><span class="ligne__texte">${lettre(i)}. ${fmt(n)} = ${dec(n, vides)}</span></li>`).join('')}
        ${recomp.map((n, i) => `<li><span class="ligne__texte">${lettre(decomp.length + i)}. ${termesDe(n).map(fmt).join(' + ')} = ${rouge(fmt(n))}</span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <ul class="lignes lignes--deux lignes--corrigees">
        ${combien.map((n, i) => `<li><span class="ligne__texte">${lettre(i)}. Dans ${fmt(n)} : ${rouge(Math.floor(n / 10))} dizaines ; ${rouge(Math.floor(n / 100))} centaines</span></li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="tableaux">
        ${tableauNumeration(tableau, contenu.quatre, true, 'nombre')}
        ${tableauNumeration(tableau, contenu.quatre, true, 'colonnes')}
      </div>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — nombres : comparer, ranger, encadrer, demi-droite graduée      */
/* ------------------------------------------------------------------ */

const chiffresListe = (n) => String(n).split('').map(Number);
const deChiffres = (t) => t.reduce((n, c) => n * 10 + c, 0);
const symboleDe = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const VALEUR_UNITE = { dizaine: 10, centaine: 100, millier: 1000 };
const bornesDe = (n, unite) => { const u = VALEUR_UNITE[unite]; const inf = Math.floor(n / u) * u; return [inf, inf + u]; };

// Une paire à comparer. Les « genres » sont les pièges de la leçon : nombre de chiffres différent,
// même début, dernier chiffre seul qui change, zéro intercalé, nombres égaux.
function paireDe(genre, chif) {
  let a, b;
  if (genre === 'chiffres') { a = rnd(100, 999); b = rnd(1000, 9999); }
  else if (genre === 'egal') { a = nombreDe(chif); b = a; }
  else if (genre === 'dernier') { a = nombreDe(chif); while (a % 10 === 9) a = nombreDe(chif); b = a + 1; }
  else if (genre === 'premier') { do { a = nombreDe(chif); b = nombreDe(chif); } while (String(a)[0] === String(b)[0]); }
  else if (genre === 'milieu') {
    const x = chiffresListe(nombreDe(chif));
    const k = rnd(1, chif - 2);
    const y = x.map((c, i) => (i < k ? c : rnd(0, 9)));
    y[k] = (x[k] + rnd(1, 9)) % 10;
    a = deChiffres(x); b = deChiffres(y);
  } else if (genre === 'zero') {          // un zéro intercalé d'un seul côté : 4 075 et 4 705
    const x = chiffresListe(nombreDe(chif)); x[1] = 0;
    const y = x.map((c, i) => (i === 1 ? rnd(1, 9) : i > 1 ? rnd(0, 9) : c));
    a = deChiffres(x); b = deChiffres(y);
  } else {                                // 'zero2' : le même zéro des deux côtés, c'est le chiffre suivant qui décide
    const x = chiffresListe(nombreDe(chif)); x[1] = 0;
    const y = x.map((c, i) => (i === 2 ? (x[2] + rnd(1, 9)) % 10 : i > 2 ? rnd(0, 9) : c));
    a = deChiffres(x); b = deChiffres(y);
  }
  return rnd(0, 1) && a !== b ? { a: b, b: a } : { a, b };
}

// k nombres à ranger, mélangés ; deux d'entre eux commencent par le même chiffre.
function listeARanger(chif, k) {
  for (let essai = 0; essai < 500; essai++) {
    const t = [];
    const premier = nombreDe(chif);
    t.push(premier, rnd(Number(String(premier)[0]) * 10 ** (chif - 1), Number(String(premier)[0]) * 10 ** (chif - 1) + 10 ** (chif - 1) - 1));
    while (t.length < k) t.push(nombreDe(chif));
    if (new Set(t).size < k) continue;
    const m = shuffle(t);
    const trie = (l, sens) => [...l].sort((x, y) => sens * (x - y)).join() === l.join();
    const ok = [m, m.slice(0, k - 1)].every((l) => !trie(l, 1) && !trie(l, -1));
    if (ok) return m;
  }
  return shuffle([1234, 1243, 4321, 2134, 3412, 4123]).slice(0, k);
}

function genererNombresComparer(options) {
  const quatre = options.taille !== '1000';
  const chif = quatre ? 4 : 3;
  const [lo, hi] = quatre ? [1001, 8999] : [101, 899];

  // Les 6 premières paires servent avec le rappel de méthode, les 2 dernières s'ajoutent sans lui.
  const genresDebut = shuffle([quatre ? 'chiffres' : 'premier', 'zero', 'egal', 'dernier', 'milieu', 'zero2']);
  const genres = [...genresDebut, ...shuffle(['premier', 'milieu'])];
  const vues = new Set();
  const paires = genres.map((g) => {
    for (let essai = 0; essai < 200; essai++) {
      const p = paireDe(g, chif);
      const cle = [p.a, p.b].sort().join('/');
      if (!vues.has(cle)) { vues.add(cle); return p; }
    }
    return paireDe(g, chif);
  });

  const croissant = listeARanger(chif, 6);
  const decroissant = listeARanger(chif, 6);

  // Encadrer : la dizaine, la centaine, puis le millier (ou une 2e centaine avec 3 chiffres).
  const unites = quatre ? ['dizaine', 'centaine', 'millier', 'centaine'] : ['dizaine', 'centaine', 'centaine', 'dizaine'];
  const dejaVus = new Set();
  const encadrer = unites.map((unite) => {
    for (;;) {
      const n = rnd(lo, hi);
      if (n % VALEUR_UNITE[unite] !== 0 && !dejaVus.has(n)) { dejaVus.add(n); return { n, unite }; }
    }
  });

  // Intercaler : entre deux centaines consécutives, entre deux nombres plus proches, entre deux dizaines.
  const intercaler = ['centaine', 'quelconque', 'dizaine'].map((genre) => {
    let a, b;
    if (genre === 'centaine') { a = 100 * rnd(Math.ceil(lo / 100), Math.floor(hi / 100) - 1); b = a + 100; }
    else if (genre === 'dizaine') { a = 10 * rnd(Math.ceil(lo / 10), Math.floor(hi / 10) - 1); b = a + 10; }
    else { do { a = rnd(lo, hi - 100); } while (a % 10 === 0); b = a + rnd(12, 60); }
    return { a, b, v: rnd(a + 1, b - 1) };
  });

  // Demi-droite : une graduation de 100 en 100 (jusqu'à 1 000) ou de 1 000 en 1 000 (jusqu'à 10 000), petits traits
  // au dixième. 6 nombres rangés dans 6 tranches : deux nombres sont toujours éloignés d'au moins 8 petits traits.
  const petit = quatre ? 100 : 10;
  const points = Array.from({ length: 6 }, (_, i) => {
    const candidats = [];
    for (let u = 5 + 15 * i + 4; u <= 5 + 15 * (i + 1) - 4; u++) if (u % 10 !== 0) candidats.push(u);
    return pick(candidats) * petit;
  });
  const ordre = (() => { let o; do { o = shuffle([0, 1, 2, 3, 4, 5]); } while (o.every((v, i) => v === i)); return o; })();

  return {
    quatre, chif,
    objectif: 'Je sais comparer, ranger et encadrer des nombres entiers, et les placer sur une demi-droite graduée.',
    paires, croissant, decroissant, encadrer, intercaler,
    droite: { max: petit * 100, grand: petit * 10, petit, points, ordre },
  };
}

const NOM_UNITE = { dizaine: 'à la dizaine', centaine: 'à la centaine', millier: 'au millier' };
const nb = (n) => `<span class="n">${fmt(n)}</span>`;
const trouBorne = '<span class="trou-borne"></span>';

const miseComparer = {
  signe: '',
  combien: (contenu, methode) => ({
    paires: contenu.paires.slice(0, methode ? 6 : 8),
    croissant: contenu.croissant.slice(0, methode ? 5 : 6),
    decroissant: contenu.decroissant.slice(0, methode ? 5 : 6),
    encadrer: contenu.encadrer.slice(0, methode ? 3 : 4),
    intercaler: contenu.intercaler.slice(0, methode ? 2 : 3),
  }),
  // Les nombres de la demi-droite : 4 (ou 6 sans le rappel), présentés dans le désordre.
  droite(contenu, methode) {
    const indices = methode ? [0, 2, 3, 5] : [0, 1, 2, 3, 4, 5];
    const { points, ordre } = contenu.droite;
    return { ...contenu.droite, valeurs: indices.map((i) => points[i]), aPlacer: ordre.filter((i) => indices.includes(i)).map((i) => points[i]) };
  },
  noteCorrige: 'les réponses attendues sont en rouge. Pour intercaler, plusieurs nombres conviennent : un seul est donné. Sur la demi-droite, chaque flèche pointe la graduation du nombre.',
  // Rappel : les phrases et les exemples de la leçon (pages 10 à 13 du livret).
  rappel(contenu) {
    const quatre = contenu.quatre;
    const sym = (t) => t.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const suite = (t) => `<span class="n">${sym(t)}</span>`;   // les symboles ne doivent jamais ouvrir une balise
    const exemples = (quatre
      ? ['506 < 2 302', '7 532 > 6 985', '6 427 < 6 500', '9 483 > 9 468', '1 238 < 1 239']
      : ['427 < 500', '532 > 498', '483 > 468', '238 < 239']).map(sym);
    const rang = quatre
      ? 'on regarde le nombre de milliers ; si c’est le même, on regarde le nombre de centaines ; si c’est le même, on regarde le nombre de dizaines…'
      : 'on regarde le nombre de centaines ; si c’est le même, on regarde le nombre de dizaines ; si c’est le même, on regarde le nombre d’unités.';
    const croiss = suite(quatre ? '5 254 < 5 285 < 5 308 < 5 347' : '254 < 285 < 308 < 347');
    const decroiss = suite(quatre ? '5 470 > 5 108 > 3 285 > 752' : '470 > 308 > 285 > 108');
    const enc = suite(quatre ? '5 800 < 5 823 < 5 900' : '800 < 823 < 900');
    return `
      <div class="rappel-comp">
        <div class="rappel-comp__col">
          <div class="rappel-comp__titre">Comparer deux nombres</div>
          <p>Comparer deux nombres, c’est chercher quel nombre est le plus grand et quel nombre est le plus petit.</p>
          <p>Pour trouver, ${rang} On s’arrête dès que deux chiffres de même rang sont différents.</p>
          <ul class="rappel-comp__exemples">${exemples.map((e) => `<li>${e}</li>`).join('')}</ul>
          <p>Les symboles : <b>&lt;</b> plus petit que, <b>&gt;</b> plus grand que, <b>=</b> égal à.</p>
        </div>
        <div class="rappel-comp__col">
          <p><b>Ranger</b> des nombres dans l’ordre croissant, c’est les écrire du plus petit au plus grand : ${croiss}.<br>
          Dans l’ordre décroissant, c’est les écrire du plus grand au plus petit : ${decroiss}.</p>
          <p><b>Encadrer</b> un nombre entier, c’est le situer entre deux autres nombres entiers. <b>Intercaler</b> un nombre entre deux nombres, c’est trouver un nombre compris entre ces deux nombres : ${enc}.</p>
          <p>Pour placer des nombres sur une demi-droite graduée, il faut connaître la valeur de l’écart entre deux graduations.</p>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { paires, croissant, decroissant, encadrer, intercaler } = this.combien(contenu, methode);
    const d = this.droite(contenu, methode);
    const ligneRang = (l, i, sens) => `
        <div class="rang">
          <div class="rang__nombres"><b>${lettre(i)}.</b> ${l.map(nb).join('&nbsp;; ')}</div>
          <div class="rang__reponse">${l.map(() => '<span class="pointilles pointilles--rang"></span>').join(`<span class="rang__signe">${sens}</span>`)}</div>
        </div>`;
    return `
    <div class="bloc">
      <h2>Exercice 1 — Compare avec &lt;, &gt; ou =.</h2>
      <div class="paires">
        ${paires.map((p, i) => `<div class="paire"><b>${lettre(i)}.</b> <span class="paire__a">${nb(p.a)}</span><span class="case-symbole"></span><span class="paire__b">${nb(p.b)}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Range ces nombres, du plus petit au plus grand, puis du plus grand au plus petit.</h2>
      <div class="rangs">
        ${ligneRang(croissant, 0, '&lt;')}
        ${ligneRang(decroissant, 1, '&gt;')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Encadre chaque nombre, puis intercale un nombre entre les deux nombres donnés.</h2>
      <div class="encadrements">
        <ul class="lignes">
          ${encadrer.map(({ n, unite }, i) => `<li class="encadrement"><span class="ligne__texte"><b>${lettre(i)}.</b> ${NOM_UNITE[unite]} :</span>${trouBorne}<span class="rang__signe">&lt;</span>${nb(n)}<span class="rang__signe">&lt;</span>${trouBorne}</li>`).join('')}
        </ul>
        <ul class="lignes">
          ${intercaler.map(({ a, b }, i) => `<li class="intercalation"><span class="ligne__texte"><b>${lettre(encadrer.length + i)}.</b></span>${nb(a)}<span class="rang__signe">&lt;</span>${trouBorne}<span class="rang__signe">&lt;</span>${nb(b)}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Place chaque nombre sur la demi-droite graduée : trace une flèche.</h2>
      <p class="consigne-droite">Cette demi-droite est graduée de ${fmt(d.grand)} en ${fmt(d.grand)} ; chaque petit trait vaut ${fmt(d.petit)}.
        Nombres à placer : ${d.aPlacer.map(nb).join('&nbsp;; ')}</p>
      ${demiDroite({ max: d.max, grand: d.grand, petit: d.petit })}
    </div>
`;
  },
  corriges(contenu, methode) {
    const { paires, croissant, decroissant, encadrer, intercaler } = this.combien(contenu, methode);
    const d = this.droite(contenu, methode);
    const croissants = [...croissant].sort((x, y) => x - y), decroissants = [...decroissant].sort((x, y) => y - x);
    const sequence = (l, s) => l.map((n) => rouge(nb(n))).join(` <span class="rang__signe">${s}</span> `);
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="paires paires--corrigees">
        ${paires.map((p, i) => `<div class="paire"><b>${lettre(i)}.</b> <span class="paire__a">${nb(p.a)}</span><span class="paire__symbole rouge">${symboleDe(p.a, p.b)}</span><span class="paire__b">${nb(p.b)}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="rangs rangs--corriges">
        <div class="rang"><div class="rang__reponse rang__reponse--corrige" data-sens="croissant"><b>a.</b> ${sequence(croissants, '&lt;')}</div></div>
        <div class="rang"><div class="rang__reponse rang__reponse--corrige" data-sens="decroissant"><b>b.</b> ${sequence(decroissants, '&gt;')}</div></div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="encadrements encadrements--corriges">
        <ul class="lignes lignes--corrigees">
          ${encadrer.map(({ n, unite }, i) => { const [inf, sup] = bornesDe(n, unite); return `<li class="encadrement"><span class="ligne__texte"><b>${lettre(i)}.</b> ${NOM_UNITE[unite]} :</span><span class="borne">${rouge(fmt(inf))}</span><span class="rang__signe">&lt;</span>${nb(n)}<span class="rang__signe">&lt;</span><span class="borne">${rouge(fmt(sup))}</span></li>`; }).join('')}
        </ul>
        <ul class="lignes lignes--corrigees">
          ${intercaler.map(({ a, b, v }, i) => `<li class="intercalation"><span class="ligne__texte"><b>${lettre(encadrer.length + i)}.</b></span>${nb(a)}<span class="rang__signe">&lt;</span><span class="borne">${rouge(fmt(v))}</span><span class="rang__signe">&lt;</span>${nb(b)}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      ${demiDroite({ max: d.max, grand: d.grand, petit: d.petit, points: d.valeurs, corrige: true })}
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — fractions : lire, écrire, représenter                          */
/* ------------------------------------------------------------------ */

// Les noms du livret (pages 22 et 23), puis 7 et 9 pour les figures seulement.
const NOM_FRACTION = { 2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 7: 'septième', 8: 'huitième', 9: 'neuvième', 10: 'dixième' };
const DEN_LIVRET = [2, 3, 4, 5, 6, 8, 10];
const DEN_CARRE = [4, 6, 8, 9, 10];   // dénominateurs qu'une grille partage en cases égales
// « trois quarts », « un demi » : le nom prend un s quand il y en a plusieurs.
const enMots = (n, d) => `${enLettres(n)} ${NOM_FRACTION[d]}${n > 1 && d !== 3 ? 's' : ''}`;   // « deux tiers » : tiers ne change pas

// Une vraie fraction : le numérateur sur le dénominateur, séparés par un trait.
const fraction = (n, d, classe = '') =>
  `<span class="fraction${classe ? ` ${classe}` : ''}" data-n="${n}" data-d="${d}"><span class="fraction__num">${n}</span><span class="fraction__den">${d}</span></span>`;
const fractionVide = () =>
  '<span class="fraction fraction--vide"><span class="fraction__num"><span class="case-fr"></span></span><span class="fraction__den"><span class="case-fr"></span></span></span>';
const fractionRouge = (n, d) => fraction(n, d, 'fraction--reponse rouge');

// Les affirmations du vrai-ou-faux : une par modèle, vraie ou non. Les phrases viennent de la leçon.
const MODELES_AFFIRMATION = ['den', 'num', 'nom', 'ecrit', 'parts', 'colorie', 'fois'];

function affirmationDe(modele, vrai) {
  // Un autre dénominateur, plus grand que le numérateur : la fausse écriture reste une vraie fraction.
  const autre = (d, n) => pick(DEN_LIVRET.filter((x) => x !== d && x > n));
  const unitaire = modele === 'nom' || modele === 'ecrit';   // ces deux modèles acceptent 1/2
  const d = pick(unitaire ? DEN_LIVRET : DEN_LIVRET.filter((x) => x >= 3));
  const n = modele === 'nom' ? 1 : modele === 'ecrit' ? rnd(1, Math.min(d - 1, 5)) : rnd(2, d - 1);
  if (modele === 'parts' || modele === 'colorie') return { modele, vrai };
  let x;
  if (modele === 'den') x = vrai ? d : n;
  else if (modele === 'num') x = vrai ? n : d;
  else if (modele === 'fois') x = vrai ? n : d;
  else x = vrai ? d : autre(d, n);   // 'nom' et 'ecrit' : le dénominateur annoncé
  return { modele, n, d, x, vrai };
}

function genererFractions() {
  // Ex. 1 : figures partagées, dénominateurs tous différents, numérateur < dénominateur.
  const depart = rnd(0, 1);
  const lire = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 8)
    .map((d, i) => ({ forme: (i + depart) % 2 ? 'bande' : 'disque', parts: d, n: rnd(1, d - 1) }));

  // Ex. 2 : figures vierges, dont une grille ; la grille a un dénominateur qu'elle sait partager.
  const formes = shuffle(['disque', 'bande', 'carre', pick(['disque', 'bande', 'carre'])]);
  const pris = new Set();
  const colorier = formes.map((forme) => {
    const permis = (forme === 'carre' ? DEN_CARRE : [2, 3, 4, 5, 6, 7, 8, 9, 10]).filter((d) => !pris.has(d));
    const d = pick(permis);
    pris.add(d);
    return { forme, parts: d, n: rnd(1, d - 1) };
  });

  // Ex. 3 : 6 fractions à écrire en lettres, 6 à écrire en chiffres, jamais la même des deux côtés.
  const six = (premiereUnitaire) => shuffle(DEN_LIVRET).slice(0, 6).map((d, i) => ({ d, n: premiereUnitaire && i === 0 ? 1 : rnd(1, d - 1) }));
  const lettres = six(true);
  let chiffres;
  do { chiffres = six(false); } while (chiffres.some((c) => lettres.some((l) => l.n === c.n && l.d === c.d)));

  // Ex. 4 : 6 affirmations, autant de vraies que de non vraies parmi les 4 premières, puis 1 de chaque.
  const vrais = [...shuffle([true, true, false, false]), ...shuffle([true, false])];
  const affirmations = shuffle(MODELES_AFFIRMATION).slice(0, 6).map((m, i) => affirmationDe(m, vrais[i]));

  return {
    objectif: 'Je sais lire et écrire une fraction.',
    lire, colorier, lettres, chiffres, affirmations,
  };
}

const case_ = (lettreCase, cochee) => `<span class="case-vf${cochee ? ' case-vf--cochee' : ''}" data-choix="${lettreCase}">${lettreCase}${cochee ? '<span class="coche rouge">✓</span>' : ''}</span>`;

function texteAffirmation(a) {
  const F = (n, d) => fraction(n, d);
  switch (a.modele) {
    case 'den': return `Dans ${F(a.n, a.d)}, le dénominateur est ${a.x}.`;
    case 'num': return `Dans ${F(a.n, a.d)}, le numérateur est ${a.x}.`;
    case 'nom': return `${F(1, a.d)}, c’est un ${NOM_FRACTION[a.x]}.`;
    case 'ecrit': return `${enMots(a.n, a.d)} s’écrit ${F(a.n, a.x)}.`;
    case 'fois': return `${F(a.n, a.d)}, c’est ${enLettres(a.x)} fois ${F(1, a.d)}.`;
    case 'parts': return a.vrai
      ? 'Le dénominateur indique en combien de parts égales on partage l’unité.'
      : 'Le dénominateur indique combien de parts on a coloriées.';
    default: return a.vrai
      ? 'Le numérateur indique combien de parts on a coloriées.'
      : 'Le numérateur indique en combien de parts égales on partage l’unité.';
  }
}

// Largeur des figures à l'écran, en pixels : 22 mm pour un disque, plus large pour une bande en cases.
const LARGEUR_FIGURE = { disque: 84, bande: 112, carre: 84 };
const LARGEUR_FIGURE_GRANDE = { disque: 90, bande: 130, carre: 90 };

const miseFractions = {
  signe: '',
  combien: (contenu, methode) => ({
    lire: contenu.lire.slice(0, methode ? 6 : 8),
    colorier: contenu.colorier.slice(0, 4),
    lettres: contenu.lettres.slice(0, methode ? 4 : 6),
    chiffres: contenu.chiffres.slice(0, methode ? 4 : 6),
    affirmations: contenu.affirmations.slice(0, methode ? 4 : 6),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; sur les figures de l’exercice 2, les parts à colorier sont grisées. Dans l’exercice 4, la case cochée est la bonne.',
  // Rappel : les phrases et les figures de la leçon (pages 22 à 25 du livret).
  rappel() {
    const noms = [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 8], [1, 10]]
      .map(([n, d]) => `<li>${fraction(n, d)} : <b>un ${NOM_FRACTION[d]}</b></li>`).join('');
    return `
      <div class="rappel-frac">
        <div class="rappel-frac__col">
          ${figureFraction({ forme: 'bande', parts: 4, coloriees: 3, taille: 120 })}
          <p>La bande de papier correspond à une unité, c’est-à-dire à 1. Elle est partagée en quatre parts égales : on a donc des quarts. Chaque part représente un quart.
          ${fraction(1, 4)}, c’est quand il en faut 4 pour faire 1.</p>
          <p>On a colorié trois parts. Cela représente trois quarts. Trois quarts, c’est trois fois un quart. Trois quarts s’écrit ${fraction(3, 4)}.</p>
        </div>
        <div class="rappel-frac__col">
          <div class="rappel-frac__vedette">
            ${figureFraction({ forme: 'disque', parts: 4, coloriees: 3, taille: 70 })}
            ${fraction(3, 4, 'fraction--grande')}
          </div>
          <p>Dans la fraction ${fraction(3, 4)}, le nombre du bas indique qu’on a des quarts et le nombre du haut qu’on a trois quarts.</p>
          <p><b>4 est le dénominateur</b> : il indique qu’on a partagé l’unité en 4 parts égales.<br>
          <b>3 est le numérateur</b> : il indique qu’on a colorié 3 fois une part.</p>
        </div>
        <ul class="rappel-frac__noms">${noms}</ul>
      </div>`;
  },
  exercices(contenu, methode) {
    const { lire, colorier, lettres, chiffres, affirmations } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1 — Écris la fraction représentée par chaque figure.</h2>
      <div class="figures-lire figures-lire--${lire.length}">
        ${lire.map((f, i) => `<div class="figure-cellule"><b class="figure-cellule__lettre">${lettre(i)}.</b>
          <div class="figure-cellule__dessin">${figureFraction({ forme: f.forme, parts: f.parts, coloriees: f.n, taille: LARGEUR_FIGURE[f.forme] })}</div>
          ${fractionVide()}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Colorie la fraction demandée.</h2>
      <div class="figures-colorier">
        ${colorier.map((f, i) => `<div class="figure-cellule"><b class="figure-cellule__lettre">${lettre(i)}.</b>
          <div class="figure-cellule__dessin">${figureFraction({ forme: f.forme, parts: f.parts, coloriees: 0, taille: LARGEUR_FIGURE_GRANDE[f.forme] })}</div>
          ${fraction(f.n, f.parts, 'fraction--demandee')}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Écris chaque fraction en lettres, puis chaque fraction en chiffres.</h2>
      <div class="ecritures">
        <div>
          <div class="sous-titre">En lettres</div>
          <ul class="lignes lignes--lettres">
            ${lettres.map((f, i) => `<li class="ecriture ecriture--lettres"><b>${lettre(i)}.</b> ${fraction(f.n, f.d)}<span class="pointilles pointilles--ligne"></span></li>`).join('')}
          </ul>
        </div>
        <div>
          <div class="sous-titre">En chiffres</div>
          <ul class="lignes lignes--chiffres lignes--n${chiffres.length}">
            ${chiffres.map((f, i) => `<li class="ecriture ecriture--chiffres"><b>${lettre(i)}.</b> <span class="mots">${enMots(f.n, f.d)}</span> =${fractionVide()}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Coche la bonne case : V si c’est vrai, F sinon.</h2>
      <ul class="affirmations">
        ${affirmations.map((a, i) => `<li class="affirmation"><span class="affirmation__texte"><b>${lettre(i)}.</b> ${texteAffirmation(a)}</span><span class="cases-vf">${case_('V', false)}${case_('F', false)}</span></li>`).join('')}
      </ul>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { lire, colorier, lettres, chiffres, affirmations } = this.combien(contenu, methode);
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="figures-lire figures-lire--${lire.length}">
        ${lire.map((f, i) => `<div class="figure-cellule"><b class="figure-cellule__lettre">${lettre(i)}.</b>
          <div class="figure-cellule__dessin">${figureFraction({ forme: f.forme, parts: f.parts, coloriees: f.n, taille: LARGEUR_FIGURE[f.forme] })}</div>
          ${fractionRouge(f.n, f.parts)}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="figures-colorier">
        ${colorier.map((f, i) => `<div class="figure-cellule"><b class="figure-cellule__lettre">${lettre(i)}.</b>
          <div class="figure-cellule__dessin">${figureFraction({ forme: f.forme, parts: f.parts, coloriees: f.n, taille: LARGEUR_FIGURE_GRANDE[f.forme] })}</div>
          ${fraction(f.n, f.parts, 'fraction--demandee')}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="ecritures ecritures--corrigees">
        <div>
          <div class="sous-titre">En lettres</div>
          <ul class="lignes lignes--lettres lignes--corrigees">
            ${lettres.map((f, i) => `<li class="ecriture ecriture--lettres"><b>${lettre(i)}.</b> ${fraction(f.n, f.d)}<span class="mots reponse">${rouge(enMots(f.n, f.d))}</span></li>`).join('')}
          </ul>
        </div>
        <div>
          <div class="sous-titre">En chiffres</div>
          <ul class="lignes lignes--chiffres lignes--n${chiffres.length} lignes--corrigees">
            ${chiffres.map((f, i) => `<li class="ecriture ecriture--chiffres"><b>${lettre(i)}.</b> <span class="mots">${enMots(f.n, f.d)}</span> =${fractionRouge(f.n, f.d)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <ul class="affirmations">
        ${affirmations.map((a, i) => `<li class="affirmation"><span class="affirmation__texte"><b>${lettre(i)}.</b> ${texteAffirmation(a)}</span><span class="cases-vf">${case_('V', a.vrai)}${case_('F', !a.vrai)}</span></li>`).join('')}
      </ul>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — fractions : égales et comparaison                              */
/* ------------------------------------------------------------------ */

const FRACTIONS_DEMI = [[2, 4], [3, 6], [4, 8], [5, 10]];   // la leçon : 2/4, 3/6, 4/8, 5/10 sont égales à 1/2
// « 3 sixièmes », « 2 demis » : le nom prend un s quand il y en a plusieurs (tiers ne change pas).
const nomPluriel = (n, d) => `${n} ${NOM_FRACTION[d]}${n > 1 && d !== 3 ? 's' : ''}`;

function genererFractionsComparer() {
  // Ex. 1 : 10 fractions par liste (8 avec le rappel), 3 ou 4 égales ; les 8 premières en contiennent au moins 2, et au moins 2 non égales.
  const liste = (egales, autre) => {
    for (;;) {
      const eg = shuffle(egales).slice(0, rnd(3, 4)).map(([n, d]) => ({ n, d, egal: true }));
      const non = [];
      while (eg.length + non.length < 10) {
        const f = autre();
        if (![...eg, ...non].some((x) => x.n === f.n && x.d === f.d)) non.push({ ...f, egal: false });
      }
      const t = shuffle([...eg, ...non]);
      const huit = t.slice(0, 8);
      if (huit.filter((f) => f.egal).length >= 2 && huit.filter((f) => !f.egal).length >= 2) return t;
    }
  };
  const demi = liste(FRACTIONS_DEMI, () => {
    for (;;) { const d = rnd(2, 10), n = rnd(1, d - 1); if (n * 2 !== d) return { n, d }; }
  });
  const un = liste([2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => [d, d]), () => { const d = rnd(2, 10); return { n: rnd(1, d - 1), d }; });

  // Ex. 2 : 8 paires de même dénominateur, dénominateurs tous différents (de 3 à 12).
  const memeDen = shuffle([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 8).map((d) => {
    const a = rnd(1, d - 1);
    let b;
    do { b = rnd(1, d - 1); } while (b === a);
    return { d, a, b };
  });

  // Ex. 3 : 6 paires de même numérateur (1 à 4, jamais deux fois la même paire), deux dénominateurs différents plus grands que lui.
  const memeNum = [];
  const vues = new Set();
  while (memeNum.length < 6) {
    const n = rnd(1, 4), a = rnd(Math.max(2, n + 1), 10);
    let b;
    do { b = rnd(Math.max(2, n + 1), 10); } while (b === a);
    const cle = `${n}/${Math.min(a, b)}/${Math.max(a, b)}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    memeNum.push({ n, a, b });
  }

  // Ex. 4 : 2 rangements de 4 fractions de même dénominateur, présentées dans le désordre.
  const ranger = shuffle([5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 2).map((d) => {
    for (;;) {
      const valeurs = shuffle(Array.from({ length: d - 1 }, (_, i) => i + 1)).slice(0, 4);
      if (valeurs.join() !== [...valeurs].sort((x, y) => x - y).join()) return { d, valeurs };
    }
  });

  return {
    objectif: 'Je sais reconnaître des fractions égales et comparer des fractions.',
    demi, un, memeDen, memeNum, ranger,
  };
}

const miseFractionsComparer = {
  signe: '',
  combien: (contenu, methode) => ({
    demi: contenu.demi.slice(0, methode ? 8 : 10),
    un: contenu.un.slice(0, methode ? 8 : 10),
    memeDen: contenu.memeDen.slice(0, methode ? 5 : 8),
    memeNum: contenu.memeNum.slice(0, methode ? 4 : 6),
    ranger: contenu.ranger.slice(0, methode ? 1 : 2),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; dans l’exercice 1, les fractions à entourer sont encerclées. Chaque comparaison rappelle la règle appliquée.',
  // Rappel : les phrases, les exemples et les figures de la leçon (pages 26 à 29 du livret).
  rappel() {
    const paire = (a, b, signe) => `<div class="rappel-fc__figs">${figureFraction({ forme: 'bande', parts: a[0], coloriees: a[1], taille: 104 })}<span class="rappel-fc__signe">${signe}</span>${figureFraction({ forme: 'bande', parts: b[0], coloriees: b[1], taille: 104 })}</div>`;
    const F = (n, d) => fraction(n, d);
    return `
      <div class="rappel-fc">
        <div class="rappel-fc__carte">
          <div class="rappel-fc__titre">Des fractions égales</div>
          ${paire([8, 6], [4, 3], '=')}
          <p>${F(6, 8)} = ${F(3, 4)}. Six huitièmes du gâteau est égal à <b>trois quarts</b> de ce gâteau.</p>
        </div>
        <div class="rappel-fc__carte">
          <div class="rappel-fc__titre">Égales à ${F(1, 2)}</div>
          ${paire([2, 1], [6, 3], '=')}
          <p>Le numérateur est la moitié du dénominateur : ${F(2, 4)} · ${F(3, 6)} · ${F(4, 8)} · ${F(5, 10)} sont égales à ${F(1, 2)}.</p>
        </div>
        <div class="rappel-fc__carte">
          <div class="rappel-fc__titre">Égales à 1</div>
          ${paire([4, 4], [1, 1], '=')}
          <p>Quand le numérateur est égal au dénominateur, la fraction est égale à 1 : ${F(4, 4)} = 1.</p>
        </div>
        <div class="rappel-fc__carte rappel-fc__carte--large">
          <div class="rappel-fc__titre">Même dénominateur (le même nombre en bas)</div>
          ${paire([12, 5], [12, 7], '&lt;')}
          <p>${F(5, 12)} &lt; ${F(7, 12)} : <b>5 douzièmes &lt; 7 douzièmes</b>.<br>La plus grande fraction est celle qui a le plus grand numérateur.</p>
        </div>
        <div class="rappel-fc__carte rappel-fc__carte--large">
          <div class="rappel-fc__titre">Même numérateur (le même nombre en haut)</div>
          ${paire([6, 3], [10, 3], '&gt;')}
          <p>${F(1, 6)} &gt; ${F(1, 10)} : <b>1 sixième</b> est plus grand que <b>1 dixième</b>. Lorsqu’on partage un gâteau en 6 parts égales, on fait moins de parts que lorsqu’on le partage en 10 parts égales, donc chaque part d’un sixième est <b>plus grande</b> que chaque part d’un dixième. ${F(3, 6)} &gt; ${F(3, 10)} : <b>3 sixièmes</b> est plus grand que <b>3 dixièmes</b>.</p>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { demi, un, memeDen, memeNum, ranger } = this.combien(contenu, methode);
    const ligne = (l, cible) => `<div class="entoures"><span class="entoures__cible">Égales à ${cible} :</span>${l.map((f) => `<span class="entoure">${fraction(f.n, f.d)}</span>`).join('')}</div>`;
    const cote = (f, d) => `${fraction(f, d)}`;
    return `
    <div class="bloc">
      <h2>Exercice 1 — Entoure les fractions égales à ${fraction(1, 2)}, puis les fractions égales à 1.</h2>
      ${ligne(demi, fraction(1, 2))}
      ${ligne(un, '1')}
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Compare avec &lt; ou &gt;.</h2>
      <div class="paires-fr paires-fr--${memeDen.length}">
        ${memeDen.map((p, i) => `<div class="paire-fr"><b>${lettre(i)}.</b>${cote(p.a, p.d)}<span class="case-symbole"></span>${cote(p.b, p.d)}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Compare avec &lt; ou &gt;. Les figures peuvent t’aider.</h2>
      <div class="paires-fr paires-fr--fig paires-fr--fig${memeNum.length}">
        ${memeNum.map((p, i) => `<div class="paire-fr-cellule"><div class="paire-fr"><b>${lettre(i)}.</b>${cote(p.n, p.a)}<span class="case-symbole"></span>${cote(p.n, p.b)}</div>
          <div class="appui">${figureFraction({ forme: 'bande', parts: p.a, coloriees: p.n, taille: 118 })}${figureFraction({ forme: 'bande', parts: p.b, coloriees: p.n, taille: 118 })}</div></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Range les fractions du plus petit au plus grand.</h2>
      <div class="rangs rangs--fr">
        ${ranger.map((r, i) => `<div class="rang">
          <div class="rang__nombres"><b>${lettre(i)}.</b> ${r.valeurs.map((n) => fraction(n, r.d)).join('<span class="rang__sep">;</span>')}</div>
          <div class="rang__reponse">${r.valeurs.map(() => '<span class="pointilles pointilles--rang"></span>').join('<span class="rang__signe">&lt;</span>')}</div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { demi, un, memeDen, memeNum, ranger } = this.combien(contenu, methode);
    const ligne = (l, cible) => `<div class="entoures"><span class="entoures__cible">Égales à ${cible} :</span>${l.map((f) => `<span class="entoure${f.egal ? ' entoure--oui' : ''}"${f.egal ? ' data-egal="oui"' : ''}>${fraction(f.n, f.d)}</span>`).join('')}</div>`;
    const sym = (a, b) => (a < b ? '&lt;' : '&gt;');
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      ${ligne(demi, fraction(1, 2))}
      ${ligne(un, '1')}
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="paires-fr paires-fr--${memeDen.length}">
        ${memeDen.map((p, i) => `<div class="paire-fr-cellule"><div class="paire-fr"><b>${lettre(i)}.</b>${fraction(p.a, p.d)}<span class="case-symbole case-symbole--rep rouge">${sym(p.a, p.b)}</span>${fraction(p.b, p.d)}</div>
          <div class="regle">même dénominateur : ${p.a} ${sym(p.a, p.b)} ${p.b}</div></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="paires-fr paires-fr--fig paires-fr--fig${memeNum.length}">
        ${memeNum.map((p, i) => `<div class="paire-fr-cellule"><div class="paire-fr"><b>${lettre(i)}.</b>${fraction(p.n, p.a)}<span class="case-symbole case-symbole--rep rouge">${sym(p.b, p.a)}</span>${fraction(p.n, p.b)}</div>
          <div class="appui">${figureFraction({ forme: 'bande', parts: p.a, coloriees: p.n, taille: 118 })}${figureFraction({ forme: 'bande', parts: p.b, coloriees: p.n, taille: 118 })}</div>
          <div class="regle">même numérateur : ${nomPluriel(p.n, p.a)} ${sym(p.b, p.a)} ${nomPluriel(p.n, p.b)}</div></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="rangs rangs--fr">
        ${ranger.map((r, i) => {
          const tri = [...r.valeurs].sort((x, y) => x - y);
          return `<div class="rang">
          <div class="rang__nombres"><b>${lettre(i)}.</b> ${r.valeurs.map((n) => fraction(n, r.d)).join('<span class="rang__sep">;</span>')}</div>
          <div class="rang__reponse rang__reponse--corrige">${tri.map((n) => fractionRouge(n, r.d)).join('<span class="rang__signe">&lt;</span>')}<span class="regle regle--rang">même dénominateur : ${tri.join(' &lt; ')}</span></div>
        </div>`;
        }).join('')}
      </div>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — fractions : mesurer, additionner, soustraire                   */
/* ------------------------------------------------------------------ */

const intervalle = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const nbDenominateurs = (liste) => new Set(liste.map((x) => x.d)).size;

function genererFractionsCalculer(options) {
  const dens = options.denominateur === '10' ? intervalle(2, 10) : [2, 3, 4];

  // Ex. 1 : 6 bandes de moins d'une unité, toutes différentes ; les 4 premières (avec le rappel) n'ont pas toutes le même dénominateur.
  const paires = dens.flatMap((d) => intervalle(1, d - 1).map((n) => ({ n, d })));
  let mesures;
  do { mesures = shuffle(paires).slice(0, 6); } while (nbDenominateurs(mesures.slice(0, 4)) < 2 || nbDenominateurs(mesures) < 3);

  // Ex. 2 : 8 additions de même dénominateur, toutes différentes, somme au plus égale à l'unité.
  const sommes = dens.flatMap((d) => intervalle(1, d - 1).flatMap((a) => intervalle(1, d - a).map((b) => ({ a, b, d }))));
  let additions;
  do { additions = shuffle(sommes).slice(0, 8); } while (nbDenominateurs(additions.slice(0, 5)) < 2 || nbDenominateurs(additions) < 3);

  // Ex. 3 : 8 soustractions de même dénominateur, résultat strictement positif.
  const differences = dens.flatMap((d) => intervalle(2, d).flatMap((a) => intervalle(1, a - 1).map((b) => ({ a, b, d }))));
  let soustractions;
  do { soustractions = shuffle(differences).slice(0, 8); } while (nbDenominateurs(soustractions.slice(0, 5)) < 2 || nbDenominateurs(soustractions) < 3);

  // Ex. 4 : 3 problèmes — un gâteau, un ruban, puis un ruban : une addition et une soustraction au moins.
  const [p, q] = shuffle(PRENOMS);
  const [premier, second] = shuffle(['+', '−']);
  const probleme = (modele, op) => {
    const d = pick(dens.filter((x) => (op === '+' ? x >= 2 : x >= 3)));
    if (op === '+') { const a = rnd(1, d - 1); return { modele, op, d, a, b: rnd(1, d - a), p, q }; }
    const a = rnd(2, d);
    return { modele, op, d, a, b: rnd(1, a - 1), p, q };
  };
  const problemes = [probleme('gateau', premier), probleme('ruban', second), probleme('ruban', premier)];

  return {
    objectif: 'Je sais mesurer des longueurs de bandes avec une règle graduée en fractions d’unité, et additionner ou soustraire des fractions de même dénominateur.',
    mesures, additions, soustractions, problemes,
  };
}

const resultatProbleme = (pb) => (pb.op === '+' ? pb.a + pb.b : pb.a - pb.b);

function enonceProbleme(pb) {
  const F = (n) => fraction(n, pb.d);
  if (pb.modele === 'gateau') {
    return pb.op === '+'
      ? `${pb.p} mange ${F(pb.a)} d’un gâteau et ${pb.q} en mange ${F(pb.b)}. Quelle fraction du gâteau ont-ils mangée ?`
      : `Il reste ${F(pb.a)} d’un gâteau. ${pb.p} en mange ${F(pb.b)}. Quelle fraction du gâteau reste-t-il ?`;
  }
  return pb.op === '+'
    ? `Un ruban rouge mesure ${F(pb.a)} de mètre et un ruban bleu ${F(pb.b)} de mètre. On les met bout à bout. Quelle est la longueur totale ?`
    : `Un ruban mesure ${F(pb.a)} de mètre. On en coupe ${F(pb.b)} de mètre. Quelle longueur de ruban reste-t-il ?`;
}

function phraseProbleme(pb) {
  const R = fractionRouge(resultatProbleme(pb), pb.d);
  if (pb.modele === 'gateau') return pb.op === '+' ? `${pb.p} et ${pb.q} ont mangé ${R} du gâteau.` : `Il reste ${R} du gâteau.`;
  return pb.op === '+' ? `La longueur totale est de ${R} de mètre.` : `Il reste ${R} de mètre de ruban.`;
}

const REGLE_CALCUL = { '+': 'on additionne les numérateurs, le dénominateur ne change pas', '−': 'on soustrait les numérateurs, le dénominateur ne change pas' };

const miseFractionsCalculer = {
  signe: '',
  combien: (contenu, methode) => ({
    mesures: contenu.mesures.slice(0, methode ? 4 : 6),
    additions: contenu.additions.slice(0, methode ? 5 : 8),
    soustractions: contenu.soustractions.slice(0, methode ? 5 : 8),
    problemes: contenu.problemes.slice(0, methode ? 2 : 3),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; chaque bande est redessinée sur sa règle avec sa mesure, et chaque calcul rappelle la règle appliquée.',
  // Rappel : les phrases, les exemples et les schémas de la leçon (pages 30 et 31 du livret).
  rappel() {
    const F = (n, d) => fraction(n, d);
    return `
      <div class="rappel-fcal">
        <div class="rappel-fcal__carte">
          ${regleFractions({ unite: 1, parts: 4, longueur: 3, taille: 200 })}
          <p>La longueur de la bande est égale à <b>trois quarts d’unité</b> ou à ${F(3, 4)} d’unité.</p>
        </div>
        <div class="rappel-fcal__carte">
          ${regleFractions({ unite: 1, parts: 4, longueur: 2, taille: 200 })}
          <p>La longueur de la bande est égale à ${F(2, 4)} d’unité ou ${F(1, 2)} d’unité.</p>
        </div>
        <div class="rappel-fcal__carte">
          ${regleFractions({ unite: 3, parts: 4, longueur: 9, taille: 200 })}
          <p>La longueur de la bande est égale à <b>2 unités et 1 quart d’unité</b> ou à 2 unités et ${F(1, 4)} d’unité.</p>
        </div>
        <div class="rappel-fcal__calcul">
          <div class="rappel-fcal__titre">Additionner</div>
          <div class="rappel-fcal__egalite">${F(3, 8)} + ${F(4, 8)} = ${F(7, 8)}</div>
          <p><b>3 huitièmes + 4 huitièmes = 7 huitièmes</b><br>On additionne les numérateurs, le dénominateur ne change pas.</p>
        </div>
        <div class="rappel-fcal__calcul">
          <div class="rappel-fcal__titre">Soustraire</div>
          <div class="rappel-fcal__egalite">${F(4, 5)} − ${F(1, 5)} = ${F(3, 5)}</div>
          <p><b>4 cinquièmes − 1 cinquième = 3 cinquièmes</b><br>On soustrait les numérateurs, le dénominateur ne change pas.</p>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { mesures, additions, soustractions, problemes } = this.combien(contenu, methode);
    const calcul = (c, i, signe) => `<div class="calc"><b>${lettre(i)}.</b><span class="calc__eq">${fraction(c.a, c.d)} ${signe} ${fraction(c.b, c.d)} =${fractionVide()}</span></div>`;
    return `
    <div class="bloc">
      <h2>Exercice 1 — Mesure chaque bande avec la règle graduée. Écris la fraction.</h2>
      <div class="mesures mesures--${mesures.length}">
        ${mesures.map((m, i) => `<div class="mesure"><b class="mesure__lettre">${lettre(i)}.</b>
          <div class="mesure__fig">${regleFractions({ unite: 1, parts: m.d, longueur: m.n, taille: 230 })}</div>
          <div class="mesure__rep">=${fractionVide()}<span>d’unité</span></div></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Additionne.</h2>
      <div class="calculs calculs--${additions.length}">
        ${additions.map((c, i) => calcul(c, i, '+')).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Soustrais.</h2>
      <div class="calculs calculs--${soustractions.length}">
        ${soustractions.map((c, i) => calcul(c, i, '−')).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous chaque problème.</h2>
      <div class="problemes-fr">
        ${problemes.map((pb, i) => `<div class="probleme-fr">
          <p class="probleme-fr__enonce"><b>${lettre(i)}.</b> ${enonceProbleme(pb)}</p>
          <div class="probleme-fr__ligne"><span>Calcul :</span><span class="pointilles pointilles--ligne"></span></div>
          <div class="probleme-fr__ligne"><span>Phrase réponse :</span><span class="pointilles pointilles--ligne"></span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { mesures, additions, soustractions, problemes } = this.combien(contenu, methode);
    const calcul = (c, i, signe) => {
      const r = signe === '+' ? c.a + c.b : c.a - c.b;
      return `<div class="calc calc--corrige"><b>${lettre(i)}.</b><span class="calc__eq">${fraction(c.a, c.d)} ${signe} ${fraction(c.b, c.d)} =${fractionRouge(r, c.d)}</span><span class="calc__regle">: ${REGLE_CALCUL[signe]}</span></div>`;
    };
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="mesures mesures--${mesures.length}">
        ${mesures.map((m, i) => `<div class="mesure"><b class="mesure__lettre">${lettre(i)}.</b>
          <div class="mesure__fig">${regleFractions({ unite: 1, parts: m.d, longueur: m.n, taille: 230 })}</div>
          <div class="mesure__rep mesure__rep--corrige"><span class="mesure__ligne">=${fractionRouge(m.n, m.d)}<span>d’unité</span></span><span class="mesure__mots rouge">${enMots(m.n, m.d)}</span></div></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="calculs calculs--corriges">
        ${additions.map((c, i) => calcul(c, i, '+')).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="calculs calculs--corriges">
        ${soustractions.map((c, i) => calcul(c, i, '−')).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="problemes-fr">
        ${problemes.map((pb, i) => `<div class="probleme-fr">
          <p class="probleme-fr__enonce"><b>${lettre(i)}.</b> ${enonceProbleme(pb)}</p>
          <div class="probleme-fr__ligne"><span>Calcul :</span><span class="probleme-fr__rep">${fraction(pb.a, pb.d)} ${pb.op} ${fraction(pb.b, pb.d)} =${fractionRouge(resultatProbleme(pb), pb.d)}</span></div>
          <div class="probleme-fr__ligne"><span>Phrase réponse :</span><span class="probleme-fr__rep">${phraseProbleme(pb)}</span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — monnaie : composer une somme, rendre la monnaie                */
/* ------------------------------------------------------------------ */

// Tous les montants sont calculés en centimes d'euro (des entiers), jamais en décimaux.
const NBSP = ' ';
const eur = (c) => { const e = Math.floor(c / 100), r = c % 100; return r === 0 ? `${e}${NBSP}€` : `${e},${String(r).padStart(2, '0')}${NBSP}€`; };
const cts = (c) => `${c}${NBSP}c`;
// Un complément : « 40 c » sous l'euro, « 7 € » au-delà.
const montant = (c) => (c < 100 ? cts(c) : eur(c));
const nomValeur = (v) => (v >= 100 ? eur(v) : cts(v));

const VALEURS_ENTIERES = [...BILLETS_EURO, ...PIECES_EURO.filter((v) => v >= 100)].sort((a, b) => b - a);
const VALEURS_TOUTES = [...BILLETS_EURO, ...PIECES_EURO].sort((a, b) => b - a);

// Le moins de pièces et de billets possible : on prend toujours le plus grand possible (le système de l'euro s'y prête).
function composer(somme, valeurs) {
  const out = [];
  let reste = somme;
  for (const v of valeurs) {
    const n = Math.floor(reste / v);
    if (n) { out.push({ v, n }); reste -= n * v; }
  }
  return out;
}
const nbPieces = (compo) => compo.reduce((s, x) => s + x.n, 0);
const ecritureCompo = (compo) => compo.map(({ v, n }) => `${n} × ${nomValeur(v)}`).join(' + ');

// La méthode de la leçon : on complète à l'euro suivant (avec les centimes), ou à la dizaine d'euros suivante
// (euros entiers), puis au billet. S'il n'y a pas d'étape intermédiaire avant le billet, une seule étape.
function complement(prix, billet, centimes) {
  const B = billet * 100, pas = centimes ? 100 : 1000;
  const etapes = [];
  let cur = prix;
  if (prix % pas !== 0) {
    const inter = Math.ceil(prix / pas) * pas;
    if (inter < B) { etapes.push({ de: cur, vers: inter, diff: inter - cur }); cur = inter; }
  }
  etapes.push({ de: cur, vers: B, diff: B - cur });
  return { etapes, rendu: B - prix };
}
const phraseComplement = ({ etapes, rendu }) => `${etapes.map((e) => `De ${eur(e.de)} à ${eur(e.vers)}, il faut ${montant(e.diff)}.`).join(' ')} Le vendeur rend ${eur(rendu)}.`;

// Les articles : [nom, prix minimum, prix maximum] en euros entiers.
const ARTICLES = [
  ['un cahier', 1, 5], ['un stylo', 1, 4], ['une règle', 1, 3], ['une trousse', 3, 12], ['un livre de contes', 5, 19],
  ['un puzzle', 6, 24], ['un ballon', 4, 18], ['un jeu de cartes', 3, 9], ['une casquette', 6, 19], ['un tee-shirt', 8, 25],
  ['une peluche', 7, 29], ['un sac à dos', 15, 45], ['un jeu de société', 10, 39], ['une paire de chaussettes', 3, 9],
  ['une boîte de feutres', 3, 12], ['un album de coloriage', 2, 8], ['un cerf-volant', 5, 29], ['un dictionnaire', 10, 29],
];
const ARTICLES_PETITS = ARTICLES.filter(([, , max]) => max <= 12);

// Un prix en centimes pour l'article, au plus `eMax` euros pleins : euros entiers, ou avec des centimes (multiples de 5).
const prixDe = (article, centimes, eMax) => {
  const e = rnd(article[1], Math.min(article[2], eMax));
  return centimes ? e * 100 + 5 * rnd(1, 19) : e * 100;
};

function genererMonnaie(options) {
  const centimes = options.centimes !== 'non';

  // Ex. 1 : 6 sommes dont la composition la plus courte compte 4 à 7 pièces et billets (de plus en plus grandes).
  const plages = centimes ? [[3, 12], [5, 19], [10, 29], [20, 49], [4, 15], [15, 49]] : [[13, 39], [41, 69], [71, 99], [101, 149], [23, 59], [61, 189]];
  const valeurs = centimes ? VALEURS_TOUTES : VALEURS_ENTIERES;
  const vues = new Set();
  const sommes = plages.map(([min, max]) => {
    for (let essai = 0; essai < 500; essai++) {
      const s = rnd(min, max) * 100 + (centimes ? 5 * rnd(1, 19) : 0);
      const n = nbPieces(composer(s, valeurs));
      if (n >= (centimes ? 4 : 3) && n <= 6 + (centimes ? 1 : 0) && !vues.has(s)) { vues.add(s); return s; }
    }
    return (min + 1) * 100 + (centimes ? 85 : 0);
  });

  // Ex. 2 : avec les centimes, des conversions « 3 € 25 c = … c » et « 540 c = … € … c » ; sinon des additions d'euros entiers.
  let conversions = null, additions = null;
  if (centimes) {
    const dejaVu = new Set();
    conversions = Array.from({ length: 6 }, (_, i) => {
      for (;;) {
        const vers = i % 2 === 0 ? 'cts' : 'eur';
        const total = rnd(1, 9) * 100 + 5 * rnd(1, 19);
        const cle = `${vers}${total}`;
        if (!dejaVu.has(cle)) { dejaVu.add(cle); return { vers, total }; }
      }
    });
  } else {
    const dejaVu = new Set();
    additions = [3, 3, 4, 4, 4, 4].map((k) => {
      for (;;) {
        const termes = Array.from({ length: k }, () => pick([1, 2, 5, 10, 20, 50])).sort((a, b) => b - a);
        const total = termes.reduce((s, t) => s + t, 0);
        if (new Set(termes).size >= 2 && total >= 10 && !dejaVu.has(total)) { dejaVu.add(total); return { termes }; }
      }
    });
  }

  // Ex. 3 : 6 achats payés avec 10, 20 ou 50 €. Avec les centimes, toujours deux étapes (l'euro suivant, puis le billet).
  const queue = [...shuffle([10, 20, 50]), ...shuffle([10, 20, 50])];
  const pris = new Set();
  const achats = queue.map((billet) => {
    for (let essai = 0; essai < 1000; essai++) {
      const a = pick(ARTICLES);
      if (pris.has(a[0])) continue;
      const eMax = centimes ? billet - 2 : billet - 1;
      if (Math.max(a[1], 1) > eMax) continue;
      const prix = prixDe(a, centimes, eMax);
      if (!centimes && prix % 1000 === 0) continue;
      pris.add(a[0]);
      return { nom: a[0], prix, billet };
    }
    throw new Error('monnaie : pas d’article pour ce billet');
  });

  // Ex. 4 : 3 problèmes (2, 3 puis 3 articles), le total reste sous le billet, avec une étape intermédiaire.
  const [p, q, r] = shuffle(PRENOMS);
  const problemes = [[p, 2, [10, 20]], [q, 3, [20, 50]], [r, 3, [20, 50]]].map(([prenom, k, billets]) => {
    const billet = pick(billets);
    for (let essai = 0; essai < 2000; essai++) {
      const noms = shuffle(ARTICLES_PETITS).slice(0, k);
      const articles = noms.map((a) => ({ nom: a[0], prix: prixDe(a, centimes, 9) }));
      const total = articles.reduce((s, x) => s + x.prix, 0);
      const pas = centimes ? 100 : 1000;
      const inter = Math.ceil(total / pas) * pas;
      // total non rond, sous le billet ; avec les centimes, l'euro suivant reste sous le billet
      if (total % pas === 0 || total >= billet * 100 || (centimes && inter >= billet * 100)) continue;
      return { prenom, articles, billet };
    }
    throw new Error('monnaie : pas de problème possible');
  });

  return {
    centimes,
    objectif: 'Je sais composer une somme avec des pièces et des billets, et je sais rendre la monnaie.',
    sommes, conversions, additions, achats, problemes,
  };
}

const totalProbleme = (pb) => pb.articles.reduce((s, x) => s + x.prix, 0);
const listeArticles = (articles) => {
  const t = articles.map((a) => `${a.nom} à ${eur(a.prix)}`);
  return t.length > 1 ? `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}` : t[0];
};

// Petit schéma de droite comme dans le livret : un saut du prix à l'euro suivant, un autre jusqu'au billet,
// et une grande flèche au-dessus pour la monnaie rendue.
function schemaComplement({ prix, inter, billet }) {
  const x1 = 40, x2 = 130, x3 = 300, y = 66;
  const saut = (xa, xb, pic, texte, fort) => {
    const m = (xa + xb) / 2, trait = fort ? 2.6 : 2;
    return `<path d="M${xa} ${y - 4} Q${m} ${y - 2 * pic - 4} ${xb} ${y - 8}" fill="none" stroke="#222" stroke-width="${trait}" stroke-linecap="round"/>
      <path d="M${xb - 6} ${y - 14} L${xb} ${y - 5} L${xb + 6} ${y - 14}" fill="none" stroke="#222" stroke-width="${trait}" stroke-linejoin="round" stroke-linecap="round"/>
      <text x="${m}" y="${fort ? y - pic - 9 : y + 41}" font-size="13" font-weight="800" fill="#C0392B" text-anchor="middle">${texte}</text>`;
  };
  const point = (x, t) => `<line x1="${x}" y1="${y - 6}" x2="${x}" y2="${y + 8}" stroke="#222" stroke-width="2.4"/>
      <text x="${x}" y="${y + 25}" font-size="13" font-weight="700" fill="#222" text-anchor="middle">${t}</text>`;
  return `<svg class="schema-monnaie" viewBox="0 0 340 108" xmlns="http://www.w3.org/2000/svg" role="img"
    aria-label="Droite : de ${eur(prix)} à ${eur(inter)}, plus ${montant(inter - prix)}, puis à ${eur(billet)}, plus ${montant(billet - inter)} ; en tout plus ${eur(billet - prix)}">
    <line x1="20" y1="${y}" x2="326" y2="${y}" stroke="#222" stroke-width="2.4"/>
    ${point(x1, eur(prix))}${point(x2, eur(inter))}${point(x3, eur(billet))}
    <g class="saut saut--petit">${saut(x1, x2, 12, `+${NBSP}${montant(inter - prix)}`, false)}</g>
    <g class="saut">${saut(x2, x3, 12, `+${NBSP}${montant(billet - inter)}`, false)}</g>
    <g class="saut saut--grand">${saut(x1, x3, 40, `+${NBSP}${eur(billet - prix)}`, true)}</g>
  </svg>`;
}

const miseMonnaie = {
  signe: '',
  combien: (contenu, methode) => ({
    sommes: contenu.sommes.slice(0, methode ? 4 : 6),
    conversions: contenu.conversions ? contenu.conversions.slice(0, methode ? 4 : 6) : null,
    additions: contenu.additions ? contenu.additions.slice(0, methode ? 4 : 6) : null,
    achats: contenu.achats.slice(0, methode ? 4 : 6),
    problemes: contenu.problemes.slice(0, methode ? 2 : 3),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; chaque somme est composée avec le moins de pièces et de billets possible, et chaque monnaie rendue est détaillée comme dans la leçon : on complète à l’euro suivant, puis au billet.',
  // Rappel : les billets et les pièces, 1 € = 100 c, et la méthode de la leçon (page 32 du livret).
  rappel() {
    return `
      <div class="rappel-mon">
        <div class="rappel-mon__monnaie">
          <p class="rappel-mon__titre">La monnaie que nous utilisons s’appelle l’euro : €.</p>
          <div class="rappel-mon__rang"><span>Les billets</span>${monnaie([...BILLETS_EURO].reverse(), { taille: 400 })}</div>
          <div class="rappel-mon__pieces">
            <div class="rappel-mon__rang"><span>Les pièces en euro</span>${monnaie([100, 200], { taille: 92 })}</div>
            <div class="rappel-mon__rang"><span>Les pièces en centime d’euro</span>${monnaie([1, 2, 5, 10, 20, 50], { taille: 250 })}</div>
          </div>
          <p class="rappel-mon__egalite">1 euro, c’est 100 centimes d’euro.<br><b>1${NBSP}€ = 100${NBSP}c</b></p>
        </div>
        <div class="rappel-mon__rendre">
          <p>Pour <b>rendre la monnaie</b> sur ${eur(2000)} pour un achat de ${eur(1260)}, je cherche le complément à ${eur(2000)} de ${eur(1260)}.<br>
          <b>Je complète à ${eur(1300)} puis à ${eur(2000)}.</b></p>
          ${schemaComplement({ prix: 1260, inter: 1300, billet: 2000 })}
          <p>De ${eur(1260)} pour aller à ${eur(1300)}, il faut ${cts(40)}.<br>
          De ${eur(1300)} pour aller à ${eur(2000)}, il faut ${eur(700)}.<br>
          Le vendeur doit rendre ${eur(700)} + ${cts(40)} soit en tout <b>${eur(740)}</b>.</p>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { sommes, conversions, additions, achats, problemes } = this.combien(contenu, methode);
    const pts = '<span class="pointilles pointilles--ligne"></span>';
    return `
    <div class="bloc">
      <h2>Exercice 1 — Compose chaque somme avec le moins de pièces et de billets possible.</h2>
      <p class="consigne-mon">Écris par exemple : … × 20${NBSP}€ + … × 5${NBSP}€ + …</p>
      <ul class="sommes">
        ${sommes.map((s, i) => `<li class="somme"><b>${lettre(i)}.</b><span class="somme__montant">${eur(s)}</span><span>=</span>${pts}</li>`).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — ${contenu.centimes ? 'Convertis.' : 'Additionne les sommes.'}</h2>
      <div class="conversions">
        ${contenu.centimes
    ? conversions.map((c, i) => `<div class="conversion"><b>${lettre(i)}.</b>${c.vers === 'cts'
      ? `<span>${Math.floor(c.total / 100)}${NBSP}€ ${c.total % 100}${NBSP}c =</span><span class="pointilles pointilles--mini"></span><span>c</span>`
      : `<span>${c.total}${NBSP}c =</span><span class="pointilles pointilles--mini"></span><span>€</span><span class="pointilles pointilles--mini"></span><span>c</span>`}</div>`).join('')
    : additions.map((a, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${a.termes.map((t) => eur(t * 100)).join(' + ')} =</span><span class="pointilles pointilles--mini"></span><span>€</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Rends la monnaie.</h2>
      <div class="achats">
        ${achats.map((a, i) => `<div class="achat">
          <p class="achat__enonce"><b>${lettre(i)}.</b> J’achète ${a.nom} à ${eur(a.prix)}. Je paie avec un billet de ${eur(a.billet * 100)}.</p>
          <div class="achat__ligne"><span>Je complète à <span class="pointilles pointilles--mini"></span> € :</span>${pts}</div>
          <div class="achat__ligne"><span>Le vendeur rend :</span>${pts}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous chaque problème.</h2>
      <div class="problemes-mon">
        ${problemes.map((pb, i) => `<div class="probleme-mon">
          <p class="probleme-mon__enonce"><b>${lettre(i)}.</b> ${pb.prenom} achète ${listeArticles(pb.articles)}. ${pb.prenom} paie avec un billet de ${eur(pb.billet * 100)}. Quel est le prix total ? Combien le vendeur rend-il ?</p>
          <div class="probleme-mon__lignes"><div class="achat__ligne"><span>Prix total :</span>${pts}</div><div class="achat__ligne"><span>Monnaie rendue :</span>${pts}</div></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { sommes, conversions, additions, achats, problemes } = this.combien(contenu, methode);
    const valeurs = contenu.centimes ? VALEURS_TOUTES : VALEURS_ENTIERES;
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <ul class="sommes sommes--corrigees">
        ${sommes.map((s, i) => { const c = composer(s, valeurs); return `<li class="somme"><b>${lettre(i)}.</b><span class="somme__montant">${eur(s)}</span><span>=</span><span class="rouge somme__compo">${ecritureCompo(c)}</span><span class="somme__total">(${nbPieces(c)} pièces ou billets)</span></li>`; }).join('')}
      </ul>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="conversions conversions--corrigees">
        ${contenu.centimes
    ? conversions.map((c, i) => `<div class="conversion"><b>${lettre(i)}.</b>${c.vers === 'cts'
      ? `<span>${Math.floor(c.total / 100)}${NBSP}€ ${c.total % 100}${NBSP}c = <span class="rouge">${c.total}${NBSP}c</span></span>`
      : `<span>${c.total}${NBSP}c = <span class="rouge">${Math.floor(c.total / 100)}${NBSP}€ ${c.total % 100}${NBSP}c</span></span>`}</div>`).join('')
    : additions.map((a, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${a.termes.map((t) => eur(t * 100)).join(' + ')} = <span class="rouge">${eur(a.termes.reduce((s, t) => s + t, 0) * 100)}</span></span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="achats achats--corriges">
        ${achats.map((a, i) => `<div class="achat achat--corrige"><b>${lettre(i)}.</b> ${nomPrix(a)}<span class="rouge achat__detail">${phraseComplement(complement(a.prix, a.billet, contenu.centimes))}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="problemes-mon problemes-mon--corriges">
        ${problemes.map((pb, i) => {
    const total = totalProbleme(pb);
    return `<div class="probleme-mon"><p class="probleme-mon__enonce"><b>${lettre(i)}.</b> Prix total : ${pb.articles.map((x) => eur(x.prix)).join(' + ')} = <span class="rouge">${eur(total)}</span>.
            <span class="rouge">${phraseComplement(complement(total, pb.billet, contenu.centimes))}</span></p></div>`;
  }).join('')}
      </div>
    </div>
`;
  },
};
const nomPrix = (a) => `Achat de ${eur(a.prix)}, payé avec ${eur(a.billet * 100)}. `;

/* ------------------------------------------------------------------ */
/* CE2 — longueurs : unités, conversions, périmètre                     */
/* ------------------------------------------------------------------ */

// Toutes les longueurs sont des entiers ; chaque unité vaut tant de millimètres.
const MM_PAR = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000 };
const lg = (n, u) => `${fmt(n)}${NBSP}${u}`;

// Conversions simples : [valeur de départ, unité de départ, unité d'arrivée].
const CONVERSIONS_LG = {
  'm>cm': () => [rnd(2, 9), 'm', 'cm'], 'mm>cm': () => [10 * rnd(2, 9), 'mm', 'cm'], 'dm>cm': () => [rnd(2, 9), 'dm', 'cm'],
  'cm>m': () => [100 * rnd(2, 9), 'cm', 'm'], 'km>m': () => [rnd(2, 9), 'km', 'm'], 'm>km': () => [1000 * rnd(2, 9), 'm', 'km'],
  'm>dm': () => [rnd(2, 9), 'm', 'dm'], 'cm>mm': () => [rnd(2, 9), 'cm', 'mm'], 'dm>m': () => [10 * rnd(2, 9), 'dm', 'm'],
  'cm>dm': () => [10 * rnd(3, 9), 'cm', 'dm'],
};

// Écritures mixtes : « 3 700 m = … km … m » (sens 'mixte') ou « 2 km 450 m = … m » (sens 'simple').
// grande/petite : les deux unités ; hi/lo : les deux parties ; `rapport` : combien de petites dans une grande.
const MIXTES_LG = {
  'm>km m': (k) => ({ sens: 'mixte', grande: 'km', petite: 'm', rapport: 1000, hi: rnd(1, 9), lo: 10 * rnd(10, 99) }),
  'km m>m': () => ({ sens: 'simple', grande: 'km', petite: 'm', rapport: 1000, hi: rnd(1, 9), lo: 10 * rnd(10, 99) }),
  'cm>m cm': () => ({ sens: 'mixte', grande: 'm', petite: 'cm', rapport: 100, hi: rnd(1, 4), lo: 5 * rnd(2, 19) }),
  'm cm>cm': (k) => ({ sens: 'simple', grande: 'm', petite: 'cm', rapport: 100, hi: rnd(1, 5), lo: k ? 5 * rnd(2, 19) : rnd(2, 9) }),
  'mm>cm mm': () => ({ sens: 'mixte', grande: 'cm', petite: 'mm', rapport: 10, hi: rnd(2, 9), lo: rnd(1, 9) }),
  'cm mm>mm': () => ({ sens: 'simple', grande: 'cm', petite: 'mm', rapport: 10, hi: rnd(2, 9), lo: rnd(1, 9) }),
};
const totalMixte = (e) => e.hi * e.rapport + e.lo;

// Une paire à comparer : l'unité `ua` est la plus grande ; `genre` 'egal' ou 'inegal'.
function paireLongueurs(ua, ub, genre) {
  const r = MM_PAR[ua] / MM_PAR[ub];
  const base = rnd(2, 9) * r;
  const ecart = (r / 10) * rnd(1, 9);
  const nbB = genre === 'egal' ? base : base + (rnd(0, 1) ? ecart : -ecart);
  const a = { n: base / r, u: ua }, b = { n: nbB, u: ub };
  return rnd(0, 1) ? { a, b } : { a: b, b: a };
}
const mmDe = (x) => x.n * MM_PAR[x.u];

// Quatre longueurs d'unités différentes, mélangées. Avec le km : des km et des m (autour d'un à cinq km) ;
// sans : des m, dm, cm et mm (autour d'un mètre à quatre mètres). Jamais déjà dans l'ordre.
function listeLongueurs(km) {
  for (let essai = 0; essai < 2000; essai++) {
    let liste;
    if (km) {
      const vals = shuffle([500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500]).slice(0, 4);
      liste = vals.map((v) => (v % 1000 === 0 && rnd(0, 1) ? { n: v / 1000, u: 'km' } : { n: v, u: 'm' }));
      if (!liste.some((x) => x.u === 'km') || !liste.some((x) => x.u === 'm')) continue;
    } else {
      const choix = { m: () => rnd(1, 4), dm: () => rnd(4, 40), cm: () => 5 * rnd(6, 80), mm: () => 50 * rnd(6, 80) };
      liste = shuffle(['m', 'dm', 'cm', 'mm']).map((u) => ({ n: choix[u](), u }));
    }
    const v = liste.map(mmDe).sort((a, b) => a - b);
    if (v.some((x, i) => i && x - v[i - 1] < (km ? 400000 : 150))) continue;
    const m = liste.map(mmDe);
    if (m.every((x, i) => !i || x > m[i - 1]) || m.every((x, i) => !i || x < m[i - 1])) continue;
    return liste;
  }
  return km ? [{ n: 2, u: 'km' }, { n: 1500, u: 'm' }, { n: 1, u: 'km' }, { n: 2500, u: 'm' }] : [{ n: 2, u: 'm' }, { n: 150, u: 'cm' }, { n: 18, u: 'dm' }, { n: 1900, u: 'mm' }];
}

// Les figures : un carré, un rectangle, puis un triangle et un pentagone (dans un ordre tiré).
function figuresLongueurs() {
  const carre = { forme: 'carre', cotes: [rnd(4, 9)] };
  const L = rnd(7, 12);
  const rectangle = { forme: 'rectangle', cotes: [L, rnd(3, L - 2)] };
  let triangle;
  for (;;) {
    const t = [rnd(5, 14), rnd(5, 14), rnd(5, 14)];
    const [p, q, s] = [...t].sort((x, y) => x - y);
    if (new Set(t).size > 1 && s < p + q - 2) { triangle = { forme: 'triangle', cotes: t }; break; }
  }
  let pentagone;
  for (;;) {
    const t = Array.from({ length: 5 }, () => rnd(4, 20));
    if (new Set(t).size > 2 && t.reduce((s, x) => s + x, 0) < 100) { pentagone = { forme: 'pentagone', cotes: t }; break; }
  }
  return [carre, rectangle, ...shuffle([triangle, pentagone])];
}
const perimetreLg = (f) => (f.forme === 'carre' ? 4 * f.cotes[0] : f.forme === 'rectangle' ? 2 * (f.cotes[0] + f.cotes[1]) : f.cotes.reduce((s, x) => s + x, 0));
const cotesTour = (f) => (f.forme === 'carre' ? Array(4).fill(f.cotes[0]) : f.forme === 'rectangle' ? [f.cotes[0], f.cotes[1], f.cotes[0], f.cotes[1]] : f.cotes);

function genererLongueurs(options) {
  const km = options.km !== 'non';

  // Ex. 1 : six conversions (huit sans le rappel), dans les deux sens.
  const clesConv = km
    ? [...shuffle(['m>cm', 'mm>cm', 'dm>cm', 'cm>m', 'km>m', 'm>km']), ...shuffle(['dm>m', 'cm>mm'])]
    : [...shuffle(['m>cm', 'mm>cm', 'dm>cm', 'cm>m', 'm>dm', 'cm>mm']), ...shuffle(['dm>m', 'cm>dm'])];
  const conversions = clesConv.map((cle) => { const [n, de, vers] = CONVERSIONS_LG[cle](); return { n, de, vers }; });

  // Ex. 2 : quatre écritures mixtes (six sans le rappel).
  const clesMixtes = km
    ? [...shuffle(['m>km m', 'km m>m', 'cm>m cm', 'm cm>cm']), ...shuffle(['m>km m', 'km m>m'])]
    : [...shuffle(['cm>m cm', 'm cm>cm', 'mm>cm mm', 'cm mm>mm']), ...shuffle(['cm>m cm', 'm cm>cm'])];
  const ecritures = clesMixtes.map((cle, i) => MIXTES_LG[cle](i >= 4));

  // Ex. 3 : quatre comparaisons (six sans le rappel), dont une égalité parmi les quatre premières, puis un rangement.
  const unites = km
    ? [...shuffle([['m', 'cm'], ['km', 'm'], ['dm', 'cm'], ['cm', 'mm']]), ['m', 'dm'], ['km', 'm']]
    : [...shuffle([['m', 'cm'], ['dm', 'cm'], ['cm', 'mm'], ['m', 'dm']]), ['m', 'cm'], ['dm', 'mm']];
  const egale = rnd(0, 3);
  const vues = new Set();
  const comparaisons = unites.map(([ua, ub], i) => {
    for (let essai = 0; essai < 100; essai++) {
      const p = paireLongueurs(ua, ub, i === egale ? 'egal' : 'inegal');
      const cle = `${lg(p.a.n, p.a.u)}/${lg(p.b.n, p.b.u)}`;
      if (!vues.has(cle)) { vues.add(cle); return p; }
    }
    return paireLongueurs(ua, ub, 'inegal');
  });
  const rangement = listeLongueurs(km);

  return {
    km,
    objectif: km
      ? 'Je connais les relations entre mm, cm, dm, m et km, et je sais calculer le périmètre d’une figure.'
      : 'Je connais les relations entre mm, cm, dm et m, et je sais calculer le périmètre d’une figure.',
    methode: { exemple: { forme: 'pentagone', cotes: [18, 12, 30, 7, 20] } },
    conversions, ecritures, comparaisons, rangement, figures: figuresLongueurs(),
  };
}

const lgn = (n, u) => `<span class="n">${lg(n, u)}</span>`;
const sommeLg = (f) => `${cotesTour(f).map((c) => lg(c, 'cm')).join(' + ')} = ${lg(perimetreLg(f), 'cm')}`;

const miseLongueurs = {
  signe: '',
  combien: (contenu, methode) => ({
    conversions: contenu.conversions.slice(0, methode ? 6 : 8),
    ecritures: contenu.ecritures.slice(0, methode ? 4 : 6),
    comparaisons: contenu.comparaisons.slice(0, methode ? 4 : 6),
    figures: contenu.figures.slice(0, methode ? 3 : 4),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; pour chaque périmètre, on additionne les longueurs de tous les côtés de la figure, comme dans la leçon.',
  // Rappel : les phrases et l'exemple de la leçon (pages 33 à 36 du livret).
  rappel(contenu) {
    const km = contenu.km;
    return `
      <div class="rappel-lg">
        <div class="rappel-lg__relations">
          <p>Le centimètre est une unité de longueur dix fois plus grande que le millimètre. <b>1${NBSP}cm = 10${NBSP}mm</b></p>
          <p>Le mètre est une unité de longueur cent fois plus grande que le centimètre. <b>1${NBSP}m = 100${NBSP}cm</b></p>
          <p>Le mètre est une unité de longueur dix fois plus grande que le décimètre. <b>1${NBSP}m = 10${NBSP}dm</b></p>
          <p>Le décimètre est une unité de longueur dix fois plus grande que le centimètre. <b>1${NBSP}dm = 10${NBSP}cm</b></p>
          ${km ? `<p>Le kilomètre est une unité de longueur 1${NBSP}000 fois plus grande que le mètre. <b>1${NBSP}km = 1${NBSP}000${NBSP}m</b></p>
          <p>On peut exprimer une longueur de différentes façons : <b>5${NBSP}km, c’est 5${NBSP}000${NBSP}m.</b> <b>3${NBSP}700${NBSP}m, c’est 3${NBSP}km 700${NBSP}m.</b></p>` : ''}
        </div>
        <div class="rappel-lg__perimetre">
          <p><b>Le périmètre d’une figure est la longueur du tour de cette figure.</b></p>
          <div class="rappel-lg__exemple">
            ${polygoneCote({ ...contenu.methode.exemple, taille: 150 })}
            <p>On calcule le périmètre d’une figure en additionnant les longueurs de tous les côtés de la figure.<br>
            <b>30${NBSP}cm + 12${NBSP}cm + 18${NBSP}cm + 20${NBSP}cm + 7${NBSP}cm = 87${NBSP}cm</b><br>
            Le périmètre de cette figure mesure 87${NBSP}cm.</p>
          </div>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { conversions, ecritures, comparaisons, figures } = this.combien(contenu, methode);
    const pts = '<span class="pointilles pointilles--mini"></span>';
    const k = comparaisons.length;
    return `
    <div class="bloc">
      <h2>Exercice 1 — Convertis.</h2>
      <div class="conversions conversions--3">
        ${conversions.map((c, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${lg(c.n, c.de)} =</span>${pts}<span>${c.vers}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Écris la longueur autrement.</h2>
      <div class="conversions">
        ${ecritures.map((e, i) => `<div class="conversion"><b>${lettre(i)}.</b>${e.sens === 'mixte'
    ? `<span>${lg(totalMixte(e), e.petite)} =</span>${pts}<span>${e.grande}</span>${pts}<span>${e.petite}</span>`
    : `<span>${lg(e.hi, e.grande)} ${lg(e.lo, e.petite)} =</span>${pts}<span>${e.petite}</span>`}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Compare avec &lt;, &gt; ou =, puis range les longueurs du plus petit au plus grand.</h2>
      <div class="paires paires--lg${k === 4 ? ' paires--lg4' : ''}">
        ${comparaisons.map((p, i) => `<div class="paire"><b>${lettre(i)}.</b> <span class="paire__a">${lgn(p.a.n, p.a.u)}</span><span class="case-symbole"></span><span class="paire__b">${lgn(p.b.n, p.b.u)}</span></div>`).join('')}
      </div>
      <div class="rangs rangs--lg">
        <div class="rang">
          <div class="rang__nombres"><b>${lettre(k)}.</b> ${contenu.rangement.map((x) => lgn(x.n, x.u)).join('&nbsp;; ')}</div>
          <div class="rang__reponse">${contenu.rangement.map(() => '<span class="pointilles pointilles--rang"></span>').join('<span class="rang__signe">&lt;</span>')}</div>
        </div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Calcule le périmètre de chaque figure.</h2>
      <div class="figures-lg figures-lg--${figures.length}">
        ${figures.map((f, i) => `<div class="figure-lg">
          <div class="figure-lg__dessin"><b>${lettre(i)}.</b>${polygoneCote({ ...f, taille: 150 })}</div>
          <div class="calcul-lg"><span class="calcul-lg__debut">Calcul :</span><span class="pointilles pointilles--ligne"></span><span class="calcul-lg__fin"><span>=</span><span class="pointilles pointilles--mini"></span><span>cm</span></span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { conversions, ecritures, comparaisons, figures } = this.combien(contenu, methode);
    const k = comparaisons.length;
    const croissant = [...contenu.rangement].sort((x, y) => mmDe(x) - mmDe(y));
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="conversions conversions--3 conversions--corrigees">
        ${conversions.map((c, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${lg(c.n, c.de)} = ${rouge(lg(c.n * MM_PAR[c.de] / MM_PAR[c.vers], c.vers))}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="conversions conversions--corrigees">
        ${ecritures.map((e, i) => `<div class="conversion"><b>${lettre(i)}.</b>${e.sens === 'mixte'
    ? `<span>${lg(totalMixte(e), e.petite)} = ${rouge(`${lg(e.hi, e.grande)} ${lg(e.lo, e.petite)}`)}</span>`
    : `<span>${lg(e.hi, e.grande)} ${lg(e.lo, e.petite)} = ${rouge(lg(totalMixte(e), e.petite))}</span>`}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="paires paires--lg paires--corrigees${k === 4 ? ' paires--lg4' : ''}">
        ${comparaisons.map((p, i) => `<div class="paire"><b>${lettre(i)}.</b> <span class="paire__a">${lgn(p.a.n, p.a.u)}</span><span class="paire__symbole rouge">${symboleDe(mmDe(p.a), mmDe(p.b))}</span><span class="paire__b">${lgn(p.b.n, p.b.u)}</span></div>`).join('')}
      </div>
      <div class="rangs rangs--corriges rangs--lg">
        <div class="rang"><div class="rang__reponse rang__reponse--corrige" data-sens="croissant"><b>${lettre(k)}.</b> ${croissant.map((x) => rouge(lgn(x.n, x.u))).join(' <span class="rang__signe">&lt;</span> ')}</div></div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="figures-lg figures-lg--corrigees figures-lg--${figures.length}">
        ${figures.map((f, i) => `<div class="figure-lg">
          <div class="figure-lg__dessin"><b>${lettre(i)}.</b>${polygoneCote({ ...f, taille: 130 })}</div>
          <div class="calcul-lg calcul-lg--corrige"><span class="calcul-lg__debut">Calcul :</span> ${rouge(sommeLg(f))}</div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — heures : lire l'heure sur une horloge à aiguilles              */
/* ------------------------------------------------------------------ */

// « 8 h 05 » : les minutes sur deux chiffres, espaces insécables.
const hm = (h, m) => `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
const plage = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const MOINS_H = { 35: 25, 40: 20, 45: 'le quart', 50: 10, 55: 5 };   // la leçon : moins 25 → 35, moins 20 → 40, moins le quart → 45…

// Lecture d'une horloge d'après l'exercice 2 : « 8 heures moins 10 » (7 h 50), « 7 heures et demie » (7 h 30).
const lectureH = ({ h, m }) => (m === 30 ? `${h} heures et demie` : `${h + 1} heures moins ${MOINS_H[m]}`);
const heureLue = ({ h, m }) => hm(h, m);
const nomPeriode = { 'apres-midi': 'l’après-midi', soir: 'le soir' };

function genererHeures(options) {
  const quarts = options.minutes === 'quarts';
  const toutes = quarts ? [0, 15, 30, 45] : plage(0, 11).map((k) => 5 * k);
  const hautes = quarts ? [45] : [35, 40, 45, 50, 55];

  // Une suite de (h, m) tous différents ; `tirage(i)` propose le i-ème couple.
  const suite = (n, tirage) => {
    const vus = new Set();
    return Array.from({ length: n }, (_, i) => {
      let x;
      for (let essai = 0; essai < 200; essai++) { x = tirage(i); if (!vus.has(`${x.h}:${x.m}`)) break; }
      vus.add(`${x.h}:${x.m}`);
      return x;
    });
  };

  // Ex. 1 : huit horloges du matin (six avec le rappel) ; les six premières contiennent toujours une heure pile,
  // « et quart », « et demie » et « moins le quart », les autres minutes sont tirées dans l'option.
  const autres = quarts ? Array.from({ length: 4 }, () => pick(toutes)) : shuffle(toutes.filter((m) => m % 15)).slice(0, 4);
  const minutesLire = [...shuffle([0, 15, 30, 45, autres[0], autres[1]]), autres[2], autres[3]];
  const lire = suite(8, (i) => ({ h: rnd(6, 11), m: minutesLire[i] }));

  // Ex. 2 : « moins » (minutes 35 à 55) ; avec l'option quarts, « moins le quart » ou « et demie ».
  const heuresMoins = shuffle(plage(2, 11));
  const minutesMoins = quarts
    ? [...shuffle([45, 30, 45, 30]), ...shuffle([45, 30])]
    : [...shuffle(hautes), pick(hautes)];
  const moins = minutesMoins.map((m, i) => ({ h: heuresMoins[i], m }));

  // Ex. 3 : cadrans vierges ; parmi les quatre premiers, une heure où la petite aiguille est proche de l'heure suivante.
  const basses = toutes.filter((m) => m <= 30);
  const minutesTracer = [...shuffle([pick(basses), pick(hautes), pick(toutes), pick(toutes)]), pick(toutes), pick(toutes)];
  const heuresTracer = shuffle(plage(1, 12));
  const tracer = minutesTracer.map((m, i) => ({ h: heuresTracer[i], m }));

  // Ex. 4 : l'après-midi (1 h à 5 h) ou le soir (6 h à 11 h) ; deux de chaque parmi les quatre premières.
  const periodes = [...shuffle(['apres-midi', 'soir', 'apres-midi', 'soir']), ...shuffle(['apres-midi', 'soir'])];
  const apresMidi = shuffle(plage(1, 5)), soirs = shuffle(plage(6, 11));
  const vingtQuatre = periodes.map((periode, i) => {
    const h = periode === 'apres-midi' ? apresMidi.shift() : soirs.shift();
    return { h, m: pick(toutes), periode };
  });

  return {
    minutes: quarts ? 'quarts' : 'cinq',
    objectif: 'Je sais lire l’heure sur une horloge à aiguilles et les horaires comme 8 heures moins 10.',
    methode: {},
    lire, moins, tracer, vingtQuatre,
  };
}

// Une grille d'horloges ; `cartes` : un bloc HTML par horloge.
const grilleH = (cartes, colonnes, classe = '') => `<div class="horloges${classe ? ` ${classe}` : ''}" style="--nb:${colonnes}">${cartes.join('')}</div>`;
const caseH = '<span class="case-h"></span>';
const TITRE_ELEVE = 'Horloge à aiguilles';

const miseHeures = {
  signe: '',
  combien: (contenu, methode) => ({
    lire: contenu.lire.slice(0, methode ? 6 : 8),
    moins: contenu.moins.slice(0, methode ? 4 : 6),
    tracer: contenu.tracer.slice(0, methode ? 4 : 6),
    vingtQuatre: contenu.vingtQuatre.slice(0, methode ? 4 : 6),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; l’heure lue est écrite sous chaque horloge, les aiguilles à tracer sont dessinées sur les cadrans, et l’heure de l’après-midi ou du soir s’écrit sur 24 heures (12 heures de plus).',
  // Rappel : les phrases et les exemples de la leçon (pages 37 et 38 du livret).
  rappel() {
    return `
      <div class="rappel-h">
        <div class="rappel-h__partie">
          ${horloge({ heures: 8, minutes: 13, taille: 84, titre: 'Horloge qui indique 8 heures 13' })}
          <div class="rappel-h__texte">
            <p><b>La petite aiguille indique les heures.</b><br><b>La grande aiguille indique les minutes.</b></p>
            <p>Il est 20 heures 13 minutes.</p>
          </div>
        </div>
        <div class="rappel-h__partie rappel-h__partie--moins">
          ${horloge({ heures: 7, minutes: 50, taille: 84, titre: 'Horloge qui indique 7 heures 50' })}
          <div class="rappel-h__texte">
            <p><b>Il est 8 heures moins 10.</b><br><b>Il est 7 h 50.</b></p>
            <p>Il est 7 heures 50 minutes.<br>Dans 10 minutes, il sera 8 heures.</p>
          </div>
        </div>
        <p class="rappel-h__ligne">Les minutes se comptent de 5 en 5. Le 15 est relié à « et quart » ; le 30 est relié à « et demie ».
          <b>1 heure = 60 minutes · une demi-heure = 30 minutes · un quart d’heure = 15 minutes · trois quarts d’heure = 45 minutes</b></p>
        <p class="rappel-h__ligne rappel-h__ligne--moins"><b>moins 5 → 55 · moins 10 → 50 · moins le quart → 45 · moins 20 → 40 · moins 25 → 35</b></p>
      </div>`;
  },
  exercices(contenu, methode) {
    const { lire, moins, tracer, vingtQuatre } = this.combien(contenu, methode);
    const quarts = contenu.minutes === 'quarts';
    const colLire = lire.length === 8 ? 4 : 6;
    const taille = (n) => (n >= 6 ? 96 : 98);
    return `
    <div class="bloc">
      <h2>Exercice 1 — Lis l’heure du matin sur chaque horloge.</h2>
      ${grilleH(lire.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: lire.length === 8 ? 90 : taille(colLire), titre: TITRE_ELEVE })}
        <div class="horloge-item__rep">${caseH}<span>h</span>${caseH}</div></div>`), colLire)}
    </div>

    <div class="bloc">
      <h2>Exercice 2 — ${quarts ? 'Lis chaque horloge avec « moins le quart » ou « et demie ».' : 'Lis chaque horloge avec « moins ».'}</h2>
      ${grilleH(moins.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: taille(4), titre: TITRE_ELEVE })}
        <div class="horloge-item__rep"><span class="ligne-h">${caseH}<span>heures</span></span><span class="ligne-h"><span>${x.m === 30 ? 'et demie' : x.m === 45 ? 'moins le quart' : 'moins'}</span>${x.m === 30 || x.m === 45 ? '' : caseH}</span></div></div>`), moins.length === 6 ? 3 : 4, moins.length === 6 ? 'horloges--large horloges--moins' : 'horloges--moins')}
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Dessine les deux aiguilles de chaque horloge.</h2>
      ${grilleH(tracer.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: taille(tracer.length), aiguilles: false })}
        <div class="horloge-item__rep horloge-item__rep--heure"><span class="n">${heureLue(x)}</span></div></div>`), tracer.length)}
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Écris l’heure sur 24 heures. <span class="exemple-h">Exemple : 8${NBSP}h${NBSP}13 le soir, c’est 20${NBSP}h${NBSP}13.</span></h2>
      ${grilleH(vingtQuatre.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: taille(vingtQuatre.length), titre: TITRE_ELEVE })}
        <div class="horloge-item__periode">${nomPeriode[x.periode]}</div>
        <div class="horloge-item__rep">${caseH}<span>h</span>${caseH}</div></div>`), vingtQuatre.length)}
    </div>
`;
  },
  corriges(contenu, methode) {
    const { lire, moins, tracer, vingtQuatre } = this.combien(contenu, methode);
    const colLire = lire.length === 8 ? 4 : 6;
    const taille = (n) => (n >= 6 ? 88 : 92);
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      ${grilleH(lire.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: lire.length === 8 ? 84 : taille(colLire) })}
        <div class="horloge-item__rep horloge-item__rep--heure">${rouge(heureLue(x))}</div></div>`), colLire, 'horloges--corrigees')}
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      ${grilleH(moins.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: taille(4) })}
        <div class="horloge-item__rep horloge-item__rep--phrase"><span>${rouge(lectureH(x))}, c’est ${rouge(heureLue(x))}.</span></div></div>`), moins.length === 6 ? 3 : 4, moins.length === 6 ? 'horloges--corrigees horloges--large' : 'horloges--corrigees')}
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      ${grilleH(tracer.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: taille(tracer.length) })}
        <div class="horloge-item__rep horloge-item__rep--heure"><span class="n">${heureLue(x)}</span></div></div>`), tracer.length, 'horloges--corrigees')}
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      ${grilleH(vingtQuatre.map((x, i) => `<div class="horloge-item"><b class="horloge-item__lettre">${lettre(i)}.</b>${horloge({ heures: x.h, minutes: x.m, taille: taille(vingtQuatre.length) })}
        <div class="horloge-item__rep horloge-item__rep--phrase"><span>${heureLue(x)} ${nomPeriode[x.periode]}, c’est ${rouge(heureLue({ h: x.h + 12, m: x.m }))}.</span></div></div>`), vingtQuatre.length, 'horloges--corrigees')}
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — masses et contenances : unités et conversions                  */
/* ------------------------------------------------------------------ */

// Chaque unité vaut tant de g (masses) ou de cL (contenances) ; les mesures sont toutes des entiers.
const BASE_MC = { g: 1, kg: 1000, t: 1000000, cL: 1, dL: 10, L: 100 };
const FAMILLE_MC = { g: 'masses', kg: 'masses', t: 'masses', cL: 'contenances', dL: 'contenances', L: 'contenances' };
const mesureMC = (n, u) => lg(n, u);

// Ex. 1 : des objets, leurs quantités possibles. Les repères en litres sont ceux du livret.
const OBJETS_MC = {
  g: [['Une pomme', [100, 150, 200]], ['Un œuf', [50, 60, 70]], ['Un cahier', [100, 150, 200]], ['Un livre', [200, 300, 400]], ['Un stylo', [5, 10]]],
  kg: [['Un chat', [3, 4, 5]], ['Un cartable', [3, 4, 5]], ['Un melon', [1, 2]], ['Un vélo', [10, 12, 15]], ['Un élève de CE2', [25, 30, 35]]],
  t: [['Un camion', [8, 10, 12, 15, 20]], ['Un éléphant', [4, 5, 6]], ['Un autobus', [10, 12, 14]]],
  cL: [['Un verre', [15, 25]], ['Une canette', [33]], ['Une petite cuillère', [1]], ['Un biberon', [15, 25]]],
  dL: [['Une tasse à café', [1]], ['Un bol', [3, 4]], ['Une louche', [2]], ['Un pot de crème', [2]]],
  L: [['Une bouteille d’eau', [1]], ['Un bidon de produit ménager', [2]], ['Une casserole', [5]], ['Un arrosoir', [12]], ['Un aquarium', [40]],
    ['Un réservoir de voiture', [50]], ['Une baignoire', [150]], ['Une piscine gonflable', [930]]],
};

// `n` unités de la famille, chaque série de trois (ou de trois fois deux) les utilisant toutes avant d'en répéter une.
function unitesDe(famille, n) {
  const trois = famille === 'masses' ? ['g', 'kg', 't'] : ['cL', 'dL', 'L'];
  const suite = [];
  while (suite.length < n) suite.push(...shuffle(trois));
  return suite.slice(0, n);
}
function objetsDe(famille, n) {
  const pools = {};
  return unitesDe(famille, n).map((u) => {
    pools[u] = pools[u] || shuffle(OBJETS_MC[u]);
    const [nom, quantites] = pools[u].pop();
    return { nom, n: pick(quantites), u };
  });
}

// Mélange deux familles une à une : le premier, le troisième… sont des masses, les autres des contenances.
const alterner = (a, b) => a.flatMap((x, i) => [x, b[i]]);
// Pour chaque exercice : `mono` (une seule famille) ou la moitié de chaque.
const parFamille = (grandeur, n, tirage) => {
  if (grandeur === 'deux') return alterner(tirage('masses', n / 2), tirage('contenances', n / 2));
  return tirage(grandeur, n);
};

const CONV_MASSES = {
  'kg>g': () => [rnd(2, 9), 'kg', 'g'], 'g>kg': () => [1000 * rnd(2, 9), 'g', 'kg'],
  't>kg': () => [rnd(2, 9), 't', 'kg'], 'kg>t': () => [1000 * rnd(2, 9), 'kg', 't'],
};
const CONV_CONT = {
  'L>cL': () => [rnd(2, 9), 'L', 'cL'], 'L>dL': () => [rnd(2, 9), 'L', 'dL'], 'dL>cL': () => [rnd(2, 9), 'dL', 'cL'],
  'cL>dL': () => [10 * rnd(2, 9), 'cL', 'dL'], 'cL>L': () => [100 * rnd(2, 9), 'cL', 'L'], 'dL>L': () => [10 * rnd(2, 9), 'dL', 'L'],
};
function conversionsDe(famille, n) {
  const table = famille === 'masses' ? CONV_MASSES : CONV_CONT;
  const cles = Object.keys(table);
  const suite = [];
  while (suite.length < n) suite.push(...shuffle(cles));
  return suite.slice(0, n);
}

// Une paire à comparer : l'unité `ua` est la plus grande ; `genre` 'egal' ou 'inegal'.
function paireMC(ua, ub, genre) {
  const r = BASE_MC[ua] / BASE_MC[ub];
  const base = rnd(2, 9) * r;
  const ecart = (r / 10) * rnd(1, 9);
  const nbB = genre === 'egal' ? base : base + (rnd(0, 1) ? ecart : -ecart);
  const a = { n: base / r, u: ua }, b = { n: nbB, u: ub };
  return rnd(0, 1) ? { a, b } : { a: b, b: a };
}
const valeurMC = (x) => x.n * BASE_MC[x.u];
const PAIRES_MASSES = [['kg', 'g'], ['t', 'kg']];
const PAIRES_CONT = [['L', 'cL'], ['L', 'dL'], ['dL', 'cL']];
function pairesDe(famille, n) {
  const pool = famille === 'masses' ? PAIRES_MASSES : PAIRES_CONT;
  const suite = [];
  while (suite.length < n) suite.push(...shuffle(pool));
  return suite.slice(0, n);
}

// Quatre mesures mélangées, jamais déjà dans l'ordre : en g et kg (ou en kg et t), ou bien avec les trois unités de contenance.
function listeMC(famille) {
  for (let essai = 0; essai < 2000; essai++) {
    let liste;
    if (famille === 'masses') {
      const [petite, grande] = pick([['g', 'kg'], ['kg', 't']]);
      const vals = shuffle([500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500]).slice(0, 4);
      liste = vals.map((v) => (v % 1000 === 0 && rnd(0, 1) ? { n: v / 1000, u: grande } : { n: v, u: petite }));
      if (!liste.some((x) => x.u === grande) || !liste.some((x) => x.u === petite)) continue;
    } else {
      const choix = { L: () => rnd(1, 4), dL: () => rnd(5, 45), cL: () => 5 * rnd(10, 90) };
      liste = shuffle([...shuffle(['L', 'dL', 'cL']), pick(['L', 'dL', 'cL'])]).map((u) => ({ n: choix[u](), u }));
    }
    const v = liste.map(valeurMC).sort((a, b) => a - b);
    if (v.some((x, i) => i && x - v[i - 1] < (famille === 'masses' ? 400 : 20))) continue;
    const m = liste.map(valeurMC);
    if (m.every((x, i) => !i || x > m[i - 1]) || m.every((x, i) => !i || x < m[i - 1])) continue;
    return liste;
  }
  return famille === 'masses' ? [{ n: 2, u: 'kg' }, { n: 1500, u: 'g' }, { n: 1, u: 'kg' }, { n: 2500, u: 'g' }]
    : [{ n: 2, u: 'L' }, { n: 15, u: 'dL' }, { n: 100, u: 'cL' }, { n: 3, u: 'L' }];
}

// Ex. 4 : les problèmes. Chacun garde son énoncé, son calcul et sa phrase réponse.
function problemeMC(modele, p) {
  if (modele === 'recette') {
    const a = pick([300, 400, 500]), b = pick([200, 250, 300]), c = pick([100, 150, 200]);
    const t = a + b + c;
    return { modele, nombres: [a, b, c], resultat: t, unite: 'g',
      enonce: `Pour un gâteau, ${p} met ${lg(a, 'g')} de farine, ${lg(b, 'g')} de sucre et ${lg(c, 'g')} de beurre. Quelle est la masse totale, en${NBSP}g ?`,
      calcul: `${lg(a, 'g')} + ${lg(b, 'g')} + ${lg(c, 'g')} = ${lg(t, 'g')}`, phrase: `La masse totale est de ${lg(t, 'g')}.` };
  }
  if (modele === 'sac') {
    const k = pick([2, 3, 5]), u = 50 * rnd(4, 17);
    const r = k * 1000 - u;
    return { modele, nombres: [k, u], resultat: r, unite: 'g',
      enonce: `Un sac contient ${lg(k, 'kg')} de farine. ${p} en utilise ${lg(u, 'g')}. Combien de g de farine reste-t-il ?`,
      calcul: `${lg(k, 'kg')} = ${lg(k * 1000, 'g')} ; ${lg(k * 1000, 'g')} − ${lg(u, 'g')} = ${lg(r, 'g')}`, phrase: `Il reste ${lg(r, 'g')} de farine.` };
  }
  if (modele === 'camion') {
    const a = rnd(2, 4), b = 100 * rnd(2, 9);
    const t = a * 1000 + b;
    return { modele, nombres: [a, b], resultat: t, unite: 'kg',
      enonce: `Un camion transporte ${lg(a, 't')} de sable et ${lg(b, 'kg')} de gravier. Quelle masse transporte-t-il en tout, en${NBSP}kg ?`,
      calcul: `${lg(a, 't')} = ${lg(a * 1000, 'kg')} ; ${lg(a * 1000, 'kg')} + ${lg(b, 'kg')} = ${lg(t, 'kg')}`, phrase: `Le camion transporte ${lg(t, 'kg')} en tout.` };
  }
  if (modele === 'verres') {
    const [v, T] = pick([[25, 1], [20, 1], [10, 1], [50, 2], [25, 2], [20, 2]]);
    const n = T * 100 / v;
    return { modele, nombres: [v, T], resultat: n, unite: 'verres',
      enonce: `Avec ${T === 1 ? 'une bouteille de 1' + NBSP + 'L' : `un pichet de ${T}${NBSP}L`}, on remplit des verres de ${lg(v, 'cL')}. Combien de verres peut-on remplir ?`,
      calcul: `${lg(T, 'L')} = ${lg(T * 100, 'cL')} ; ${lg(T * 100, 'cL')} ÷ ${lg(v, 'cL')} = ${n}`, phrase: `On peut remplir ${n} verres.` };
  }
  if (modele === 'bouteille') {
    if (rnd(0, 1)) {
      const x = 5 * rnd(3, 17), r = 100 - x;
      return { modele, nombres: [1, x], resultat: r, unite: 'cL',
        enonce: `Une bouteille contient ${lg(1, 'L')} d’eau. ${p} en verse ${lg(x, 'cL')} dans un verre. Combien de cL d’eau reste-t-il ?`,
        calcul: `${lg(1, 'L')} = ${lg(100, 'cL')} ; ${lg(100, 'cL')} − ${lg(x, 'cL')} = ${lg(r, 'cL')}`, phrase: `Il reste ${lg(r, 'cL')} d’eau.` };
    }
    const T = pick([1, 2]), x = T === 1 ? rnd(2, 9) : rnd(3, 15), r = T * 10 - x;
    return { modele, nombres: [T, x], resultat: r, unite: 'dL',
      enonce: `Un pichet contient ${lg(T, 'L')} de jus. ${p} en verse ${lg(x, 'dL')} dans une carafe. Combien de dL de jus reste-t-il ?`,
      calcul: `${lg(T, 'L')} = ${lg(T * 10, 'dL')} ; ${lg(T * 10, 'dL')} − ${lg(x, 'dL')} = ${lg(r, 'dL')}`, phrase: `Il reste ${lg(r, 'dL')} de jus.` };
  }
  // 'carafe' : un dL et des cL ajoutés
  const a = rnd(2, 6), b = 5 * rnd(2, 12), t = a * 10 + b;
  return { modele, nombres: [a, b], resultat: t, unite: 'cL',
    enonce: `${p} verse ${lg(a, 'dL')} de jus puis ${lg(b, 'cL')} d’eau dans une carafe. Quelle quantité de liquide y a-t-il en tout, en${NBSP}cL ?`,
    calcul: `${lg(a, 'dL')} = ${lg(a * 10, 'cL')} ; ${lg(a * 10, 'cL')} + ${lg(b, 'cL')} = ${lg(t, 'cL')}`, phrase: `Il y a ${lg(t, 'cL')} en tout.` };
}

function genererMassesContenances(options) {
  const grandeur = ['masses', 'contenances'].includes(options.grandeur) ? options.grandeur : 'deux';
  const [p, q, r] = shuffle(PRENOMS);

  // Ex. 1 : huit objets (six avec le rappel), l'unité à choisir.
  const objets = parFamille(grandeur, 8, objetsDe);

  // Ex. 2 : huit conversions (six avec le rappel), dans les deux sens, jamais deux fois la même.
  const vues = new Set();
  const conversions = parFamille(grandeur, 8, conversionsDe).map((cle) => {
    const table = cle.includes('g') || cle.includes('t') ? CONV_MASSES : CONV_CONT;
    for (let essai = 0; essai < 50; essai++) {
      const [n, de, vers] = table[cle]();
      const k = `${n}${de}${vers}`;
      if (!vues.has(k)) { vues.add(k); return { n, de, vers }; }
    }
    const [n, de, vers] = table[cle]();
    return { n, de, vers };
  });

  // Ex. 3 : six comparaisons (quatre avec le rappel), dont une égalité parmi les quatre premières, puis un rangement.
  const unites = parFamille(grandeur, 6, pairesDe);
  const egale = rnd(0, 3);
  const vuesP = new Set();
  const comparaisons = unites.map(([ua, ub], i) => {
    for (let essai = 0; essai < 100; essai++) {
      const pa = paireMC(ua, ub, i === egale ? 'egal' : 'inegal');
      const cle = `${mesureMC(pa.a.n, pa.a.u)}/${mesureMC(pa.b.n, pa.b.u)}`;
      if (!vuesP.has(cle)) { vuesP.add(cle); return pa; }
    }
    return paireMC(ua, ub, 'inegal');
  });
  const famRang = grandeur === 'deux' ? pick(['masses', 'contenances']) : grandeur;
  const rangement = listeMC(famRang);

  // Ex. 4 : une recette ou un remplissage d'abord, puis les autres.
  const ordre = {
    masses: ['recette', 'sac', 'camion'],
    contenances: ['verres', ...shuffle(['bouteille', 'carafe'])],
  };
  const modeles = grandeur === 'deux'
    ? ['recette', 'verres', pick(['sac', 'camion', 'bouteille', 'carafe'])]
    : ordre[grandeur];
  const problemes = modeles.map((m, i) => problemeMC(m, [p, q, r][i]));

  return {
    grandeur,
    objectif: grandeur === 'masses' ? 'Je connais les relations entre gramme (g), kilogramme (kg) et tonne (t).'
      : grandeur === 'contenances' ? 'Je connais les unités de contenance (cL, dL, L).'
        : 'Je connais les relations entre g, kg et t, et les unités de contenance (cL, dL, L).',
    methode: {},
    objets, conversions, comparaisons, rangement, problemes,
  };
}

const MASSES_REPERES = [
  `<b>1${NBSP}kg = ${lg(1000, 'g')}</b><br>Un chat pèse ${lg(5300, 'g')} ou 5${NBSP}kg ${lg(300, 'g')}.`,
  `<b>1${NBSP}t = ${lg(1000, 'kg')}</b><br>Un éléphant pèse ${lg(6250, 'kg')} ou 6${NBSP}t ${lg(250, 'kg')}.`,
];
const REPERES_L = [['Une bouteille d’eau', 1], ['Une brique de lait', 1], ['Un bidon de produit ménager', 2], ['Une casserole', 5], ['Un arrosoir', 12],
  ['Un aquarium', 40], ['Un réservoir de voiture', 50], ['Une baignoire', 150], ['Une piscine gonflable', 930]].map(([nom, n]) => `${nom} de ${lg(n, 'L')}`);

const miseMassesContenances = {
  signe: '',
  combien: (contenu, methode) => ({
    objets: contenu.objets.slice(0, methode ? 6 : 8),
    conversions: contenu.conversions.slice(0, methode ? 6 : 8),
    comparaisons: contenu.comparaisons.slice(0, methode ? 4 : 6),
    problemes: contenu.problemes.slice(0, methode ? 2 : 3),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; chaque problème montre son calcul, avec la conversion quand il y en a une, puis sa phrase réponse.',
  // Rappel : les phrases, relations et repères de la leçon (page 39 pour les masses, pages 41 et 42 pour les contenances).
  rappel(contenu) {
    const g = contenu.grandeur;
    const masses = `
        <div class="rappel-mc__partie">
          <p class="rappel-mc__titre">Les masses</p>
          ${MASSES_REPERES.map((t) => `<p>${t}</p>`).join('')}
        </div>`;
    const contenances = `
        <div class="rappel-mc__partie">
          <p class="rappel-mc__titre">Les contenances</p>
          <p>On utilise le litre pour mesurer des contenances. Un litre s’écrit <b>1${NBSP}L</b>.</p>
          <p>Une petite cuillère a une contenance de 1${NBSP}cL. Une tasse à café a une contenance de 1${NBSP}dL. Une brique de lait a une contenance de 1${NBSP}L.</p>
          <p><b>1${NBSP}L = 100${NBSP}cL</b> et <b>1${NBSP}L = 10${NBSP}dL</b></p>
        </div>`;
    const reperes = `
        <ul class="rappel-mc__reperes">${REPERES_L.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    return `
      <div class="rappel-mc rappel-mc--${g}">${g !== 'contenances' ? masses : ''}${g !== 'masses' ? contenances : ''}${g !== 'masses' ? reperes : ''}
      </div>`;
  },
  exercices(contenu, methode) {
    const { objets, conversions, comparaisons } = this.combien(contenu, methode);
    const pts = '<span class="pointilles pointilles--mini"></span>';
    const k = comparaisons.length;
    const g = contenu.grandeur;
    const choix = g === 'masses' ? 'g, kg ou t' : g === 'contenances' ? 'cL, dL ou L' : 'g, kg, t, cL, dL ou L';
    const problemes = this.combien(contenu, methode).problemes;
    return `
    <div class="bloc">
      <h2>Exercice 1 — Choisis l’unité qui convient (${choix}).</h2>
      <div class="conversions conversions--objets">
        ${objets.map((o, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${o.nom} : ${fmt(o.n)}</span>${pts}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Convertis.</h2>
      <div class="conversions conversions--3">
        ${conversions.map((c, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${lg(c.n, c.de)} =</span>${pts}<span>${c.vers}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Compare avec &lt;, &gt; ou =, puis range les mesures de la plus petite à la plus grande.</h2>
      <div class="paires paires--lg${k === 4 ? ' paires--lg4' : ''}">
        ${comparaisons.map((p, i) => `<div class="paire"><b>${lettre(i)}.</b> <span class="paire__a">${lgn(p.a.n, p.a.u)}</span><span class="case-symbole"></span><span class="paire__b">${lgn(p.b.n, p.b.u)}</span></div>`).join('')}
      </div>
      <div class="rangs rangs--lg">
        <div class="rang">
          <div class="rang__nombres"><b>${lettre(k)}.</b> ${contenu.rangement.map((x) => lgn(x.n, x.u)).join('&nbsp;; ')}</div>
          <div class="rang__reponse">${contenu.rangement.map(() => '<span class="pointilles pointilles--rang"></span>').join('<span class="rang__signe">&lt;</span>')}</div>
        </div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous chaque problème.</h2>
      <div class="problemes-fr">
        ${problemes.map((pb, i) => `<div class="probleme-fr">
          <p class="probleme-fr__enonce"><b>${lettre(i)}.</b> ${pb.enonce}</p>
          <div class="probleme-fr__ligne"><span>Calcul :</span><span class="pointilles pointilles--ligne"></span></div>
          <div class="probleme-fr__ligne"><span>Phrase réponse :</span><span class="pointilles pointilles--ligne"></span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { objets, conversions, comparaisons, problemes } = this.combien(contenu, methode);
    const k = comparaisons.length;
    const croissant = [...contenu.rangement].sort((x, y) => valeurMC(x) - valeurMC(y));
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="conversions conversions--objets conversions--corrigees">
        ${objets.map((o, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${o.nom} : ${fmt(o.n)}${NBSP}${rouge(o.u)}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="conversions conversions--3 conversions--corrigees">
        ${conversions.map((c, i) => `<div class="conversion"><b>${lettre(i)}.</b><span>${lg(c.n, c.de)} = ${rouge(lg(c.n * BASE_MC[c.de] / BASE_MC[c.vers], c.vers))}</span></div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="paires paires--lg paires--corrigees${k === 4 ? ' paires--lg4' : ''}">
        ${comparaisons.map((p, i) => `<div class="paire"><b>${lettre(i)}.</b> <span class="paire__a">${lgn(p.a.n, p.a.u)}</span><span class="paire__symbole rouge">${symboleDe(valeurMC(p.a), valeurMC(p.b))}</span><span class="paire__b">${lgn(p.b.n, p.b.u)}</span></div>`).join('')}
      </div>
      <div class="rangs rangs--corriges rangs--lg">
        <div class="rang"><div class="rang__reponse rang__reponse--corrige" data-sens="croissant"><b>${lettre(k)}.</b> ${croissant.map((x) => rouge(lgn(x.n, x.u))).join(' <span class="rang__signe">&lt;</span> ')}</div></div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="problemes-fr">
        ${problemes.map((pb, i) => `<div class="probleme-fr">
          <p class="probleme-fr__enonce"><b>${lettre(i)}.</b> ${pb.enonce}</p>
          <div class="probleme-fr__ligne"><span>Calcul :</span><span class="probleme-fr__rep">${pb.calcul}</span></div>
          <div class="probleme-fr__ligne"><span>Phrase réponse :</span><span class="probleme-fr__rep">${pb.phrase}</span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — durées : relations et calculs                                  */
/* ------------------------------------------------------------------ */

// Durée en minutes → « 1 h 35 min », « 2 h » ou « 35 min » ; instant en minutes depuis minuit → « 9 h 40 », « 10 h ».
const dureeTxt = (d) => {
  const h = Math.floor(d / 60), m = d % 60;
  return h && m ? `${h}${NBSP}h${NBSP}${m}${NBSP}min` : h ? `${h}${NBSP}h` : `${m}${NBSP}min`;
};
const horaireTxt = (t) => (t % 60 ? hm(Math.floor(t / 60), t % 60) : `${t / 60}${NBSP}h`);
const dureeHM = (d) => `${Math.floor(d / 60)}${NBSP}h${NBSP}${d % 60}${NBSP}min`;

// Les sauts d'un calcul de durée : jusqu'à l'heure pile, puis les heures, puis les minutes.
// Un saut qui ne se fait pas (déjà à l'heure pile, pas d'heure entière, pas de minutes) n'est pas dessiné.
function sautsDuree(t0, duree) {
  const morceaux = [];
  let reste = duree;
  const m = t0 % 60;
  if (m && reste >= 60 - m) { morceaux.push(60 - m); reste -= 60 - m; }
  const heures = Math.floor(reste / 60);
  if (heures) morceaux.push(heures * 60);
  reste -= heures * 60;
  if (reste) morceaux.push(reste);
  let t = t0;
  return morceaux.map((minutes) => {
    const de = t; t += minutes;
    return { minutes, libelle: `+${NBSP}${dureeTxt(minutes)}`, de: horaireTxt(de), vers: horaireTxt(t) };
  });
}
const etapesDe = (sauts) => sauts.map((s) => ({ libelle: s.libelle, cible: s.vers }));

// Départ (multiple de 5 min) et durée (multiple de 5 min, moins de 4 h) ; `trois` : les trois sauts existent
// (minutes jusqu'à l'heure pile, heures, minutes). Jamais l'exemple du rappel (9 h 40 → 11 h 15).
function tirerHoraires({ trois = false, interdits = new Set(), dureeMin = 25, dureeMax = 235 } = {}) {
  for (let essai = 0; essai < 600; essai++) {
    const t0 = 60 * rnd(7, 16) + 5 * rnd(trois ? 1 : 0, 11);
    const duree = 5 * rnd(dureeMin / 5, dureeMax / 5);
    if (interdits.has(t0) || (t0 === 580 && duree === 95)) continue;
    if (t0 % 60 && duree < 60 - (t0 % 60)) continue;
    const n = sautsDuree(t0, duree).length;
    if (trois ? n !== 3 : n < 2) continue;
    interdits.add(t0);
    return { t0, duree, t1: t0 + duree };
  }
  return { t0: 8 * 60 + 25, duree: 130, t1: 8 * 60 + 25 + 130 };
}

// Ex. 1 : égalités. Chaque ligne : ce qui est écrit, et les réponses [valeur, unité] dans l'ordre des blancs.
function egalitesDurees() {
  const h = rnd(2, 5), m = pick([15, 30, 45]);
  const h2 = pick([1, 2, 3].filter((x) => x !== h)), m2 = pick([15, 30, 45]);
  const siecles = rnd(2, 9);
  const mille = rnd(0, 1);
  return [
    { gauche: `1${NBSP}h`, reponses: [[60, 'min']] },
    { gauche: `${h}${NBSP}h${NBSP}${m}`, reponses: [[60 * h + m, 'min']] },
    { gauche: `${60 * h2 + m2}${NBSP}min`, reponses: [[h2, 'h'], [m2, 'min']] },
    { gauche: `1${NBSP}quart d’heure`, reponses: [[15, 'min']] },
    { gauche: `1${NBSP}siècle`, reponses: [[100, 'ans']] },
    { gauche: `${siecles}${NBSP}siècles`, reponses: [[100 * siecles, 'ans']] },
    { gauche: `1${NBSP}demi-heure`, reponses: [[30, 'min']] },
    mille ? { gauche: `1${NBSP}millénaire`, reponses: [[1000, 'ans']] } : { gauche: `1${NBSP}millénaire`, reponses: [[10, 'siècles']] },
  ];
}

// Ex. 2 : conversions dans les deux sens. Les quatre premières sont celles du rappel ; sans les secondes,
// on garde les heures et les siècles.
function conversionsDurees(secondes, evite) {
  const [h, h2, h3] = shuffle([2, 3, 4, 5, 6]);
  let total, hh, mm;
  do { hh = rnd(1, 3); mm = pick([10, 20, 30, 40, 45, 50]); total = 60 * hh + mm; } while (total === evite);
  const mil = rnd(2, 5), ans = rnd(2, 9);
  const min = rnd(2, 5), s = 60 * rnd(1, 3) + pick([15, 20, 30, 45]);
  const hVersMin = { gauche: `${h}${NBSP}h`, reponses: [[60 * h, 'min']] };
  const minVersH = { gauche: `${total}${NBSP}min`, reponses: [[hh, 'h'], [mm, 'min']] };
  const milVersSiecles = { gauche: `${mil}${NBSP}millénaires`, reponses: [[10 * mil, 'siècles']] };
  const ansVersSiecles = { gauche: `${100 * ans}${NBSP}ans`, reponses: [[ans, 'siècles']] };
  if (secondes) {
    return [hVersMin, minVersH,
      { gauche: `${min}${NBSP}min`, reponses: [[60 * min, 's']] },
      { gauche: `${s}${NBSP}s`, reponses: [[Math.floor(s / 60), 'min'], [s % 60, 's']] },
      milVersSiecles, ansVersSiecles];
  }
  return [hVersMin, minVersH, milVersSiecles, ansVersSiecles,
    { gauche: `${60 * h2}${NBSP}min`, reponses: [[h2, 'h']] },
    { gauche: `${h3}${NBSP}h`, reponses: [[60 * h3, 'min']] }];
}

// Ex. 4 : un trajet (durée à trouver), un film (heure de fin à trouver), une récréation (minutes).
function problemeDurees(modele, prenom, interdits) {
  if (modele === 'recre') {
    let t0, duree;
    do { t0 = 60 * rnd(9, 15) + 5 * rnd(0, 11); duree = 5 * rnd(3, 10); } while (interdits.has(t0));
    interdits.add(t0);
    const t1 = t0 + duree, s = sautsDuree(t0, duree);
    return { modele, t0, duree, t1,
      enonce: `La récréation de ${prenom} commence à ${horaireTxt(t0)} et finit à ${horaireTxt(t1)}. Combien de minutes dure-t-elle ?`,
      calcul: s.length > 1 ? `${s.map((x) => dureeTxt(x.minutes)).join(' + ')} = ${dureeTxt(duree)}` : `de ${horaireTxt(t0)} à ${horaireTxt(t1)} : ${dureeTxt(duree)}`,
      phrase: `La récréation dure ${dureeTxt(duree)}.` };
  }
  const hh = tirerHoraires({ interdits });
  const s = sautsDuree(hh.t0, hh.duree);
  if (modele === 'trajet') {
    return { modele, ...hh,
      enonce: `${prenom} part en ${pick(['train', 'bus', 'voiture'])} à ${horaireTxt(hh.t0)} et arrive à ${horaireTxt(hh.t1)}. Quelle est la durée du trajet ?`,
      calcul: `${s.map((x) => dureeTxt(x.minutes)).join(' + ')} = ${dureeTxt(hh.duree)}`,
      phrase: `Le trajet dure ${dureeTxt(hh.duree)}.` };
  }
  return { modele, ...hh,
    enonce: `${prenom} regarde un film qui commence à ${horaireTxt(hh.t0)}. Il dure ${dureeTxt(hh.duree)}. À quelle heure le film finit-il ?`,
    calcul: s.map((x) => `${x.de} + ${x.libelle.replace(/^\+\s/, '')} = ${x.vers}`).join(' ; '),
    phrase: `Le film finit à ${horaireTxt(hh.t1)}.` };
}

function genererDurees(options) {
  const secondes = options.secondes === 'oui';
  const [p, q, r] = shuffle(PRENOMS);
  const egalites = egalitesDurees();
  const evite = parseInt(egalites[2].gauche, 10);
  const conversions = conversionsDurees(secondes, evite);
  const interdits = new Set();
  const durees = [tirerHoraires({ trois: true, interdits }), tirerHoraires({ interdits }), tirerHoraires({ interdits })];
  const arrivees = [tirerHoraires({ trois: true, interdits }), tirerHoraires({ interdits }), tirerHoraires({ interdits })];
  const problemes = [problemeDurees('trajet', p, interdits), problemeDurees('film', q, interdits), problemeDurees('recre', r, interdits)];
  return {
    secondes,
    objectif: secondes
      ? 'Je connais les relations entre secondes, minutes, heures, demi-heure, quart d’heure, siècle et millénaire, et je calcule des durées.'
      : 'Je connais les relations entre minutes, heures, demi-heure, quart d’heure, siècle et millénaire, et je calcule des durées.',
    methode: {},
    egalites, conversions, durees, arrivees, problemes,
  };
}

const RELATIONS_DUREES = [
  ['1 minute = 60 secondes', true],
  ['1 heure = 60 minutes'], ['1 demi-heure = 30 minutes'], ['1 quart d’heure = 15 minutes'],
  ['1 siècle = 100 ans'], [`1 millénaire = ${fmt(1000)} ans`], ['1 millénaire = 10 siècles'],
].map(([t, secondes]) => [t.replace(/(\d) /g, `$1${NBSP}`), !!secondes]);

const ecritureDuree = (e, pts, rep) => {
  const parties = e.reponses.map(([v, u]) => (rep ? rouge(lg(v, u)) : `${pts}<span>${u}</span>`));
  return `<span>${e.gauche} =</span>${rep ? `<span>${parties.join(' ')}</span>` : parties.join('')}`;
};

const miseDurees = {
  signe: '',
  combien: (contenu, methode) => ({
    egalites: contenu.egalites.slice(0, methode ? 6 : 8),
    conversions: contenu.conversions.slice(0, methode ? 4 : 6),
    durees: contenu.durees.slice(0, methode ? 2 : 3),
    arrivees: contenu.arrivees.slice(0, methode ? 2 : 3),
    problemes: contenu.problemes.slice(0, methode ? 2 : 3),
  }),
  noteCorrige: 'les réponses attendues sont en rouge ; chaque durée est calculée avec la ligne du temps : on va jusqu’à l’heure pile, puis on ajoute les heures, puis les minutes.',
  // Rappel : les relations de la leçon (pages 43 et 44), puis un calcul de durée sur une ligne du temps.
  // La leçon ne montre aucun calcul de durée : cette partie est une transposition, pas une citation.
  rappel(contenu) {
    const depart = 9 * 60 + 40, s = sautsDuree(depart, 95);
    return `
      <div class="rappel-du">
        <div class="rappel-du__relations">
          <p class="rappel-du__titre">Je connais les relations</p>
          <ul>${RELATIONS_DUREES.filter(([, sec]) => !sec || contenu.secondes).map(([t]) => `<li>${t}</li>`).join('')}</ul>
        </div>
        <div class="rappel-du__calcul">
          <p class="rappel-du__titre">Pour calculer une durée</p>
          <p>De ${horaireTxt(depart)} à ${horaireTxt(depart + 95)} : je vais jusqu’à l’heure pile, puis j’ajoute les heures, puis les minutes.</p>
          ${ligneDuTemps({ debut: horaireTxt(depart), fin: horaireTxt(depart + 95), etapes: etapesDe(s) })}
          <p class="rappel-du__detail">${s.map((x) => `de ${x.de} à ${x.vers} : ${dureeTxt(x.minutes)}`).join(' ; ')}.<br><b>En tout : ${dureeTxt(95)}.</b></p>
        </div>
      </div>`;
  },
  exercices(contenu, methode) {
    const { egalites, conversions, durees, arrivees, problemes } = this.combien(contenu, methode);
    const pts = '<span class="pointilles pointilles--mini"></span>';
    const ligne = (e, i) => `<div class="conversion"><b>${lettre(i)}.</b>${ecritureDuree(e, pts, false)}</div>`;
    const bloc = (liste, type, depart) => liste.map((x, i) => {
      const rang = depart + i;
      const enonce = type === 'duree'
        ? `Départ : ${horaireTxt(x.t0)} ; arrivée : ${horaireTxt(x.t1)}.`
        : `Départ : ${horaireTxt(x.t0)} ; durée : ${dureeTxt(x.duree)}.`;
      const reponse = type === 'duree'
        ? `<span>Durée :</span>${pts}<span>h</span>${pts}<span>min</span>`
        : `<span>Arrivée :</span>${pts}<span>h</span>${pts}`;
      return `<div class="duree"><p class="duree__enonce"><b>${lettre(rang)}.</b> ${enonce}</p>
        ${ligneDuTemps({ debut: horaireTxt(x.t0), fin: type === 'duree' ? horaireTxt(x.t1) : null })}
        <div class="duree__reponse">${reponse}</div></div>`;
    }).join('');
    return `
    <div class="bloc">
      <h2>Exercice 1 — Complète.</h2>
      <div class="conversions conversions--3 conversions--durees">
        ${egalites.map(ligne).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Convertis.</h2>
      <div class="conversions conversions--3 conversions--durees">
        ${conversions.map(ligne).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Calcule avec la ligne du temps : trace les sauts, puis réponds.</h2>
      <div class="durees">
        <div class="durees__colonne"><p class="durees__titre">Je cherche la durée.</p>${bloc(durees, 'duree', 0)}</div>
        <div class="durees__colonne"><p class="durees__titre">Je cherche l’heure d’arrivée.</p>${bloc(arrivees, 'arrivee', durees.length)}</div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Résous chaque problème.</h2>
      <div class="problemes-fr">
        ${problemes.map((pb, i) => `<div class="probleme-fr">
          <p class="probleme-fr__enonce"><b>${lettre(i)}.</b> ${pb.enonce}</p>
          <div class="probleme-fr__ligne"><span>Calcul :</span><span class="pointilles pointilles--ligne"></span></div>
          <div class="probleme-fr__ligne"><span>Phrase réponse :</span><span class="pointilles pointilles--ligne"></span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
  corriges(contenu, methode) {
    const { egalites, conversions, durees, arrivees, problemes } = this.combien(contenu, methode);
    const ligne = (e, i) => `<div class="conversion"><b>${lettre(i)}.</b>${ecritureDuree(e, '', true)}</div>`;
    const bloc = (liste, type, depart) => liste.map((x, i) => {
      const s = sautsDuree(x.t0, x.duree);
      const detail = s.map((y) => `de ${y.de} à ${y.vers} : ${dureeTxt(y.minutes)}`).join(' ; ');
      const enonce = type === 'duree'
        ? `Départ : ${horaireTxt(x.t0)} ; arrivée : ${horaireTxt(x.t1)}.`
        : `Départ : ${horaireTxt(x.t0)} ; durée : ${dureeTxt(x.duree)}.`;
      const fin = type === 'duree' ? `en tout ${rouge(dureeTxt(x.duree))}.` : `arrivée à ${rouge(horaireTxt(x.t1))}.`;
      return `<div class="duree duree--corrige"><p class="duree__enonce"><b>${lettre(depart + i)}.</b> ${enonce}</p>
        ${ligneDuTemps({ debut: horaireTxt(x.t0), fin: horaireTxt(x.t1), etapes: etapesDe(s) })}
        <p class="duree__detail">${detail} ; ${fin}</p></div>`;
    }).join('');
    return `
    <div class="bloc">
      <h2>Exercice 1</h2>
      <div class="conversions conversions--3 conversions--corrigees conversions--durees">
        ${egalites.map(ligne).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2</h2>
      <div class="conversions conversions--3 conversions--corrigees conversions--durees">
        ${conversions.map(ligne).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3</h2>
      <div class="durees durees--corrigees">
        <div class="durees__colonne">${bloc(durees, 'duree', 0)}</div>
        <div class="durees__colonne">${bloc(arrivees, 'arrivee', durees.length)}</div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4</h2>
      <div class="problemes-fr">
        ${problemes.map((pb, i) => `<div class="probleme-fr">
          <p class="probleme-fr__enonce"><b>${lettre(i)}.</b> ${pb.enonce}</p>
          <div class="probleme-fr__ligne"><span>Calcul :</span><span class="probleme-fr__rep">${pb.calcul}</span></div>
          <div class="probleme-fr__ligne"><span>Phrase réponse :</span><span class="probleme-fr__rep">${pb.phrase}</span></div>
        </div>`).join('')}
      </div>
    </div>
`;
  },
};

/* ------------------------------------------------------------------ */
/* CE2 — solides : reconnaître, décrire, patrons du cube                */
/* ------------------------------------------------------------------ */

// La leçon (page 47 du livret) : nombre de faces, d'arêtes et de sommets de quatre solides.
const LECON_SOLIDES = {
  cube: { faces: 6, aretes: 12, sommets: 8 },
  pave: { faces: 6, aretes: 12, sommets: 8 },
  'pave-carre': { faces: 6, aretes: 12, sommets: 8 },
  pyramide: { faces: 5, aretes: 8, sommets: 5 },
};
// Ce que la fiche affirme des six solides (les comptes de la leçon, plus ce qu'on voit sur les solides ronds).
const PROPRIETES_SOLIDES = {
  cube: { faces: 6, aretes: 12, sommets: 8, facesCarrees: 6 },
  pave: { faces: 6, aretes: 12, sommets: 8 },
  pyramide: { faces: 5, aretes: 8, sommets: 5, facesTriangulaires: 4, pointe: 1 },
  boule: { aretes: 0, sommets: 0, facesPlanes: 0, pointe: 0 },
  cylindre: { facesPlanes: 2, sommets: 0, pointe: 0 },
  cone: { facesPlanes: 1, pointe: 1 },
};
const NOM_SOLIDE = { cube: 'un cube', pave: 'un pavé droit', pyramide: 'une pyramide', boule: 'une boule', cylindre: 'un cylindre', cone: 'un cône' };
const DET_SOLIDE = { cube: 'Le cube', pave: 'Le pavé droit', pyramide: 'La pyramide', boule: 'La boule', cylindre: 'Le cylindre', cone: 'Le cône' };
const MOT_PROPRIETE = {
  faces: ['face', 'faces', 'de face'], aretes: ['arête', 'arêtes', 'd’arête'], sommets: ['sommet', 'sommets', 'de sommet'],
  facesPlanes: ['face plane', 'faces planes', 'de face plane'], facesCarrees: ['face carrée', 'faces carrées', 'de face carrée'],
  facesTriangulaires: ['face triangulaire', 'faces triangulaires', 'de face triangulaire'],
};
const AUTRES_NOMBRES = {
  faces: [4, 5, 6, 8, 10], aretes: [6, 8, 10, 12, 14], sommets: [4, 5, 6, 8, 10],
  facesPlanes: [1, 2, 3, 4, 6], facesCarrees: [1, 2, 4, 5], facesTriangulaires: [2, 3, 5, 6],
};
const SOLIDES_A_VARIANTE = ['pave', 'pyramide', 'cylindre', 'cone'];

// Une phrase du vrai-ou-faux : « Le pavé droit a 8 sommets. », « La boule n’a pas d’arête. »
const phraseSolide = ({ solide: s, prop, n }) => {
  if (prop === 'pointe') return `${DET_SOLIDE[s]} a une pointe.`;
  const mot = MOT_PROPRIETE[prop];
  return n === 0 ? `${DET_SOLIDE[s]} n’a pas ${mot[2]}.` : `${DET_SOLIDE[s]} a ${n} ${n > 1 ? mot[1] : mot[0]}.`;
};

// La phrase qui explique la bonne case dans le corrigé : celle de la leçon pour le cube, le pavé et la pyramide.
const JUSTIFICATION_SOLIDE = {
  cube: 'Le cube a 6 faces carrées, 12 arêtes et 8 sommets.',
  pave: 'Le pavé droit a 6 faces, 12 arêtes et 8 sommets.',
  pyramide: 'La pyramide a 5 faces, 8 arêtes et 5 sommets ; sa pointe est un sommet.',
  boule: 'La boule est ronde : ni face plane, ni arête, ni sommet.',
  cylindre: 'Le cylindre a 2 faces planes, les disques, et pas de pointe.',
  cone: 'Le cône a une pointe et une face plane, le disque.',
};

function affirmationSolide(solide, vrai) {
  const props = PROPRIETES_SOLIDES[solide];
  // « a une pointe » ne peut être vrai que pour un solide qui en a une, et inversement.
  const permises = Object.keys(props).filter((p) => p !== 'pointe' || (props.pointe === 1) === vrai);
  const prop = pick(permises);
  const reel = props[prop];
  const n = vrai ? reel : (prop === 'pointe' ? 1 : pick(AUTRES_NOMBRES[prop].filter((x) => x !== reel)));
  return { solide, prop, n, vrai };
}

function genererSolides() {
  // Ex. 1 : les six solides, une fois chacun ; avec les deux derniers, des formes déjà vues mais autrement proportionnées.
  const base = shuffle(Object.keys(NOM_SOLIDE)).map((nom) => ({ nom, variante: SOLIDES_A_VARIANTE.includes(nom) ? rnd(0, 1) : 0 }));
  const doubles = shuffle(SOLIDES_A_VARIANTE).slice(0, 2).map((nom) => ({ nom, variante: 1 - base.find((b) => b.nom === nom).variante }));
  const solides = [...base, ...doubles];

  // Ex. 3 : huit assemblages de six carrés ; 2 ou 3 patrons parmi les six premiers, 4 au plus parmi les huit.
  const valides = shuffle(Array.from({ length: NB_PATRONS }, (_, i) => i));
  const autres = shuffle(Array.from({ length: NB_ASSEMBLAGES - NB_PATRONS }, (_, i) => NB_PATRONS + i));
  const nv = rnd(2, 3);
  const six = shuffle([...valides.slice(0, nv), ...autres.slice(0, 6 - nv)]);
  const deux = shuffle(rnd(0, 1) ? [valides[nv], autres[6 - nv]] : [autres[6 - nv], autres[7 - nv]]);
  const patrons = [...six, ...deux].map((numero) => ({ numero, quart: rnd(0, 3), miroir: rnd(0, 1) === 1 }));

  // Ex. 4 : un solide par affirmation, 2 vraies et 2 non parmi les 4 premières, puis une de chaque.
  const vrais = [...shuffle([true, true, false, false]), ...shuffle([true, false])];
  const affirmations = shuffle(Object.keys(PROPRIETES_SOLIDES)).map((s, i) => affirmationSolide(s, vrais[i]));

  return { objectif: 'Je sais reconnaître les solides : un cube, un pavé, une pyramide, une boule, un cylindre, un cône.', solides, patrons, affirmations };
}

const patronDe = (p, taille) => patronCube(p.numero, { taille, quart: p.quart, miroir: p.miroir });
const ligneSolide = '<span class="pointilles pointilles--ligne"></span>';
const nbReponse = (n) => `<span class="reponse rouge">${n}</span>`;

const miseSolides = {
  signe: '',
  combien: (contenu, methode) => ({
    solides: contenu.solides.slice(0, methode ? 6 : 8),
    patrons: contenu.patrons.slice(0, methode ? 6 : 8),
    tableau: ['cube', 'pave', ...(methode ? [] : ['pave-carre']), 'pyramide'],
    affirmations: contenu.affirmations.slice(0, methode ? 4 : 6),
  }),
  noteCorrige: 'réponses en rouge, patrons du cube entourés ; dans l’exercice 4, la case cochée est la bonne et la phrase dessous dit pourquoi. Les nombres sont ceux de la leçon.',
  // Rappel : les solides de la page 45, le vocabulaire et les descriptions de la page 47, les patrons de la page 46.
  rappel() {
    const six = Object.keys(NOM_SOLIDE).map((nom) => `<figure class="rappel-so__solide">${solide(nom, { taille: 84 })}<figcaption>${NOM_SOLIDE[nom]}</figcaption></figure>`).join('');
    return `
      <div class="rappel-so">
        <div class="rappel-so__six">${six}</div>
        <div class="rappel-so__vocabulaire">
          ${solide('cube', { taille: 84, reperes: true })}
          <p>Pour décrire un solide, on compte ses <b>faces</b>, ses <b>arêtes</b> et ses <b>sommets</b>.</p>
        </div>
        <ul class="rappel-so__descriptions">
          <li><b>Le cube</b> a 6 faces carrées, 12 arêtes et 8 sommets.</li>
          <li><b>Le pavé droit</b> a 6 faces rectangles, 12 arêtes et 8 sommets.</li>
          <li><b>Le pavé droit à base carrée</b> a 6 faces : 2 carrés et 4 rectangles, 12 arêtes et 8 sommets.</li>
          <li><b>La pyramide</b> a 5 faces : 1 carré et 4 triangles, 8 arêtes et 5 sommets.</li>
          <li>Il y a onze patrons du cube : six carrés qui se plient pour former un cube.</li>
        </ul>
      </div>`;
  },
  exercices(contenu, methode, corrige = false) {
    const { solides, patrons, tableau, affirmations } = this.combien(contenu, methode);
    const etiquette = (nom) => (corrige ? undefined : 'Solide à nommer');
    const gabarit = (nom) => ({ taille: methode ? 84 : corrige ? 56 : 74, etiquette: etiquette(nom) });
    const ligneNom = (nom) => (corrige ? `<span class="solide-nom"><span class="reponse rouge">${NOM_SOLIDE[nom]}</span></span>` : `<span class="solide-nom">${ligneSolide}</span>`);
    const cellulePatron = (p, i) => {
      const { svg, estPatron } = patronDe(p, methode ? 104 : corrige ? 86 : 120);
      return `<div class="patron-cellule${corrige && estPatron ? ' patron-cellule--entoure' : ''}"><b class="patron-cellule__lettre">${lettre(i)}.</b>${svg}</div>`;
    };
    const ligneTableau = (id) => {
      const donnees = LECON_SOLIDES[id];
      const dessin = id === 'pave-carre' ? solide('pave', { taille: 50, variante: 1, etiquette: 'Pavé droit à base carrée' }) : solide(id, { taille: 50 });
      const nom = id === 'pave-carre' ? 'Pavé droit à base carrée' : id === 'pave' ? 'Pavé droit' : id === 'cube' ? 'Cube' : 'Pyramide à base carrée';
      const case_nb = (cle) => (corrige ? `<td class="reponse-cellule">${nbReponse(donnees[cle])}</td>` : '<td class="case"></td>');
      return `<tr data-solide="${id}"><th scope="row"><span class="tab-so__dessin">${dessin}</span><span class="tab-so__nom">${nom}</span></th>${case_nb('faces')}${case_nb('sommets')}${case_nb('aretes')}</tr>`;
    };
    return `
    <div class="bloc">
      <h2>Exercice 1 — Écris le nom de chaque solide.</h2>
      <div class="solides-nommer solides-nommer--${solides.length}">
        ${solides.map((s, i) => `<div class="solide-cellule"><b class="solide-cellule__lettre">${lettre(i)}.</b>${solide(s.nom, { ...gabarit(s.nom), variante: s.variante })}${ligneNom(s.nom)}</div>`).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Complète le tableau.</h2>
      <table class="tab-so">
        <tr><th scope="col">Solide</th><th scope="col">Nombre de faces</th><th scope="col">Nombre de sommets</th><th scope="col">Nombre d’arêtes</th></tr>
        ${tableau.map(ligneTableau).join('')}
      </table>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Entoure les patrons qui permettent de construire un cube.</h2>
      <div class="patrons patrons--${patrons.length}">
        ${patrons.map(cellulePatron).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Coche la bonne case : V ou F.</h2>
      <ul class="affirmations affirmations--so">
        ${affirmations.map((a, i) => `<li class="affirmation"><span class="affirmation__texte"><b>${lettre(i)}.</b> ${phraseSolide(a)}</span><span class="cases-vf">${case_('V', corrige && a.vrai)}${case_('F', corrige && !a.vrai)}</span>${corrige ? `<span class="affirmation__justif">${JUSTIFICATION_SOLIDE[a.solide]}</span>` : ''}</li>`).join('')}
      </ul>
    </div>
`;
  },
  corriges(contenu, methode) { return this.exercices(contenu, methode, true); },
};

/* ------------------------------------------------------------------ */
/* CE2 — polygones : reconnaître, décrire, cercle                       */
/* ------------------------------------------------------------------ */

// Pages 48 à 50 du livret. Nombre de côtés (= de sommets) de chaque polygone nommé.
const NOMBRE_COTES = { triangle: 3, quadrilatere: 4, pentagone: 5, hexagone: 6 };
const NOM_POLYGONE = { triangle: 'triangle', quadrilatere: 'quadrilatère', pentagone: 'pentagone', hexagone: 'hexagone' };

// Phrases à trous : { avant, apres, mot } ; la leçon fournit les formulations.
const PHRASES_POLYGONES = [
  { id: 'triangle', avant: 'Un', apres: 'est un polygone qui a trois côtés et trois sommets.', mot: 'triangle' },
  { id: 'quadrilatere', avant: 'Un', apres: 'est un polygone qui a quatre côtés et quatre sommets.', mot: 'quadrilatère' },
  { id: 'pentagone', avant: 'Un', apres: 'a 5 côtés et 5 sommets.', mot: 'pentagone' },
  { id: 'hexagone', avant: 'Un', apres: 'a 6 côtés et 6 sommets.', mot: 'hexagone' },
  { id: 'centre', avant: 'Le', apres: 'est le point au milieu du cercle.', mot: 'centre' },
  { id: 'rayon', avant: 'Le diamètre est égal au double du', apres: '.', mot: 'rayon' },
  { id: 'diametre', avant: 'Le', apres: 'est égal au double du rayon.', mot: 'diamètre' },
  { id: 'compas', avant: 'On construit un cercle avec un', apres: '.', mot: 'compas' },
  { id: 'fermee', avant: 'Un polygone est une figure', apres: 'qu’on peut tracer avec une règle.', mot: 'fermée' },
];

// Une figure : { nom, variante } ; les polygones et les non-polygones sont tirés sans répétition de forme.
function figuresPolygones(nbPoly, nbAutres) {
  const polys = shuffle(FIGURES_POLYGONES.flatMap((nom) => Array.from({ length: NB_VARIANTES_FIGURE[nom] }, (_, variante) => ({ nom, variante })))).slice(0, nbPoly);
  const autres = shuffle(FIGURES_NON_POLYGONES).slice(0, nbAutres).map((nom) => ({ nom, variante: rnd(0, NB_VARIANTES_FIGURE[nom] - 1) }));
  return shuffle([...polys, ...autres]);
}

function genererPolygones() {
  // Ex. 1 : 10 figures dont 6 polygones (les 8 premières, quand le rappel est là, en gardent 4 à 6).
  const reconnaitre = figuresPolygones(6, 4);
  // Ex. 2 : 8 polygones, deux de chaque nom, les quatre noms d'abord (les 6 premiers en couvrent donc les quatre).
  const noms = FIGURES_POLYGONES;
  const variantes = Object.fromEntries(noms.map((n) => [n, shuffle(Array.from({ length: NB_VARIANTES_FIGURE[n] }, (_, i) => i))]));
  const nommer = [...shuffle(noms).map((nom) => ({ nom, variante: variantes[nom][0] })), ...shuffle(noms).map((nom) => ({ nom, variante: variantes[nom][1] }))];
  // Ex. 3 : rayon → diamètre et diamètre → rayon, valeurs toutes différentes, en alternance.
  const rayons = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
  const cas = rayons.map((r, i) => (i % 2 === 0 ? { sens: 'rayon', rayon: r, diametre: 2 * r } : { sens: 'diametre', rayon: r, diametre: 2 * r }));
  const tracer = [{ type: 'rayon', rayon: 2, nom: 'O' }, pick([{ type: 'rayon', rayon: 3, nom: 'P' }, { type: 'diametre', rayon: 3, nom: 'P' }])];
  // Ex. 4 : six phrases à trous de la leçon, au moins un polygone et un mot du cercle.
  let phrases;
  do { phrases = shuffle(PHRASES_POLYGONES).slice(0, 6); }
  while (phrases.slice(0, 4).every((p) => NOMBRE_COTES[p.id]) || phrases.slice(0, 4).every((p) => !NOMBRE_COTES[p.id]));
  return { objectif: 'Je sais reconnaître un polygone et construire un cercle avec un compas.', reconnaitre, nommer, cas, tracer, phrases };
}

const cocheOuiNon = (mot, cochee) => case_(mot, cochee);
const CM_PX = PX_PAR_CM;
const hautEspace = (rayon) => Math.round(2 * rayon * CM_PX + 16);
const LARGEUR_ESPACE = 326;
const enonceTrace = (t) => `Trace un cercle de ${t.type === 'rayon' ? 'rayon' : 'diamètre'} ${t.type === 'rayon' ? t.rayon : 2 * t.rayon}${NBSP}cm de centre ${t.nom}.`;

const misePolygones = {
  signe: '',
  combien: (contenu, methode) => ({
    reconnaitre: contenu.reconnaitre.slice(0, methode ? 8 : 10),
    nommer: contenu.nommer.slice(0, methode ? 6 : 8),
    cas: contenu.cas.slice(0, methode ? 4 : 6),
    tracer: contenu.tracer.slice(0, methode ? 1 : 2),
    phrases: contenu.phrases.slice(0, methode ? 4 : 6),
  }),
  noteCorrige: 'réponses en rouge, case cochée = bonne réponse, cercles tracés à leur vraie taille.',
  // Rappel : la définition et les exemples de la page 48, les phrases de la page 49, le cercle de la page 50.
  rappel() {
    const petite = (nom, variante) => `<span class="rappel-po__petite">${figurePlane(nom, { taille: 50, variante }).svg}</span>`;
    return `
      <div class="rappel-po">
        <div class="rappel-po__definition">
          <p><b>Un polygone est une figure fermée qu’on peut tracer avec une règle.</b></p>
          ${figurePlane('pentagone', { taille: 170, variante: 1, reperes: true }).svg}
        </div>
        <div class="rappel-po__exemples">
          <p>Ces figures sont des polygones.</p>
          <div class="rappel-po__rang">${petite('triangle', 1)}${petite('quadrilatere', 0)}${petite('hexagone', 1)}</div>
          <p>Ces figures ne sont pas des polygones.</p>
          <div class="rappel-po__rang">${petite('ligne ouverte', 1)}${petite('courbe fermée', 0)}${petite('ovale', 0)}</div>
        </div>
        <div class="rappel-po__cercle">
          ${cercle({ rayon: 2, rayonTrace: true, diametreTrace: true, lettres: true, taille: 100 })}
          <p><b>O</b> est <b>le centre</b>, [OA] est <b>un rayon</b>, [BC] est <b>un diamètre</b>. Le <b>diamètre</b> est égal au double du <b>rayon</b> : rayon 2${NBSP}cm, donc diamètre 4${NBSP}cm.</p>
        </div>
        <ul class="rappel-po__noms">
          <li>Un <b>triangle</b> est un polygone qui a trois côtés et trois sommets.</li>
          <li>Un <b>quadrilatère</b> est un polygone qui a quatre côtés et quatre sommets.</li>
          <li>Un <b>pentagone</b> a 5 côtés et 5 sommets. Un <b>hexagone</b> a 6 côtés et 6 sommets.</li>
          <li>Je sais construire un cercle <b>avec un compas</b>, à partir du centre et du diamètre ou du rayon.</li>
        </ul>
      </div>`;
  },
  exercices(contenu, methode, corrige = false) {
    const { reconnaitre, nommer, cas, tracer, phrases } = this.combien(contenu, methode);
    const fig = (f, titre, t) => figurePlane(f.nom, { taille: t || (methode ? 62 : 54), variante: f.variante, etiquette: corrige ? undefined : titre });
    const polygone = (f) => NOMBRE_COTES[f.nom] !== undefined;
    const trou = '<span class="pointilles pointilles--mini"></span>';
    const ligne = '<span class="pointilles pointilles--ligne"></span>';

    const cellule1 = (f, i) => `<div class="fig-pc fig-pc--${reconnaitre.length}"><b>${lettre(i)}.</b>${fig(f, 'Figure à reconnaître').svg}<span class="oui-non">${cocheOuiNon('oui', corrige && polygone(f))}${cocheOuiNon('non', corrige && !polygone(f))}</span></div>`;

    const cellule2 = (f, i) => {
      const n = NOMBRE_COTES[f.nom];
      const rep = (x) => (corrige ? `<span class="reponse rouge">${x}</span>` : ligne);
      const nb = (x, mot) => (corrige ? `<span class="reponse rouge">${x}</span>` : trou);
      return `<div class="fig-nom fig-nom--${nommer.length}"><b>${lettre(i)}.</b>${fig(f, 'Polygone à nommer', methode ? 54 : 48).svg}<span class="fig-nom__lignes"><span class="fig-nom__ligne">${corrige && nommer.length === 8 ? '' : 'Nom : '}${rep(NOM_POLYGONE[f.nom])}</span><span class="fig-nom__ligne">${nb(n)} côtés</span><span class="fig-nom__ligne">${nb(n)} sommets</span></span></div>`;
    };

    const casCercle = (c, i) => {
      const [donne, cherche] = c.sens === 'rayon' ? ['rayon', 'diamètre'] : ['diamètre', 'rayon'];
      const valeur = c.sens === 'rayon' ? c.rayon : c.diametre, reponse = c.sens === 'rayon' ? c.diametre : c.rayon;
      return `<div class="cas-cercle" data-rayon="${c.rayon}" data-diametre="${c.diametre}" data-sens="${c.sens}"><b>${lettre(i)}.</b><span>${donne} = ${valeur}${NBSP}cm</span><span class="cas-cercle__fleche">→</span><span>${cherche} =</span>${corrige ? `<span class="reponse rouge">${reponse}</span>` : trou}<span>cm</span></div>`;
    };

    const consigneTrace = (t, i) => `<div class="trace-cercle-bloc__consigne"><b>${lettre(cas.length + i)}.</b> ${enonceTrace(t)}</div>`;
    const espace = (t, i) => {
      const dessin = cercle({ rayon: t.rayon, echelle: CM_PX, largeur: LARGEUR_ESPACE, hauteur: hautEspace(t.rayon), nom: t.nom, trace: corrige, couleur: ROUGE_CERCLE });
      return `<div class="trace-cercle-bloc" data-rayon="${t.rayon}">${methode ? '' : consigneTrace(t, i)}<div class="espace-cercle">${dessin}</div></div>`;
    };

    const mots = phrases.map((p) => p.mot).sort((a, b) => a.localeCompare(b, 'fr'));
    const phrase = (p, i) => `<li class="phrase-po" data-mot="${p.mot}"><b>${lettre(i)}.</b> <span>${p.avant}</span>${corrige ? `<span class="reponse rouge phrase-po__mot">${p.mot}</span>` : '<span class="pointilles pointilles--mot"></span>'}<span>${p.apres}</span></li>`;

    return `
    <div class="bloc">
      <h2>Exercice 1 — Ces figures sont-elles des polygones ? Coche oui ou non.</h2>
      <div class="figs-pc figs-pc--${reconnaitre.length}">
        ${reconnaitre.map(cellule1).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Écris le nom de chaque polygone, puis compte ses côtés et ses sommets.</h2>
      <div class="figs-nom figs-nom--${nommer.length}">
        ${nommer.map(cellule2).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Complète, puis trace avec ton compas.</h2>
      <div class="cercles cercles--${methode ? 'avec' : 'sans'}">
        <div class="cas-cercles">${cas.map(casCercle).join('')}${methode ? consigneTrace(tracer[0], 0) : ''}</div>
        <div class="traces-cercles">${tracer.map(espace).join('')}</div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Complète chaque phrase avec un mot de la banque.</h2>
      <div class="banque-mots" data-banque="${mots.join(',')}"><span class="banque-mots__titre">Banque de mots</span>${mots.map((m) => `<span class="banque-mots__mot">${m}</span>`).join('')}</div>
      <ul class="phrases-po">
        ${phrases.map(phrase).join('')}
      </ul>
    </div>
`;
  },
  corriges(contenu, methode) { return this.exercices(contenu, methode, true); },
};
const ROUGE_CERCLE = '#C0392B';

function pageExercices(fiche, contenu, { base = '', methode = true, identite = true } = {}) {
  const { signe } = fiche.mise;
  if (fiche.mise.rappel) return pageExercicesLibre(fiche, contenu, { base, methode, identite });
  const exemple = operationPosee({ ...contenu.methode.exemple, signe, mode: 'corrige', numero: '' });
  const { a, b } = contenu.methode.exemple;
  const egalite = `${fmt(a)} ${signe} ${fmt(b)} = ${fmt(signe === '−' ? a - b : a + b)}`;

  return `
  <section class="feuille">
    ${enTete(fiche, '', contenu, base, identite, 'eleve')}

    <div class="objectif">${echappe(contenu.objectif)}</div>

    ${methode ? `<div class="bloc bloc--methode">
      <h2>Je me souviens de la méthode</h2>
      <div class="methode">
        <div class="methode__exemple">${exemple}<div class="methode__egalite">${egalite}</div></div>
        <ol class="methode__etapes">${contenu.methode.etapes.map((e) => `<li>${echappe(e)}</li>`).join('')}</ol>
      </div>
    </div>` : ''}
${fiche.mise.exercices(contenu, methode)}
    <div class="pied-feuille">Mathoo · fiche de révision à imprimer</div>
  </section>`;
}

// Page d'une fiche dont le rappel de méthode a sa propre mise en page (`mise.rappel`).
function pageExercicesLibre(fiche, contenu, { base, methode, identite }) {
  return `
  <section class="feuille">
    ${enTete(fiche, '', contenu, base, identite, 'eleve')}

    <div class="objectif">${echappe(contenu.objectif)}</div>

    ${methode ? `<div class="bloc bloc--methode">
      <h2>Je me souviens de la méthode</h2>
      ${fiche.mise.rappel(contenu)}
    </div>` : ''}
${fiche.mise.exercices(contenu, methode)}
    <div class="pied-feuille">Mathoo · fiche de révision à imprimer</div>
  </section>`;
}

function pageCorrige(fiche, contenu, { base = '', methode = true } = {}) {
  return `
  <section class="feuille feuille--corrige">
    ${enTete(fiche, 'corrigé', contenu, base, false, 'corrige')}
    <div class="objectif objectif--corrige">Pour le parent ou l’enseignant : ${fiche.mise.noteCorrige}
      Pour retrouver exactement cette fiche plus tard : scanner le QR code, ou saisir <strong>${contenu.code}</strong> dans l’application.</div>
${fiche.mise.corriges(contenu, methode)}
    <div class="pied-feuille">Mathoo · corrigé</div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* CE2 — symétrie : axes et figures symétriques                         */
/* ------------------------------------------------------------------ */

// Page 55 du livret : « Je reconnais si une figure présente un axe de symétrie. » Le pli est un axe de symétrie ;
// la figure est symétrique par rapport à cet axe ; « Ce carré a 4 axes de symétrie. »
const FIGURES_NOMBRE_SYM = ['carré', 'rectangle', 'triangle isocèle', 'losange', 'étoile', 'croix', 'lettre H', 'cœur', 'sablier'];

// Sujets des affirmations : le nom avec son article, et la figure dessinée qui sert à compter les axes.
const SUJETS_SYM = {
  'carré': 'Un carré', 'rectangle': 'Un rectangle', 'cercle': 'Un cercle', 'losange': 'Un losange', 'triangle isocèle': 'Un triangle isocèle',
  'lettre H': 'La lettre H', 'cœur': 'Le cœur', 'lettre L': 'La lettre L', 'lettre F': 'La lettre F', 'lettre R': 'La lettre R',
};
const SUJETS_VRAIS_SYM = ['carré', 'rectangle', 'cercle', 'losange', 'triangle isocèle', 'lettre H', 'cœur'];
const SUJETS_FAUX_SYM = [...SUJETS_VRAIS_SYM, 'lettre L', 'lettre F', 'lettre R'];
// Les deux phrases de la leçon qui sont des affirmations toujours vraies, avec la phrase de la leçon qui les justifie.
const PHRASES_LECON_SYM = {
  pli: { texte: 'Le pli d’une figure pliée en deux parties qui se superposent exactement est un axe de symétrie.', justif: 'Le pli est un axe de symétrie.' },
  symetrique: { texte: 'Une figure qu’on plie en deux parties qui se superposent exactement est symétrique par rapport au pli.', justif: 'On dit que la figure est symétrique par rapport à cet axe.' },
};
const axesTxt = (n) => (n === Infinity ? 'une infinité d’axes' : `${n} ${n > 1 ? 'axes' : 'axe'}`);

function affirmationSym(sujet, vrai) {
  if (PHRASES_LECON_SYM[sujet]) return { sujet, vrai: true, texte: PHRASES_LECON_SYM[sujet].texte, justif: PHRASES_LECON_SYM[sujet].justif };
  const reel = nbAxesFigure(sujet);
  const n = vrai ? reel : pick([1, 2, 3, 4].filter((x) => x !== reel));
  const justif = sujet === 'carré' ? 'Ce carré a 4 axes de symétrie.'
    : reel === 0 ? `Aucun pli ne superpose exactement les deux parties de ${SUJETS_SYM[sujet].replace(/^(Un|La|Le)/, (m) => m.toLowerCase())}.`
      : `${SUJETS_SYM[sujet]} a ${axesTxt(reel)} de symétrie.`;
  return { sujet, vrai, nombre: n, texte: `${SUJETS_SYM[sujet]} a ${axesTxt(n)} de symétrie.`, justif };
}

function genererSymetrie(options = {}) {
  // Ex. 2 : 6 figures à nombre d'axes fini ; les 4 premières (avec le rappel) donnent au moins trois nombres différents.
  let compter;
  do { compter = shuffle(FIGURES_NOMBRE_SYM).slice(0, 6); } while (new Set(compter.slice(0, 4).map(nbAxesFigure)).size < 3);
  // Ex. 1 : 10 figures, 5 avec axe et 5 sans ; les 8 premières (avec le rappel) en gardent 3 à 5 de chaque sorte.
  const avec = shuffle(FIGURES_SYMETRIQUES.filter((n) => n !== 'cercle' && !compter.includes(n))).slice(0, 5);
  const sans = shuffle(FIGURES_ASYMETRIQUES).slice(0, 5);
  let reconnaitre;
  do { reconnaitre = shuffle([...avec, ...sans]); }
  while (reconnaitre.slice(0, 8).filter((n) => nbAxesFigure(n) > 0).length < 3 || reconnaitre.slice(0, 8).filter((n) => nbAxesFigure(n) > 0).length > 5);
  // Ex. 3 : 4 quadrillages, des demi-figures toutes différentes ; avec les deux axes, les trois premiers ont les deux.
  const deux = options.axes !== 'vertical';
  const axes = deux ? [...shuffle(['vertical', 'horizontal', pick(['vertical', 'horizontal'])]), pick(['vertical', 'horizontal'])] : Array(4).fill('vertical');
  const demi = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 4);
  const quadrillages = axes.map((axe, i) => ({ axe, figure: demi[i], cote: pick(axe === 'vertical' ? ['gauche', 'droite'] : ['haut', 'bas']) }));
  // Ex. 4 : 6 affirmations, autant de vraies que de fausses (2 et 2 parmi les 4 premières), un sujet une seule fois.
  const verdicts = [...shuffle([true, true, false, false]), ...shuffle([true, false])];
  const pris = new Set();
  const affirmations = verdicts.map((vrai) => {
    const sujet = pick((vrai ? [...SUJETS_VRAIS_SYM, 'pli', 'symetrique'] : SUJETS_FAUX_SYM).filter((s) => !pris.has(s)));
    pris.add(sujet);
    return affirmationSym(sujet, vrai);
  });
  return { objectif: 'Je reconnais si une figure présente un axe de symétrie.', reconnaitre, compter, quadrillages, affirmations };
}

const miseSymetrie = {
  signe: '',
  combien: (contenu, methode) => ({
    reconnaitre: contenu.reconnaitre.slice(0, methode ? 8 : 10),
    compter: contenu.compter.slice(0, methode ? 4 : 6),
    quadrillages: contenu.quadrillages.slice(0, methode ? 3 : 4),
    affirmations: contenu.affirmations.slice(0, methode ? 4 : 6),
    cases: methode ? 8 : 6,
  }),
  noteCorrige: 'réponses en rouge, case cochée = bonne réponse, axes tracés en pointillés, cases ajoutées hachurées dans l’exercice 3 ; dans l’exercice 4, la phrase sous chaque affirmation dit pourquoi.',
  // Rappel : la méthode du pliage et l'exemple du carré de la page 55.
  rappel() {
    return `
      <div class="rappel-sy">
        <div class="rappel-sy__texte">
          <p>Pour trouver les axes de symétrie d’une figure, j’essaie de la plier en deux, de façon à obtenir deux parties qui se superposent exactement.</p>
          <p><b>Le pli est un axe de symétrie.</b> On dit que la figure est symétrique par rapport à cet axe.</p>
        </div>
        <div class="rappel-sy__schema">
          <figure>${figureSymetrie('cœur', { taille: 70, axes: true }).svg}<figcaption>La figure</figcaption></figure>
          <span class="rappel-sy__fleche">→</span>
          <figure>${figureSymetrie('cœur', { taille: 70, plie: true }).svg}<figcaption>La figure pliée le long de l’axe</figcaption></figure>
        </div>
        <div class="rappel-sy__exemple">
          <figure>${figureSymetrie('carré', { taille: 70, axes: true }).svg}</figure>
          <p><b>Ce carré a 4 axes de symétrie.</b></p>
        </div>
      </div>`;
  },
  exercices(contenu, methode, corrige = false) {
    const { reconnaitre, compter, quadrillages, affirmations, cases } = this.combien(contenu, methode);
    const dessin = (nom, taille) => figureSymetrie(nom, { taille, axes: corrige }).svg;
    const aUnAxe = (nom) => nbAxesFigure(nom) > 0;
    const trou = '<span class="pointilles pointilles--mini"></span>';

    const cellule1 = (nom, i) => `<div class="fig-sy fig-sy--${reconnaitre.length}"><b>${lettre(i)}.</b>${dessin(nom, methode ? 76 : 66)}<span class="oui-non">${case_('oui', corrige && aUnAxe(nom))}${case_('non', corrige && !aUnAxe(nom))}</span></div>`;
    const cellule2 = (nom, i) => {
      const n = nbAxesFigure(nom);
      return `<div class="fig-ax fig-ax--${compter.length}"><b>${lettre(i)}.</b>${dessin(nom, methode ? 78 : 66)}<span class="fig-ax__rep">${corrige ? `<span class="reponse rouge">${n}</span>` : trou} axe${corrige && n < 2 ? '' : 's'}</span></div>`;
    };
    const grille = (q, i) => `<div class="grille-sy"><b>${lettre(i)}.</b>${quadrillageSymetrie({ cases, figure: q.figure, axe: q.axe, cote: q.cote, complete: corrige }).svg}</div>`;
    const affirmation = (a, i) => `<li class="affirmation" data-sujet="${a.sujet}" data-vrai="${a.vrai ? 'oui' : 'non'}"><span class="affirmation__texte"><b>${lettre(i)}.</b> ${a.texte}</span><span class="cases-vf">${case_('V', corrige && a.vrai)}${case_('F', corrige && !a.vrai)}</span>${corrige ? `<span class="affirmation__justif">${a.justif}</span>` : ''}</li>`;

    return `
    <div class="bloc">
      <h2>Exercice 1 — A-t-elle un axe de symétrie ? Coche oui ou non ; si oui, trace-le.</h2>
      <div class="figs-sy figs-sy--${reconnaitre.length}">
        ${reconnaitre.map(cellule1).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Combien d’axes de symétrie a chaque figure ?</h2>
      <div class="figs-ax figs-ax--${compter.length}">
        ${compter.map(cellule2).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Complète la figure : le trait épais est l’axe de symétrie.</h2>
      <div class="grilles-sy grilles-sy--${quadrillages.length}">
        ${quadrillages.map(grille).join('')}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Coche la bonne case : V ou F.</h2>
      <ul class="affirmations affirmations--so affirmations--sy">
        ${affirmations.map(affirmation).join('')}
      </ul>
    </div>
`;
  },
  corriges(contenu, methode) { return this.exercices(contenu, methode, true); },
};

/* ------------------------------------------------------------------ */
/* CE2 — gestion de données : tableaux et diagrammes en barres          */
/* ------------------------------------------------------------------ */

// Page 56 du livret : « Je sais lire et interpréter des données d’un tableau à double entrée ou d’un diagramme en barres. »
// Le musée ouvert de lundi à samedi : le diagramme (axe « Nombre de visiteurs » gradué de 2 000 en 2 000) et le même
// tableau à double entrée.
const MUSEE = { categories: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'], valeurs: [6000, 7000, 4000, 8000, 9000, 10000], pas: 2000, titreY: 'Nombre de visiteurs' };
const CLASSES_DONNEES = ['CE1', 'CE2', 'CM1'];

// Ex. 1 : un tableau à double entrée « sujet × classe » ; `action` est la fin de phrase de chaque ligne.
const THEMES_TABLEAU = [
  { id: 'sports', intro: 'Voici le sport préféré des élèves de trois classes.', coin: 'Sport préféré', nom: 'sport', plus: 'le plus choisi', moins: 'le moins choisi',
    lignes: [['Football', 'préfèrent le football'], ['Natation', 'préfèrent la natation'], ['Judo', 'préfèrent le judo'], ['Basket', 'préfèrent le basket']] },
  { id: 'animaux', intro: 'Voici l’animal préféré des élèves de trois classes.', coin: 'Animal préféré', nom: 'animal', plus: 'le plus choisi', moins: 'le moins choisi',
    lignes: [['Chien', 'préfèrent le chien'], ['Chat', 'préfèrent le chat'], ['Lapin', 'préfèrent le lapin'], ['Cheval', 'préfèrent le cheval']] },
  { id: 'fruits', intro: 'Voici le fruit préféré des élèves de trois classes.', coin: 'Fruit préféré', nom: 'fruit', plus: 'le plus choisi', moins: 'le moins choisi',
    lignes: [['Pomme', 'préfèrent la pomme'], ['Banane', 'préfèrent la banane'], ['Fraise', 'préfèrent la fraise'], ['Orange', 'préfèrent l’orange']] },
  { id: 'transports', intro: 'Comment les élèves viennent à l’école.', coin: 'Transport', nom: 'moyen de transport', plus: 'le plus utilisé', moins: 'le moins utilisé',
    lignes: [['À pied', 'viennent à pied'], ['En vélo', 'viennent en vélo'], ['En bus', 'viennent en bus'], ['En voiture', 'viennent en voiture']] },
];

// Ex. 2 : un diagramme en barres à 5 catégories ; chaque thème donne ses phrases.
const THEMES_DIAGRAMME = [
  { id: 'livres', intro: 'Livres empruntés à la bibliothèque chaque jour.', titreY: 'Nombre de livres',
    categories: [['Lundi', 'le lundi'], ['Mardi', 'le mardi'], ['Mercredi', 'le mercredi'], ['Jeudi', 'le jeudi'], ['Vendredi', 'le vendredi']], choisir: false,
    valeur: (c) => `Combien de livres a-t-on empruntés ${c[1]} ?`,
    max: 'Quel jour a-t-on emprunté le plus de livres ?', min: 'Quel jour a-t-on emprunté le moins de livres ?',
    ecart: (a, b) => `Combien de livres de plus a-t-on empruntés ${a[1]} que ${b[1]} ?` },
  { id: 'anniversaires', intro: 'Anniversaires des élèves de l’école, mois par mois.', titreY: 'Nombre d’élèves',
    categories: [['Janvier', 'janvier'], ['Février', 'février'], ['Mars', 'mars'], ['Avril', 'avril'], ['Mai', 'mai'], ['Juin', 'juin'], ['Septembre', 'septembre'], ['Octobre', 'octobre'], ['Novembre', 'novembre'], ['Décembre', 'décembre']], choisir: true,
    valeur: (c) => `Combien d’élèves ont leur anniversaire en ${c[1]} ?`,
    max: 'Quel mois compte le plus d’anniversaires ?', min: 'Quel mois compte le moins d’anniversaires ?',
    ecart: (a, b) => `Combien d’anniversaires de plus en ${a[1]} qu’en ${b[1]} ?` },
  { id: 'arbres', intro: 'Les arbres du parc, par sorte.', titreY: 'Nombre d’arbres',
    categories: [['Chênes', 'chênes'], ['Pins', 'pins'], ['Tilleuls', 'tilleuls'], ['Érables', 'érables'], ['Saules', 'saules']], choisir: false,
    valeur: (c) => `Combien y a-t-il de ${c[1]} dans le parc ?`,
    max: 'Quelle sorte d’arbre est la plus nombreuse ?', min: 'Quelle sorte d’arbre est la moins nombreuse ?',
    ecart: (a, b) => `Combien y a-t-il de ${a[1]} de plus que de ${b[1]} ?` },
  { id: 'fruits-vendus', intro: 'Fruits vendus au marché, en kilos.', titreY: 'Kilos vendus',
    categories: [['Pommes', 'pommes'], ['Poires', 'poires'], ['Bananes', 'bananes'], ['Fraises', 'fraises'], ['Cerises', 'cerises']], choisir: false,
    valeur: (c) => `Combien de kilos de ${c[1]} a-t-on vendus ?`,
    max: 'Quel fruit a-t-on le plus vendu ?', min: 'Quel fruit a-t-on le moins vendu ?',
    ecart: (a, b) => `Combien de kilos de ${a[1]} de plus que de ${b[1]} a-t-on vendus ?` },
];

// Ex. 3 : un petit tableau de 4 catégories à représenter sur un diagramme vide.
const THEMES_CONSTRUCTION = [
  { id: 'ferme', intro: 'Les animaux de la ferme.', coin: 'Animal', titreY: 'Nombre d’animaux', categories: ['Vaches', 'Moutons', 'Poules', 'Lapins', 'Chevaux', 'Canards'] },
  { id: 'activites', intro: 'Élèves inscrits à chaque activité.', coin: 'Activité', titreY: 'Nombre d’élèves', categories: ['Danse', 'Théâtre', 'Dessin', 'Musique', 'Judo'] },
  { id: 'billes', intro: 'Les billes de quatre enfants.', coin: 'Enfant', titreY: 'Nombre de billes', categories: ['Léa', 'Tom', 'Awa', 'Malo', 'Jade', 'Noé'] },
];

// Valeurs d’un diagramme : petits effectifs (jusqu’à 20) : pas de 1 (valeurs de 1 à 10) ou de 2 (valeurs paires de 2 à 20) ;
// grands effectifs (jusqu’à 100) : pas de 10, valeurs multiples de 10. Toutes différentes, pour que « la plus grande » soit unique.
function valeursDiagramme(n, grands) {
  const pas = grands ? 10 : pick([1, 2]);
  const reservoir = Array.from({ length: 10 }, (_, i) => (i + 1) * pas);
  return { pas, valeurs: shuffle(reservoir).slice(0, n) };
}

const extremeUnique = (t, f) => t.filter((x) => x === f(...t)).length === 1;

// Un tableau 3 × 3 (3 sujets × 3 classes) : valeurs bornées, totaux (lignes et colonnes) ≤ 20 ou ≤ 100,
// plus grande valeur de chaque ligne et plus grande et plus petite de chaque colonne uniques.
function tableauDonnees(grands) {
  const theme = pick(THEMES_TABLEAU);
  const lignes = shuffle(theme.lignes).slice(0, 3).map(([cap, action]) => ({ cap, action }));
  const [min, max, borne] = grands ? [8, 45, 100] : [2, 10, 20];
  for (let essai = 0; essai < 20000; essai++) {
    const v = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => rnd(min, max)));
    const col = (c) => v.map((r) => r[c]);
    if (v.some((r) => r.reduce((a, b) => a + b, 0) > borne) || [0, 1, 2].some((c) => col(c).reduce((a, b) => a + b, 0) > borne)) continue;
    if (!v.every((r) => extremeUnique(r, Math.max)) || ![0, 1, 2].every((c) => extremeUnique(col(c), Math.max) && extremeUnique(col(c), Math.min))) continue;
    return { theme, lignes, valeurs: v };
  }
  throw new Error('tableauDonnees : aucun tirage valide');
}

const somme = (t) => t.reduce((a, b) => a + b, 0);

function genererDonnees(options = {}) {
  const grands = options.effectifs === 'grands';
  // Ex. 1 : tableau + 6 questions (les 4 premières, avec le rappel, couvrent 4 sortes de lecture).
  const { theme, lignes, valeurs: v } = tableauDonnees(grands);
  const colonnes = CLASSES_DONNEES;
  const totaux = v.map(somme);
  const colonneDe = (c) => v.map((r) => r[c]);
  const R = shuffle([0, 1, 2]), C = shuffle([0, 1, 2]);
  const imax = (t) => t.indexOf(Math.max(...t)), imin = (t) => t.indexOf(Math.min(...t));
  const caseQ = (r, c) => ({ type: 'case', ligne: r, col: c, texte: `Combien d’élèves de ${colonnes[c]} ${lignes[r].action} ?`, reponse: v[r][c] });
  const questionsTableau = [
    caseQ(R[0], C[1]),
    { type: 'maxCol', col: C[0], texte: `Quel ${theme.nom} est ${theme.plus} en ${colonnes[C[0]]} ?`, reponse: lignes[imax(colonneDe(C[0]))].cap },
    { type: 'totalLigne', ligne: R[1], texte: `Combien d’élèves en tout ${lignes[R[1]].action} ?`, reponse: totaux[R[1]], calcul: v[R[1]].join(' + ') },
    { type: 'maxLigne', ligne: R[2], texte: `Dans quelle classe y a-t-il le plus d’élèves qui ${lignes[R[2]].action} ?`, reponse: colonnes[imax(v[R[2]])] },
    { type: 'minCol', col: C[2], texte: `Quel ${theme.nom} est ${theme.moins} en ${colonnes[C[2]]} ?`, reponse: lignes[imin(colonneDe(C[2]))].cap },
    caseQ(R[1], C[0]),
  ];

  // Ex. 4 : lecture et calcul dans le même tableau — un écart, une somme de colonne, une somme de deux cases.
  const rE = rnd(0, 2);
  let paire;
  do { paire = shuffle([0, 1, 2]).slice(0, 2); } while (v[rE][paire[0]] === v[rE][paire[1]]);
  const [cA, cB] = v[rE][paire[0]] > v[rE][paire[1]] ? paire : [paire[1], paire[0]];
  const rS = (rE + rnd(1, 2)) % 3, cS = shuffle([0, 1, 2]).slice(0, 2).sort((a, b) => a - b);
  const cT = rnd(0, 2);
  const calculs = [
    { type: 'ecartCases', ligne: rE, colA: cA, colB: cB, texte: `Combien d’élèves de plus en ${colonnes[cA]} qu’en ${colonnes[cB]} ${lignes[rE].action} ?`, reponse: v[rE][cA] - v[rE][cB], calcul: `${v[rE][cA]} − ${v[rE][cB]}` },
    { type: 'totalColonne', col: cT, texte: `Combien d’élèves de ${colonnes[cT]} ont répondu en tout ?`, reponse: somme(colonneDe(cT)), calcul: colonneDe(cT).join(' + ') },
    { type: 'sommeDeux', ligne: rS, cols: cS, texte: `Combien d’élèves de ${colonnes[cS[0]]} et de ${colonnes[cS[1]]} ${lignes[rS].action}, en tout ?`, reponse: v[rS][cS[0]] + v[rS][cS[1]], calcul: `${v[rS][cS[0]]} + ${v[rS][cS[1]]}` },
  ];

  // Ex. 2 : diagramme à 5 catégories, 6 questions (lire une valeur, la plus grande, la plus petite, un écart, puis une valeur et un écart).
  const td = pick(THEMES_DIAGRAMME);
  const cats = td.choisir ? shuffle(td.categories).slice(0, 5).sort((a, b) => td.categories.indexOf(a) - td.categories.indexOf(b)) : td.categories;
  const { pas, valeurs: vd } = valeursDiagramme(5, grands);
  const s = shuffle([0, 1, 2, 3, 4]);
  const ecartQ = (i, j) => {
    const [a, b] = vd[i] > vd[j] ? [i, j] : [j, i];
    return { type: 'ecart', a, b, texte: td.ecart(cats[a], cats[b]), reponse: vd[a] - vd[b], calcul: `${fmt(vd[a])} − ${fmt(vd[b])}` };
  };
  const valQ = (i) => ({ type: 'valeur', i, texte: td.valeur(cats[i]), reponse: vd[i] });
  const questionsDiagramme = [
    valQ(s[0]),
    { type: 'max', texte: td.max, reponse: cats[imax(vd)][0] },
    { type: 'min', texte: td.min, reponse: cats[imin(vd)][0] },
    ecartQ(s[1], s[2]),
    valQ(s[3]),
    ecartQ(s[4], s[0]),
  ];

  // Ex. 3 : 4 catégories à représenter.
  const tc = pick(THEMES_CONSTRUCTION);
  const dc = valeursDiagramme(4, grands);
  const construction = { id: tc.id, intro: tc.intro, coin: tc.coin, titreY: tc.titreY, categories: shuffle(tc.categories).slice(0, 4), valeurs: dc.valeurs, pas: dc.pas };

  return {
    objectif: 'Je sais lire et interpréter des données d’un tableau à double entrée ou d’un diagramme en barres.',
    grands,
    tableau: { id: theme.id, intro: theme.intro, coin: theme.coin, colonnes, lignes, valeurs: v, totaux },
    questionsTableau,
    diagramme: { id: td.id, intro: td.intro, titreY: td.titreY, categories: cats.map((c) => c[0]), valeurs: vd, pas },
    questionsDiagramme,
    construction,
    calculs,
  };
}

const miseDonnees = {
  signe: '',
  combien: (contenu, methode) => ({
    questionsTableau: contenu.questionsTableau.slice(0, methode ? 4 : 6),
    questionsDiagramme: contenu.questionsDiagramme.slice(0, methode ? 4 : 6),
    calculs: contenu.calculs.slice(0, methode ? 2 : 3),
  }),
  noteCorrige: 'réponses en rouge, colonne Total du tableau complétée, calculs détaillés, barres du diagramme de l’exercice 3 tracées.',
  // Rappel : le diagramme du musée et le tableau à double entrée de la page 56, avec les phrases de la leçon.
  rappel() {
    const sep = (n) => fmt(n).replace(/ /g, NBSP);
    const dessin = diagrammeBarres({ ...MUSEE, taille: 280, hauteur: 128 }).svg;
    return `
      <div class="rappel-do">
        <div class="rappel-do__diagramme">${dessin}</div>
        <div class="rappel-do__texte">
          <p>Le diagramme représente le nombre de personnes ayant visité un musée pendant une semaine. Le musée est fermé le dimanche.</p>
          <p><b>Ce diagramme donne une vision globale des données et permet des comparaisons rapides.</b></p>
          <p>On peut représenter les mêmes données dans un <b>tableau à double entrée</b> :</p>
        </div>
        <table class="tab-do tab-do--exemple">
          <colgroup><col class="c-etiquette">${MUSEE.categories.map(() => '<col>').join('')}</colgroup>
          <tr><td class="tab-do__coin"></td>${MUSEE.categories.map((c) => `<th>${c}</th>`).join('')}</tr>
          <tr><th>Nombre de visiteurs</th>${MUSEE.valeurs.map((x) => `<td>${sep(x)}</td>`).join('')}</tr>
        </table>
        <p class="rappel-do__lire">Dans le tableau, je cherche la <b>ligne</b>, puis la <b>colonne</b>. Pour une barre, je lis le nombre sur l’axe.</p>
      </div>`;
  },
  exercices(contenu, methode, corrige = false) {
    const { questionsTableau, questionsDiagramme, calculs } = this.combien(contenu, methode);
    const { tableau, diagramme, construction } = contenu;
    const trou = '<span class="pointilles pointilles--mini"></span>';
    const ligneRep = '<span class="pointilles pointilles--rep"></span>';
    const rep = (x) => (corrige ? `<span class="reponse rouge" data-reponse="${x}">${fmt(x)}</span>` : trou);
    const repLongue = (x) => (corrige ? `<span class="reponse rouge" data-reponse="${x}">${x}</span>` : ligneRep);
    const question = (q, i, avecCalcul) => {
      const texteRep = typeof q.reponse === 'number' ? rep(q.reponse) : repLongue(q.reponse);
      const calcul = avecCalcul
        ? `<span class="q-do__calcul"><span class="q-do__lib">Calcul :</span> ${corrige ? `<span class="calcul rouge">${q.calcul}</span> =` : '<span class="pointilles pointilles--rep"></span> ='} ${texteRep}</span>`
        : `<span class="q-do__rep"><span class="q-do__lib">Réponse :</span> ${corrige && q.calcul ? `<span class="q-do__suite"><span class="calcul rouge">${q.calcul} =</span> ${texteRep}</span>` : texteRep}</span>`;
      return `<li class="q-do" data-type="${q.type}"${q.ligne !== undefined ? ` data-ligne="${q.ligne}"` : ''}${q.col !== undefined ? ` data-col="${q.col}"` : ''}${q.colA !== undefined ? ` data-col-a="${q.colA}" data-col-b="${q.colB}"` : ''}${q.cols ? ` data-cols="${q.cols.join(',')}"` : ''}${q.a !== undefined ? ` data-a="${q.a}" data-b="${q.b}"` : ''}${q.i !== undefined ? ` data-i="${q.i}"` : ''}><span class="q-do__texte"><b>${lettre(i)}.</b> ${q.texte}</span>${calcul}</li>`;
    };
    const liste = (qs, avecCalcul = () => false) => `<ul class="q-do-liste">${qs.map((q, i) => question(q, i, avecCalcul(q))).join('')}</ul>`;
    const ecartAvecCalcul = (q) => q.type === 'ecart';
    const tabEx1 = `<table class="tab-do tab-do--donnees">
        <tr><th class="tab-do__coin">${tableau.coin}</th>${tableau.colonnes.map((c) => `<th>${c}</th>`).join('')}<th class="tab-do__total">Total</th></tr>
        ${tableau.lignes.map((l, r) => `<tr><th>${l.cap}</th>${tableau.valeurs[r].map((x) => `<td>${x}</td>`).join('')}<td class="tab-do__total ${corrige ? 'rouge' : 'vide'}">${corrige ? tableau.totaux[r] : ''}</td></tr>`).join('')}
      </table>`;
    const dessin2 = diagrammeBarres({ categories: diagramme.categories, valeurs: diagramme.valeurs, pas: diagramme.pas, titreY: diagramme.titreY, taille: 290, hauteur: methode ? 144 : 168 }).svg;
    const tabEx3 = `<table class="tab-do tab-do--construction">
        <tr><th class="tab-do__coin">${construction.coin}</th>${construction.categories.map((c) => `<th>${c}</th>`).join('')}</tr>
        <tr><th>Nombre</th>${construction.valeurs.map((x) => `<td>${x}</td>`).join('')}</tr>
      </table>`;
    const dessin3 = diagrammeBarres({ categories: construction.categories, valeurs: construction.valeurs, pas: construction.pas, titreY: construction.titreY, vide: !corrige, taille: 300, hauteur: methode ? 146 : 185 }).svg;

    return `
    <div class="bloc">
      <h2>Exercice 1 — Complète la colonne Total du tableau, puis réponds aux questions.</h2>
      <div class="ex-do ex-do--tableau">
        <div class="ex-do__figure"><p class="ex-do__intro">${tableau.intro}</p>${tabEx1}</div>
        ${liste(questionsTableau)}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 2 — Lis le diagramme en barres, puis réponds aux questions.</h2>
      <div class="ex-do ex-do--diagramme">
        <div class="ex-do__figure"><p class="ex-do__intro">${diagramme.intro}</p>${dessin2}</div>
        ${liste(questionsDiagramme, ecartAvecCalcul)}
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 3 — Construis le diagramme en barres avec les données du tableau.</h2>
      <div class="ex-do ex-do--construction">
        <div class="ex-do__figure"><p class="ex-do__intro">${construction.intro}</p>${tabEx3}<p class="ex-do__consigne">Trace une barre grise pour chaque colonne.</p></div>
        <div class="ex-do__dessin">${dessin3}</div>
      </div>
    </div>

    <div class="bloc">
      <h2>Exercice 4 — Avec le tableau de l’exercice 1, lis, puis calcule.</h2>
      ${liste(calculs, () => true)}
    </div>
`;
  },
  corriges(contenu, methode) { return this.exercices(contenu, methode, true); },
};

/* ------------------------------------------------------------------ */

// Les quatre domaines du livret, dans l'ordre.
export const DOMAINES = ['Nombres et calculs', 'Grandeurs et mesures', 'Géométrie', 'Gestion de données'];

// RÈGLE : on ajoute toujours une fiche à la FIN de FICHES. On ne déplace ni ne
// supprime jamais une entrée, ni une valeur d'option : le code imprimé sur les
// fiches encode l'index de la fiche et l'index de chaque valeur d'option.
export const FICHES = [
  {
    id: 'ce2-addition-posee',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/03-addition-posee.md',
    pages: '14–15',
    objectif: 'Je sais poser et calculer des additions avec des nombres inférieurs à 10 000.',
    titre: 'Opérations — addition posée',
    court: 'addition posée',
    emoji: '➕',
    options: [
      {
        id: 'taille', libelle: 'Nombres utilisés',
        valeurs: [
          { v: '3', nom: 'Jusqu’à 999' },
          { v: '4', nom: 'Jusqu’à 9 999' },
          { v: 'mix', nom: 'Les deux' },
        ],
        defaut: 'mix',
      },
    ],
    generer: genererAdditionPosee,
    mise: miseAddition,
  },
  {
    id: 'ce2-soustraction-posee',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/04-soustraction-posee.md',
    pages: '16–18',
    objectif: 'Je sais poser et calculer une soustraction avec des nombres à 4 chiffres.',
    titre: 'Opérations — soustraction posée',
    court: 'soustraction posée',
    emoji: '➖',
    options: [
      {
        id: 'taille', libelle: 'Nombres utilisés',
        valeurs: [
          { v: '3', nom: 'Jusqu’à 999' },
          { v: '4', nom: 'Jusqu’à 9 999' },
          { v: 'mix', nom: 'Les deux' },
        ],
        defaut: 'mix',
      },
    ],
    generer: genererSoustractionPosee,
    mise: miseSoustraction,
  },
  {
    id: 'ce2-multiplication',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/05-multiplication.md',
    pages: '19–21',
    objectif: 'Je sais calculer en ligne des produits, et poser et calculer une multiplication par un nombre à 1 chiffre.',
    titre: 'Opérations — multiplication',
    court: 'multiplication',
    emoji: '✖️',
    options: [
      {
        id: 'facteur', libelle: 'Multiplier par',
        valeurs: [
          { v: '1', nom: '× 1 chiffre' },
          { v: '2', nom: '× 1 et × 2 chiffres' },
        ],
        defaut: '2',
      },
    ],
    generer: genererMultiplication,
    mise: miseMultiplication,
  },
  {
    id: 'ce2-nombres-lire-ecrire',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/02-nombres-jusqu-a-10000.md',
    pages: '3–8',
    objectif: 'Je sais qu’une centaine, c’est aussi dix dizaines et cent unités, et je sais représenter un nombre de différentes façons.',
    titre: 'Les nombres : lire, écrire, décomposer',
    court: 'nombres : lire et écrire',
    emoji: '🔢',
    options: [
      {
        id: 'taille', libelle: 'Nombres utilisés',
        valeurs: [
          { v: '1000', nom: 'Jusqu’à 999' },
          { v: '10000', nom: 'Jusqu’à 9 999' },
        ],
        defaut: '10000',
      },
    ],
    generer: genererNombres,
    mise: miseNombres,
  },
  {
    id: 'ce2-nombres-comparer',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/02-nombres-jusqu-a-10000.md',
    pages: '9–13',
    objectif: 'Je sais comparer, ranger et encadrer des nombres entiers, et les placer sur une demi-droite graduée.',
    titre: 'Les nombres : comparer, ranger, encadrer',
    court: 'nombres : comparer',
    emoji: '⚖️',
    options: [
      {
        id: 'taille', libelle: 'Nombres utilisés',
        valeurs: [
          { v: '1000', nom: 'Jusqu’à 999' },
          { v: '10000', nom: 'Jusqu’à 9 999' },
        ],
        defaut: '10000',
      },
    ],
    generer: genererNombresComparer,
    mise: miseComparer,
  },
  {
    id: 'ce2-fractions-lire',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/06-fractions.md',
    pages: '22–25',
    objectif: 'Je sais lire et écrire une fraction.',
    titre: 'Les fractions : lire, écrire, représenter',
    court: 'fractions : lire',
    emoji: '🍰',
    options: [],
    generer: genererFractions,
    mise: miseFractions,
  },
  {
    id: 'ce2-fractions-comparer',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/06-fractions.md',
    pages: '26–29',
    objectif: 'Je sais reconnaître des fractions égales et comparer des fractions.',
    titre: 'Les fractions : égales et comparaison',
    court: 'fractions : comparer',
    emoji: '⚖️',
    options: [],
    generer: genererFractionsComparer,
    mise: miseFractionsComparer,
  },
  {
    id: 'ce2-fractions-calculer',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    lecon: 'programme/ce2/01-nombres-et-calculs/06-fractions.md',
    pages: '30–31',
    objectif: 'Je sais mesurer des longueurs de bandes avec une règle graduée en fractions d’unité, et additionner ou soustraire des fractions de même dénominateur.',
    titre: 'Les fractions : mesurer, additionner, soustraire',
    court: 'fractions : calculer',
    emoji: '➕',
    options: [
      {
        id: 'denominateur', libelle: 'Dénominateurs utilisés',
        valeurs: [
          { v: '4', nom: 'Demis, tiers, quarts' },
          { v: '10', nom: 'Jusqu’aux dixièmes' },
        ],
        defaut: '4',
      },
    ],
    generer: genererFractionsCalculer,
    mise: miseFractionsCalculer,
  },
  {
    id: 'ce2-monnaie',
    classe: 'ce2',
    domaine: 'Grandeurs et mesures',
    lecon: 'programme/ce2/02-grandeurs-et-mesures/01-monnaie.md',
    pages: '32',
    objectif: 'Je sais composer une somme avec des pièces et des billets, et je sais rendre la monnaie.',
    titre: 'La monnaie : composer une somme, rendre la monnaie',
    court: 'monnaie',
    emoji: '🪙',
    options: [
      {
        id: 'centimes', libelle: 'Prix utilisés',
        valeurs: [
          { v: 'non', nom: 'Euros entiers' },
          { v: 'oui', nom: 'Avec les centimes' },
        ],
        defaut: 'oui',
      },
    ],
    generer: genererMonnaie,
    mise: miseMonnaie,
  },
  {
    id: 'ce2-longueurs',
    classe: 'ce2',
    domaine: 'Grandeurs et mesures',
    lecon: 'programme/ce2/02-grandeurs-et-mesures/02-longueurs.md',
    pages: '33–36',
    objectif: 'Je connais les relations entre mm, cm, dm et m, et je sais calculer le périmètre d’une figure.',
    titre: 'Les longueurs : unités, conversions, périmètre',
    court: 'longueurs',
    emoji: '📏',
    options: [
      {
        id: 'km', libelle: 'Unités utilisées',
        valeurs: [
          { v: 'non', nom: 'mm, cm, dm, m' },
          { v: 'oui', nom: 'Avec le kilomètre' },
        ],
        defaut: 'oui',
      },
    ],
    generer: genererLongueurs,
    mise: miseLongueurs,
  },
  {
    id: 'ce2-heures',
    classe: 'ce2',
    domaine: 'Grandeurs et mesures',
    lecon: 'programme/ce2/02-grandeurs-et-mesures/03-heures.md',
    pages: '37–38',
    objectif: 'Je sais lire l’heure sur une horloge à aiguilles et les horaires comme 8 heures moins 10.',
    titre: 'Les heures : lire l’heure sur une horloge',
    court: 'heures',
    emoji: '🕒',
    options: [
      {
        id: 'minutes', libelle: 'Minutes utilisées',
        valeurs: [
          { v: 'quarts', nom: 'Heures, quarts et demies' },
          { v: 'cinq', nom: 'Toutes les 5 minutes' },
        ],
        defaut: 'cinq',
      },
    ],
    generer: genererHeures,
    mise: miseHeures,
  },
  {
    id: 'ce2-masses-contenances',
    classe: 'ce2',
    domaine: 'Grandeurs et mesures',
    lecon: 'programme/ce2/02-grandeurs-et-mesures/04-masses.md',
    pages: '39–42',
    objectif: 'Je connais les relations entre g, kg et t, et les unités de contenance (cL, dL, L).',
    titre: 'Les masses et les contenances',
    court: 'masses et contenances',
    emoji: '⚖️',
    options: [
      {
        id: 'grandeur', libelle: 'Grandeurs',
        valeurs: [
          { v: 'masses', nom: 'Masses (g, kg, t)' },
          { v: 'contenances', nom: 'Contenances (cL, dL, L)' },
          { v: 'deux', nom: 'Les deux' },
        ],
        defaut: 'deux',
      },
    ],
    generer: genererMassesContenances,
    mise: miseMassesContenances,
  },
  {
    id: 'ce2-durees',
    classe: 'ce2',
    domaine: 'Grandeurs et mesures',
    lecon: 'programme/ce2/02-grandeurs-et-mesures/06-durees.md',
    pages: '43–44',
    objectif: 'Je connais les relations entre minutes, heures, demi-heure, quart d’heure, siècle et millénaire, et je calcule des durées.',
    titre: 'Les durées : relations et calculs',
    court: 'durées',
    emoji: '⏱️',
    options: [
      {
        id: 'secondes', libelle: 'Unités utilisées',
        valeurs: [
          { v: 'non', nom: 'Minutes et heures' },
          { v: 'oui', nom: 'Avec les secondes' },
        ],
        defaut: 'non',
      },
    ],
    generer: genererDurees,
    mise: miseDurees,
  },
  {
    id: 'ce2-solides',
    classe: 'ce2',
    domaine: 'Géométrie',
    lecon: 'programme/ce2/03-geometrie/01-solides.md',
    pages: '45–47',
    objectif: 'Je sais reconnaître les solides : un cube, un pavé, une pyramide, une boule, un cylindre, un cône.',
    titre: 'Les solides : reconnaître, décrire, patrons du cube',
    court: 'solides',
    emoji: '🧊',
    options: [],
    generer: genererSolides,
    mise: miseSolides,
  },
  {
    id: 'ce2-polygones',
    classe: 'ce2',
    domaine: 'Géométrie',
    lecon: 'programme/ce2/03-geometrie/02-polygones.md',
    pages: '48–50',
    objectif: 'Je sais reconnaître un polygone et construire un cercle avec un compas.',
    titre: 'Les polygones et le cercle',
    court: 'polygones et cercle',
    emoji: '🔷',
    options: [],
    generer: genererPolygones,
    mise: misePolygones,
  },
  {
    id: 'ce2-symetrie',
    classe: 'ce2',
    domaine: 'Géométrie',
    lecon: 'programme/ce2/03-geometrie/03-symetrie.md',
    pages: '55',
    objectif: 'Je reconnais si une figure présente un axe de symétrie.',
    titre: 'La symétrie : axes et figures symétriques',
    court: 'symétrie',
    emoji: '🪞',
    options: [
      {
        id: 'axes', libelle: 'Axes des quadrillages',
        valeurs: [
          { v: 'vertical', nom: 'Axe vertical' },
          { v: 'deux', nom: 'Axe vertical ou horizontal' },
        ],
        defaut: 'deux',
      },
    ],
    generer: genererSymetrie,
    mise: miseSymetrie,
  },
  {
    id: 'ce2-donnees',
    classe: 'ce2',
    domaine: 'Gestion de données',
    lecon: 'programme/ce2/04-gestion-de-donnees/01-gestion-de-donnees.md',
    pages: '56',
    objectif: 'Je sais lire et interpréter des données d’un tableau à double entrée ou d’un diagramme en barres.',
    titre: 'Les tableaux et les diagrammes en barres',
    court: 'tableaux et diagrammes',
    emoji: '📊',
    options: [
      {
        id: 'effectifs', libelle: 'Effectifs',
        valeurs: [
          { v: 'petits', nom: 'Jusqu’à 20' },
          { v: 'grands', nom: 'Jusqu’à 100' },
        ],
        defaut: 'petits',
      },
    ],
    generer: genererDonnees,
    mise: miseDonnees,
  },
];

export const fichesDe = (classeId) => FICHES.filter((f) => f.classe === classeId);
export const ficheParId = (id) => FICHES.find((f) => f.id === id);

export function optionsParDefaut(fiche) {
  return Object.fromEntries((fiche.options || []).map((o) => [o.id, o.defaut]));
}

/* ------------------------------------------------------------------ */
/* Graine et code de fiche                                             */
/* ------------------------------------------------------------------ */

// Chaque fiche porte un code imprimé : on peut la retrouver à l'identique plus
// tard — pour réimprimer le corrigé, ou refaire la même fiche une semaine après.
// Le code contient tout : la fiche, ses options et la graine du tirage.

const GRAINE_MAX = 36 ** 6;
const graineAleatoire = () => Math.floor(Math.random() * GRAINE_MAX);

export function codeDe(fiche, options, graine) {
  const chiffres = [FICHES.indexOf(fiche).toString(36)];
  for (const o of fiche.options || []) {
    chiffres.push(Math.max(0, o.valeurs.findIndex((v) => v.v === options[o.id])).toString(36));
  }
  chiffres.push(graine.toString(36).padStart(6, '0'));
  const brut = chiffres.join('').toUpperCase();
  return `${brut.slice(0, 4)}-${brut.slice(4)}`;
}

// Renvoie { fiche, options, graine } (code d'une fiche) ou
// { panache: true, notions, graine, miniRappel } (code d'une feuille panachée, préfixé « Z »),
// ou null si le code n'est pas reconnu.
export function decoder(code) {
  const brut = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (brut[0] === 'Z') return decoderPanache(brut);
  if (brut.length < 7) return null;
  const fiche = FICHES[parseInt(brut[0], 36)];
  if (!fiche) return null;
  // index + une valeur par option + 6 caractères de graine (une fiche sans option fait 7 caractères)
  if (brut.length < 1 + (fiche.options || []).length + 6) return null;
  const options = {};
  let i = 1;
  for (const o of fiche.options || []) {
    const valeur = o.valeurs[parseInt(brut[i++], 36)];
    if (!valeur) return null;
    options[o.id] = valeur.v;
  }
  const graine = parseInt(brut.slice(i), 36);
  if (!Number.isFinite(graine)) return null;
  return { fiche, options, graine };
}

/* Code d'une feuille panachée
   « Z » + masque des notions (base 36, 4 caractères : le bit i est la fiche d'index i de FICHES,
   soit 20 fiches au plus) + un caractère par option de chaque notion choisie (dans l'ordre de
   FICHES, puis dans l'ordre des options) : l'index de sa valeur + graine (6 caractères) + mini-rappel (0 ou 1).
   « Z » n'est jamais l'index d'une fiche : l'ancien format n'en compte que 17, et il ne
   pourrait de toute façon pas dépasser 35. Mêmes règles que codeDe : on n'ajoute qu'à la fin. */
const BITS_MASQUE = 20;

// notions : [{ id, options }] (dans n'importe quel ordre). Renvoie le code groupé par 4.
export function codePanache(notions, graine, miniRappel = false) {
  const choisies = FICHES.map((f, i) => ({ f, i, n: notions.find((x) => x.id === f.id) })).filter((x) => x.n);
  if (!choisies.length) throw new Error('Une feuille panachée a au moins une notion.');
  if (choisies.some((x) => x.i >= BITS_MASQUE)) throw new Error('Le code panaché ne couvre que les 20 premières fiches.');
  const masque = choisies.reduce((m, x) => m + 2 ** x.i, 0);
  let brut = `Z${masque.toString(36).padStart(4, '0')}`;
  for (const { f, n } of choisies) {
    for (const o of f.options || []) {
      brut += Math.max(0, o.valeurs.findIndex((v) => v.v === (n.options || {})[o.id])).toString(36);
    }
  }
  brut += (graine % GRAINE_MAX).toString(36).padStart(6, '0') + (miniRappel ? '1' : '0');
  return brut.toUpperCase().match(/.{1,4}/g).join('-');
}

function decoderPanache(brut) {
  if (brut.length < 12 || !/^[0-9A-Z]{4}$/.test(brut.slice(1, 5))) return null;
  const masque = parseInt(brut.slice(1, 5), 36);
  const notions = [];
  let i = 5;
  for (let k = 0; k < BITS_MASQUE + 1; k++) {
    if (Math.floor(masque / 2 ** k) % 2 === 0) continue;
    const fiche = FICHES[k];
    if (!fiche || k >= BITS_MASQUE) return null;
    const options = {};
    for (const o of fiche.options || []) {
      const valeur = o.valeurs[parseInt(brut[i++], 36)];
      if (!valeur) return null;
      options[o.id] = valeur.v;
    }
    notions.push({ id: fiche.id, options });
  }
  if (!notions.length || brut.length !== i + 7) return null;
  const graine = parseInt(brut.slice(i, i + 6), 36);
  const mini = brut[i + 6];
  if (!Number.isFinite(graine) || (mini !== '0' && mini !== '1')) return null;
  return { panache: true, notions, graine, miniRappel: mini === '1' };
}

// Le tirage des exercices et leur mise en page sont deux étapes distinctes :
// on peut réafficher, ou masquer le corrigé, sans retirer de nouveaux nombres.
export function tirer(fiche, options, graine = graineAleatoire()) {
  setAlea(generateurAleatoire(graine));
  try {
    return { ...fiche.generer(options), graine, code: codeDe(fiche, options, graine) };
  } finally {
    setAlea(null);   // on rend son hasard habituel au reste de l'application
  }
}

// `contenus` : une fiche ou plusieurs. Les pages élève sortent d'abord, les corrigés
// ensuite : on donne la pile du dessus à l'enfant et on garde le reste.
// `eleve: false` ne rend que les corrigés — c'est la vue partagée par lien.
export function rendre(fiche, contenus, {
  corrige = true, methode = true, identite = true, eleve = true, base = '',
} = {}) {
  const liste = Array.isArray(contenus) ? contenus : [contenus];
  const pages = eleve ? liste.map((c) => pageExercices(fiche, c, { base, methode, identite })) : [];
  if (corrige || !eleve) pages.push(...liste.map((c) => pageCorrige(fiche, c, { base, methode })));
  return pages.join('');
}

/* ------------------------------------------------------------------ */
/* Blocs d'exercices réutilisables                                     */
/* ------------------------------------------------------------------ */

// Découpe le HTML d'une suite d'exercices en blocs de premier niveau (<div class="bloc"> …
// </div>), en comptant les <div> imbriqués. Chaque fragment est une sous-chaîne exacte du HTML
// que produisent `mise.exercices` / `mise.corriges` : la page d'une fiche et la feuille
// panachée affichent donc les mêmes octets.
function decouperBlocs(html) {
  const blocs = [];
  const balise = /<(\/?)div(?=[\s>])/g;
  let profondeur = 0, debut = -1, m;
  while ((m = balise.exec(html))) {
    if (!m[1]) {
      if (profondeur++ === 0) debut = m.index;
    } else if (--profondeur === 0) {
      blocs.push(html.slice(debut, html.indexOf('>', m.index) + 1));
    }
  }
  return blocs;
}

// « Exercice 2 — Convertis. » → { titre: 'Exercice 2', consigne: 'Convertis.' }
// (le corrigé de certaines fiches n'écrit que « Exercice 2 » : on lit toujours la consigne côté élève).
function titreDuBloc(html) {
  const h2 = (/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html) || [])[1] || '';
  const m = /^\s*(Exercice \d+)\s*(?:—\s*([\s\S]*?))?\s*$/.exec(h2);
  return { titre: m ? m[1] : h2.trim(), consigne: m && m[2] ? m[2] : '' };
}

// La liste ordonnée des exercices d'une fiche : { titre, consigne, eleve, corrige, hauteur, hauteurCorrige }.
// `hauteur` et `hauteurCorrige` (px, impression, 703 px de large) viennent de hauteurs-blocs.js ;
// on les mesure avec le rappel de méthode (`methode: true`), qui est la version courte des exercices.
export function blocsDe(fiche, contenu, { methode = true } = {}) {
  const eleves = decouperBlocs(fiche.mise.exercices(contenu, methode));
  const corriges = decouperBlocs(fiche.mise.corriges(contenu, methode));
  if (eleves.length !== corriges.length) throw new Error(`${fiche.id} : ${eleves.length} exercices, ${corriges.length} corrigés`);
  const mesures = HAUTEURS_BLOCS[fiche.id] || {};
  return eleves.map((eleve, i) => ({
    ...titreDuBloc(eleve),
    eleve,
    corrige: corriges[i],
    hauteur: (mesures.eleve || [])[i] || 0,
    hauteurCorrige: (mesures.corrige || [])[i] || 0,
  }));
}

// Chaque fiche expose `blocs(contenu, { methode })`.
for (const f of FICHES) f.blocs = (contenu, options) => blocsDe(f, contenu, options);
