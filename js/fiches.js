// Fiches de révision imprimables.
// Une fiche = un générateur d'exercices + une mise en page A4 (voir @media print
// dans styles.css). Tout est régénérable : une nouvelle série à chaque clic.

import { rnd, pick, shuffle, fmt, enLettres, setAlea, generateurAleatoire } from './utils.js';
import { qrSVG } from './qr.js';
import { demiDroite, figureFraction } from './visuels.js';

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

const echappe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Le QR code rouvre exactement cette fiche dans l'application. Celui de la feuille
// de l'enfant ouvre les exercices seuls — les réponses ne sont pas à un scan près ;
// celui du corrigé, que l'adulte garde, ouvre la correction.
function enTete(fiche, sousTitre, contenu, base, identite = true, vue = 'eleve') {
  const lien = base ? `${base}?fiche=${contenu.code}&vue=${vue}` : '';
  const qr = lien ? qrSVG(lien, { taille: 76, marge: 2 }) : '';
  return `
    <div class="feuille__entete">
      <div class="feuille__entete__texte">
        <div class="feuille__domaine">${fiche.classe.toUpperCase()} · ${fiche.domaine}</div>
        <h1 class="feuille__titre">${fiche.titre}${sousTitre ? ` — <em>${sousTitre}</em>` : ''}</h1>
        ${identite ? `<div class="feuille__identite">
          <span>Nom : <span class="pointilles"></span></span>
          <span>Date : <span class="pointilles pointilles--court"></span></span>
        </div>` : ''}
      </div>
      <div class="feuille__qr">
        ${qr}
        <div class="feuille__code">${contenu.code}</div>
      </div>
    </div>`;
}

const lettre = (i) => String.fromCharCode(97 + i);

// Une fiche décrit sa mise en page par un objet `mise` :
//   signe, combien(contenu, methode) → opérations imprimées,
//   noteCorrige (phrase d'en-tête du corrigé),
//   exercices(contenu, methode) / corriges(contenu, methode) → blocs HTML des exercices.
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

export const FICHES = [
  {
    id: 'ce2-addition-posee',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    titre: 'Opérations — addition posée',
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
    titre: 'Opérations — soustraction posée',
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
    titre: 'Opérations — multiplication',
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
    titre: 'Les nombres : lire, écrire, décomposer',
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
    titre: 'Les nombres : comparer, ranger, encadrer',
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
    titre: 'Les fractions : lire, écrire, représenter',
    emoji: '🍰',
    options: [],
    generer: genererFractions,
    mise: miseFractions,
  },
  {
    id: 'ce2-fractions-comparer',
    classe: 'ce2',
    domaine: 'Nombres et calculs',
    titre: 'Les fractions : égales et comparaison',
    emoji: '⚖️',
    options: [],
    generer: genererFractionsComparer,
    mise: miseFractionsComparer,
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

// Renvoie { fiche, options, graine } ou null si le code n'est pas reconnu.
export function decoder(code) {
  const brut = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
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
