// Fiches de révision imprimables.
// Une fiche = un générateur d'exercices + une mise en page A4 (voir @media print
// dans styles.css). Tout est régénérable : une nouvelle série à chaque clic.

import { rnd, pick, shuffle, fmt, setAlea, generateurAleatoire } from './utils.js';
import { qrSVG } from './qr.js';

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
  if (brut.length < 8) return null;
  const fiche = FICHES[parseInt(brut[0], 36)];
  if (!fiche) return null;
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
