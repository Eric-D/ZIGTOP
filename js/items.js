// Banque d'items par notion : des exercices structurés, tirés du MÊME contenu que la fiche.
//
// `items(ficheId, { options, graine, difficulte, formulation })` appelle `tirer(fiche, options, graine)`
// (le tirage de la fiche imprimée) et en fait une liste d'items :
//   { id, notion, difficulte (1–5), type: 'nombre' | 'choix', enonce, reponse, aide,
//     choix? (type 'choix'), visuel? (aide, spec de `visuel()` de visuels.js), visuelEnonce? (figure posée avec
//     l'énoncé), formulation, operandes }
// - `reponse` est toujours un entier (type 'nombre') ou une chaîne courte (type 'choix'), comparable avec
//   `normalise()` de l'application ; un décimal n'est jamais demandé : on demande des centimes, ou on
//   sépare les euros et les centimes (ou les heures et les minutes) en deux items ;
// - `operandes` : les nombres de l'item tels qu'ils sont imprimés sur la fiche de même code (chaînes), pour
//   vérifier que la feuille et l'application portent les mêmes nombres ;
// - `aide` reprend la formulation (`commune` par défaut, ou `livret`), comme le rappel de la fiche ;
// - `id` : « code de fiche # rang » (stable pour une fiche donnée, quelle que soit la formulation) ;
// - `exercice1` : vrai pour les items qui reprennent l'exercice 1 de la page élève (celui qu'une feuille
//   panachée garde, voir js/panache.js). Pour la monnaie (composer une somme) et les fractions à
//   calculer (mesurer une bande), les items de l'exercice 1 viennent en tête de liste.
// Même graine et mêmes options : mêmes items, dans le même ordre. L'ordre est celui de la fiche (exercice 1,
// puis 2…) ; `difficulte` (un nombre, ou { min, max }) ne garde que les items de cette difficulté.
//
// Règles de difficulté (1 = doux, 5 = costaud), posées sur ce que l'item demande :
//   addition posée       : 1 + (chiffres − 3) + retenues (0, 1, 2 et plus) ; + 1 pour un problème
//   soustraction posée   : même règle, avec le nombre de colonnes où il faut compenser
//   multiplication       : en ligne 2 ; × 1 chiffre : 1 + (a à 3 chiffres) + (2 retenues ou plus) ;
//                          × 2 chiffres : 3 (facteur de 11 à 19) ou 4, + 1 si la ligne des unités a 2 retenues ou plus ;
//                          + 1 pour un problème
//   nombres : lire/écrire: lettres → chiffres 1, recomposer 2, trou d'une décomposition 2, combien de dizaines 3,
//                          de centaines 2 ; + 1 avec 4 chiffres, + 1 si le nombre contient un 0
//   nombres : comparer   : rang du premier chiffre qui diffère (nombres de longueurs différentes 1, milieu 2…,
//                          égaux 3), + 1 avec un 0 ; encadrer : dizaine 1, centaine 2, millier 3, + 1 avec 4 chiffres
//   conversions (longueurs, masses, contenances) : 1 + 1 si on va vers la plus grande unité + (rapport 100 : 1,
//                          rapport 1 000 : 2) ; écriture à deux unités + 1 ; comparaison : 2 + rapport + 1 si égalité
//   périmètre            : carré 1, rectangle 2, triangle 3, pentagone 4
//   monnaie              : conversions 2 (3 pour les centimes restants), euros entiers 1 (4 termes : 2),
//                          rendre la monnaie 1 en euros entiers, 3 avec des centimes ; + 1 s'il y a deux étapes
//                          (+ 1 pour un problème)
//   durées               : égalités 1 à 3 (relation simple, calcul, deux unités) ; durée ou arrivée : 1 + passage de
//                          l'heure + trois sauts + durée de 2 h ou plus, + 1 pour un problème
//   fractions            : dénominateur 2–3 : 1, 4–5 : 2, 6–7 : 3, 8–10 : 4 ; + 1 pour une soustraction ; + 1 pour un
//                          problème (au plus 5)
//   fractions : lire     : comme les fractions (dénominateur 2–3 : 1 … 8–10 : 4) pour la figure et le nom en lettres ;
//                          phrases du vocabulaire : dénominateur / numérateur / parts 2, nom / écriture / « fois » 3
//   fractions : comparer : égale à 1 : 1, égale à 1/2 : 2 ; même dénominateur 1 (+ 1 si dénominateur ≥ 10) ; même
//                          numérateur 2 (+ 1 si numérateur ≥ 3) ; la plus petite / grande de quatre : 3 (+ 1 si ≥ 10)
//   heures               : lire une horloge : pile 1, quart ou demie 2, autre minute 3 (+ 1 après la demie) ;
//                          dire avec « moins » : et demie 2, moins le quart 3, autres 4 ; 24 heures 2
//   solides              : nommer : cube, boule 1 ; pavé, pyramide, cylindre 2 ; cône 3 ; compter faces 1, sommets 2,
//                          arêtes 3 (+ 1 pour la pyramide) ; patron : 1-4-1 → 3, autres patrons → 4, ligne ou
//                          rectangle de six carrés 2, autres assemblages 4
//   polygones            : reconnaître : triangle, quadrilatère, ligne ouverte, cercle 1 ; pentagone, hexagone,
//                          ovale, courbe fermée 2 ; demi-disque 3 ; nommer = comme reconnaître, compter les côtés
//                          + 1 ; rayon → diamètre 2, diamètre → rayon 3
//   symétrie             : a un axe : oui 1, non 2 (le parallélogramme 3) ; nombre d'axes : 1 + nombre d'axes (au plus 5)
//   données              : lire une case ou une barre 1 ; le plus / le moins (tableau, diagramme) 2 ; total d'une ligne
//                          ou d'une colonne, somme de deux cases 2, écart 3 ; + 1 pour les calculs avec les grands effectifs
//   le plus petit / grand d'une liste (nombres) : 2 (+ 1 avec 4 chiffres) ; intercaler : 1 (dizaine ou centaine
//                          entière), 2 sinon, + 1 si le premier nombre finit par 9 ; composer une somme : 2, + 1 à
//                          5 pièces ou billets et plus, + 1 avec les centimes ; bande sur la règle : comme les fractions
// Lot 2 : les 17 fiches ont des items. Quand la réponse est une figure ou un mot, c'est un QCM (`type: 'choix'`, 2 à 4
// propositions dont une seule juste : « oui » / « non » pour une question fermée, jamais « vrai » / « faux ») ; quand
// c'est un nombre, on le tape. `visuelEnonce` (spec de `visuel()`) : la figure à lire, posée AVEC l'énoncé, tirée de la
// même donnée que la figure de la feuille de même code ; `visuel` reste l'aide montrée après une réponse.
// Hors de la banque (restent sur papier) : colorier, tracer (aiguilles, cercle, axes), compléter une figure par symétrie,
// construire un diagramme, la droite graduée, les tableaux de numération, écrire un nombre en lettres, les phrases à
// trous du vocabulaire (polygones) et le vrai-ou-faux des solides et de la symétrie. L'intercalation n'est demandée
// que par « le plus petit nombre entier » : la réponse reste un entier unique, comparée avec `normalise()`.

import { ficheParId, tirer, formulation, optionsParDefaut, FORMULATION_DEFAUT } from './fiches.js';
import { fmt, enLettres } from './utils.js';
import { patronCube, nbAxesFigure, BILLETS_EURO, PIECES_EURO } from './visuels.js';

const NBSP = ' ';
const NOMS_RANGS = ['unités', 'dizaines', 'centaines', 'milliers'];
const ABREV_RANGS = ['u', 'd', 'c', 'm'];
const AU_PLUS = (d) => Math.max(1, Math.min(5, d));
const chiffresDe = (n) => String(n).split('').reverse().map(Number);   // unités d'abord
const avecZero = (n) => (String(n).includes('0') ? 1 : 0);
const lg = (n, u) => `${fmt(n)}${NBSP}${u}`;
const eur = (c) => { const e = Math.floor(c / 100), r = c % 100; return r === 0 ? `${e}${NBSP}€` : `${e},${String(r).padStart(2, '0')}${NBSP}€`; };
const eurNu = (c) => eur(c).replace(`${NBSP}€`, '');   // « 12,60 », « 20 » : comme imprimé, sans le symbole
const hm = (h, m) => `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
const dureeTxt = (d) => {
  const h = Math.floor(d / 60), m = d % 60;
  return h && m ? `${h}${NBSP}h${NBSP}${m}${NBSP}min` : h ? `${h}${NBSP}h` : `${m}${NBSP}min`;
};
const horaireTxt = (t) => (t % 60 ? hm(Math.floor(t / 60), t % 60) : `${t / 60}${NBSP}h`);
const symbole = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
const nb = (n) => fmt(n);

// Nombre de retenues d'une addition, et de colonnes à compenser dans une soustraction.
function nbRetenuesAddition(a, b) {
  const A = chiffresDe(a), B = chiffresDe(b);
  let r = 0, n = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    r = (A[i] || 0) + (B[i] || 0) + r >= 10 ? 1 : 0;
    n += r;
  }
  return n;
}
function nbCompensations(a, b) {
  const A = chiffresDe(a), B = chiffresDe(b);
  let r = 0, n = 0;
  for (let i = 0; i < A.length; i++) {
    r = A[i] < (B[i] || 0) + r ? 1 : 0;
    n += r;
  }
  return n;
}
function nbRetenuesProduit(a, d) {
  const A = chiffresDe(a);
  let r = 0, n = 0;
  for (let j = 0; j + 1 < A.length; j++) { r = Math.floor((A[j] * d + r) / 10); if (r) n++; }
  return n;
}

/* ------------------------------------------------------------------ */
/* Les aides : les mêmes calculs que le corrigé, dans la formulation   */
/* ------------------------------------------------------------------ */

function aideAddition(a, b, fm) {
  const livret = fm.nom === 'livret';
  const A = chiffresDe(a), B = chiffresDe(b);
  const etapes = [];
  let r = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const s = (A[i] || 0) + (B[i] || 0) + r;
    const termes = r ? `${A[i] || 0} + ${B[i] || 0} + ${r}` : `${A[i] || 0} + ${B[i] || 0}`;
    const dernier = i === Math.max(A.length, B.length) - 1;
    let phrase = `${livret ? `${termes} = ${s} ${ABREV_RANGS[i]}` : `${NOMS_RANGS[i][0].toUpperCase()}${NOMS_RANGS[i].slice(1)} : ${termes} = ${s}`}.`;
    if (s >= 10 && !dernier) {
      phrase += livret
        ? ` ${s} ${ABREV_RANGS[i]}, c’est 1 ${ABREV_RANGS[i + 1]} et ${s % 10} ${ABREV_RANGS[i]} : j’écris ${s % 10} et je retiens 1.`
        : ` J’écris ${s % 10} et je retiens 1, en haut de la colonne suivante.`;
    } else phrase += ` J’écris ${s}.`;
    etapes.push(phrase);
    r = s >= 10 ? 1 : 0;
  }
  return `Je pose l’addition en colonnes et je commence par les unités. ${etapes.join(' ')} Le résultat est ${nb(a + b)}.`;
}

function aideSoustraction(a, b, fm) {
  const livret = fm.nom === 'livret';
  const A = chiffresDe(a), B = chiffresDe(b);
  const etapes = [];
  if (livret) {
    const cur = [...A];
    for (let i = 0; i < A.length; i++) {
      const bas = B[i] || 0;
      if (cur[i] >= bas) { etapes.push(`${NOMS_RANGS[i]} : ${cur[i]} − ${bas} = ${cur[i] - bas}.`); continue; }
      cur[i + 1] -= 1;
      etapes.push(`${NOMS_RANGS[i]} : ${cur[i]} − ${bas} n’est pas possible. Je casse 1 ${NOMS_RANGS[i + 1].replace(/s$/, '')} pour avoir 10 ${NOMS_RANGS[i]} de plus : ${cur[i] + 10} − ${bas} = ${cur[i] + 10 - bas}.`);
    }
  } else {
    let r = 0;
    for (let i = 0; i < A.length; i++) {
      const bas = (B[i] || 0) + r;
      if (A[i] >= bas) { etapes.push(`${NOMS_RANGS[i]} : ${A[i]} − ${bas} = ${A[i] - bas}.`); r = 0; continue; }
      etapes.push(`${NOMS_RANGS[i]} : ${A[i]} − ${bas} n’est pas possible. J’ajoute 10 au ${A[i]} : ${A[i] + 10} − ${bas} = ${A[i] + 10 - bas}, et j’ajoute 1 au chiffre du bas de la colonne suivante.`);
      r = 1;
    }
  }
  return `Je pose la soustraction en colonnes et je commence par les unités. ${etapes.map((e) => e[0].toUpperCase() + e.slice(1)).join(' ')} Le résultat est ${nb(a - b)}. Je peux vérifier : ${nb(a - b)} + ${nb(b)} = ${nb(a)}.`;
}

function aideProduitPose(a, b, fm) {
  const livret = fm.nom === 'livret';
  const ligne = (d) => {
    const A = chiffresDe(a);
    let r = 0;
    const pas = [];
    for (let j = 0; j < A.length; j++) {
      const p = A[j] * d + r;
      const dernier = j === A.length - 1;
      pas.push(`${NOMS_RANGS[j][0].toUpperCase()}${NOMS_RANGS[j].slice(1)} : ${A[j]} × ${d}${r ? ` + ${r}` : ''} = ${p}.${dernier ? ` J’écris ${p}.` : ` J’écris ${p % 10} et je retiens ${Math.floor(p / 10)}${livret ? ` ${NOMS_RANGS[j + 1].replace(/s$/, '')}${Math.floor(p / 10) > 1 ? 's' : ''}` : ''}.`}`);
      r = Math.floor(p / 10);
    }
    return pas.join(' ');
  };
  if (b < 10) return `Je pose la multiplication et je commence par les unités. ${ligne(b)} Le résultat est ${nb(a * b)}.`;
  const u = b % 10, d = Math.floor(b / 10);
  return `Je multiplie ${nb(a)} par les unités de ${b} : ${nb(a)} × ${u} = ${nb(a * u)}. Puis par les dizaines, en écrivant un 0 dans la colonne des unités : ${nb(a)} × ${d} × 10 = ${nb(a * d * 10)}. J’additionne les deux lignes : ${nb(a * u)} + ${nb(a * d * 10)} = ${nb(a * b)}.`;
}

/* ------------------------------------------------------------------ */
/* Les générateurs d'items, un par notion                              */
/* ------------------------------------------------------------------ */

// Chaque générateur reçoit (contenu, fm, options) et rend des items bruts :
// { difficulte, type, enonce, reponse, aide, operandes, choix?, visuel? }.
const brut = (difficulte, type, enonce, reponse, aide, operandes, extra = {}) => ({ difficulte: AU_PLUS(difficulte), type, enonce, reponse, aide, operandes: operandes.map(String), ...extra });
const nombreItem = (d, enonce, reponse, aide, operandes, extra) => brut(d, 'nombre', enonce, reponse, aide, operandes, extra);
const choixItem = (d, enonce, choix, reponse, aide, operandes, extra) => brut(d, 'choix', enonce, reponse, aide, operandes, { choix, ...extra });
const SIGNES = ['<', '>', '='];

function itemsAddition(c, fm) {
  const posee = ({ a, b }, probleme) => nombreItem(
    1 + (String(a).length - 3) + Math.min(nbRetenuesAddition(a, b), 2) + (probleme ? 1 : 0),
    probleme ? probleme.enonce : `${nb(a)} + ${nb(b)} = ?`, a + b, aideAddition(a, b, fm), [nb(a), nb(b)]);
  return [...c.posees.map((x) => posee(x)), ...c.aposer.map((x) => posee(x)), ...c.problemes.map((p) => posee(p, p))];
}

function itemsSoustraction(c, fm) {
  const posee = ({ a, b }, probleme) => nombreItem(
    1 + (String(a).length - 3) + Math.min(nbCompensations(a, b), 2) + (probleme ? 1 : 0),
    probleme ? probleme.enonce : `${nb(a)} − ${nb(b)} = ?`, a - b, aideSoustraction(a, b, fm), [nb(a), nb(b)]);
  return [...c.posees.map((x) => posee(x)), ...c.aposer.map((x) => posee(x)), ...c.problemes.map((p) => posee(p, p))];
}

function itemsMultiplication(c, fm) {
  const difficulte = (a, b) => {
    if (b < 10) return 1 + (String(a).length === 3 ? 1 : 0) + (nbRetenuesProduit(a, b) >= 2 ? 1 : 0);
    return (b < 20 ? 3 : 4) + (nbRetenuesProduit(a, b % 10) >= 2 ? 1 : 0);
  };
  const enLigne = c.enligne.map(({ a, b }) => nombreItem(2, `${a} × ${b} = ?`, a * b,
    `${fm.rappel.texteRectangle(a, b, b - 10)} Donc ${a * 10} + ${a * (b - 10)} = ${a * b}.`, [a, b]));
  const posee = ({ a, b }, probleme) => nombreItem(
    difficulte(a, b) + (probleme ? 1 : 0),
    probleme ? probleme.enonce : `${nb(a)} × ${b} = ?`, a * b, aideProduitPose(a, b, fm), [nb(a), b]);
  return [...enLigne, ...c.posees1.map((x) => posee(x)), ...c.posees2.map((x) => posee(x)), ...c.problemes.map((p) => posee(p, p))];
}

function itemsNombres(c, fm) {
  const q = c.quatre ? 1 : 0;
  const out = [];
  for (const n of c.lire) {
    out.push(nombreItem(1 + q + avecZero(n), `Écris en chiffres : « ${enLettres(n)} »`, n,
      `« ${enLettres(n)} » s’écrit ${nb(n)}.`, []));
  }
  const termes = (n) => String(n).split('').map((ch, i, t) => Number(ch) * 10 ** (t.length - 1 - i));
  for (const { n, vides } of c.decomp) {
    const t = termes(n);
    const ligne = t.map((v, i) => (vides.includes(i) ? '…' : nb(v))).join(' + ');
    vides.forEach((i, k) => {
      out.push(nombreItem(2 + q + avecZero(n), `${nb(n)} = ${ligne}. Quel nombre remplace le ${k === 0 ? 'premier' : 'second'} « … » ?`, t[i],
        `${nb(n)} = ${t.map(nb).join(' + ')} : chaque chiffre vaut son rang. Ici le terme est ${nb(t[i])}.`, [nb(n)]));
    });
  }
  for (const n of c.recomp) {
    out.push(nombreItem(2 + q + avecZero(n), `${termes(n).map(nb).join(' + ')} = ?`, n,
      `J’additionne les termes : ${termes(n).map(nb).join(' + ')} = ${nb(n)}.`, termes(n).map(nb)));
  }
  for (const n of c.combien) {
    const dz = Math.floor(n / 10), ce = Math.floor(n / 100);
    const phrase = fm.corrige.combien(n, dz, ce);
    out.push(nombreItem(3 + q + avecZero(n), `Combien de dizaines y a-t-il en tout dans ${nb(n)} ?`, dz, `${phrase} (${nb(n)} = ${nb(dz)} dizaines et ${n % 10} unités.)`, [nb(n)]));
    out.push(nombreItem(2 + q + avecZero(n), `Combien de centaines y a-t-il en tout dans ${nb(n)} ?`, ce, `${phrase} (${nb(n)} = ${nb(ce)} centaines et ${n % 100} unités.)`, [nb(n)]));
  }
  return out;
}

function aideComparer(a, b, fm) {
  const livret = fm.nom === 'livret';
  const sa = String(a), sb = String(b);
  if (a === b) return `Les deux nombres s’écrivent pareil : ${nb(a)} = ${nb(b)}.`;
  if (sa.length !== sb.length) return `${nb(sa.length > sb.length ? a : b)} a plus de chiffres : c’est le plus grand. ${nb(a)} ${symbole(a, b)} ${nb(b)}.`;
  let i = 0;
  while (sa[i] === sb[i]) i++;
  const rang = NOMS_RANGS[sa.length - 1 - i];
  const mot = livret ? `le nombre de ${rang}` : `le chiffre des ${rang}`;
  const debut = i ? `Les chiffres de gauche sont les mêmes. ` : '';
  return `${debut}Je compare ${mot} : ${sa[i]} et ${sb[i]}. On s’arrête dès que deux chiffres de même rang sont différents : ${nb(a)} ${symbole(a, b)} ${nb(b)}.`;
}

function itemsComparer(c, fm) {
  const out = [];
  for (const { a, b } of c.paires) {
    const sa = String(a), sb = String(b);
    let d;
    if (a === b) d = 3;
    else if (sa.length !== sb.length) d = 1;
    else { let i = 0; while (sa[i] === sb[i]) i++; d = 1 + i; }
    out.push(choixItem(d + Math.max(avecZero(a), avecZero(b)), `Compare : ${nb(a)} … ${nb(b)}`, SIGNES, symbole(a, b), aideComparer(a, b, fm), [nb(a), nb(b)]));
  }
  const PAS = { dizaine: 10, centaine: 100, millier: 1000 };
  const RANG = { dizaine: 1, centaine: 2, millier: 3 };
  for (const { n, unite } of c.encadrer) {
    const inf = Math.floor(n / PAS[unite]) * PAS[unite], sup = inf + PAS[unite];
    const d = RANG[unite] + (c.quatre ? 1 : 0);
    const quoi = `à la ${unite}`;
    const aide = `Encadrer ${nb(n)} ${quoi}, c’est le situer entre deux ${unite}s consécutives : ${nb(inf)} < ${nb(n)} < ${nb(sup)}.`;
    out.push(nombreItem(d, `Encadre ${nb(n)} ${quoi} : … < ${nb(n)} < … . Quelle est la borne de gauche ?`, inf, aide, [nb(n)]));
    out.push(nombreItem(d, `Encadre ${nb(n)} ${quoi} : … < ${nb(n)} < … . Quelle est la borne de droite ?`, sup, aide, [nb(n)]));
  }
  out.push(...itemsRanger(c), ...itemsIntercaler(c));
  return out;
}

/* Conversions : longueurs, masses, contenances */
const MM_PAR = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000 };
const BASE_MC = { g: 1, kg: 1000, t: 1000000, cL: 1, dL: 10, L: 100 };
const valeurDe = (u) => (u in MM_PAR ? MM_PAR[u] : BASE_MC[u]);
const rangRapport = (r) => (r >= 1000 ? 2 : r >= 100 ? 1 : 0);
function difficulteConversion(de, vers) {
  const r = Math.max(valeurDe(de), valeurDe(vers)) / Math.min(valeurDe(de), valeurDe(vers));
  return 1 + (valeurDe(de) < valeurDe(vers) ? 1 : 0) + rangRapport(r);
}
function difficulteComparaison(ua, ub, egal) {
  return 2 + rangRapport(valeurDe(ua) / valeurDe(ub)) + (egal ? 1 : 0);
}
function aideConversion(n, de, vers, fm, calcul) {
  const ligne = valeurDe(de) > valeurDe(vers)
    ? `1 ${de} = ${fmt(valeurDe(de) / valeurDe(vers))} ${vers}, donc je multiplie : ${nb(n)} × ${fmt(valeurDe(de) / valeurDe(vers))} = ${nb(calcul)}.`
    : `${fmt(valeurDe(vers) / valeurDe(de))} ${de} = 1 ${vers}, donc je divise : ${nb(n)} ÷ ${fmt(valeurDe(vers) / valeurDe(de))} = ${nb(calcul)}.`;
  return `${ligne} Donc ${lg(n, de)} = ${lg(calcul, vers)}.`;
}
const conversionItem = ({ n, de, vers }, fm) => {
  const rep = n * valeurDe(de) / valeurDe(vers);
  return nombreItem(difficulteConversion(de, vers), `${lg(n, de)} = … ${vers}`, rep, aideConversion(n, de, vers, fm, rep), [nb(n)]);
};
const comparaisonItem = (p, fm) => {
  const va = p.a.n * valeurDe(p.a.u), vb = p.b.n * valeurDe(p.b.u);
  const petite = valeurDe(p.a.u) < valeurDe(p.b.u) ? p.a.u : p.b.u;
  const ca = va / valeurDe(petite), cb = vb / valeurDe(petite);
  return choixItem(difficulteComparaison(p.a.u, p.b.u, va === vb), `Compare : ${lg(p.a.n, p.a.u)} … ${lg(p.b.n, p.b.u)}`, SIGNES, symbole(va, vb),
    `Pour comparer, j’utilise la même unité, ${petite} : ${lg(ca, petite)} et ${lg(cb, petite)}. Donc ${lg(p.a.n, p.a.u)} ${symbole(va, vb)} ${lg(p.b.n, p.b.u)}.`, [nb(p.a.n), nb(p.b.n)]);
};

function itemsLongueurs(c, fm) {
  const out = c.conversions.map((x) => conversionItem(x, fm));
  for (const e of c.ecritures) {
    const total = e.hi * e.rapport + e.lo;
    if (e.sens === 'mixte') {
      const d = difficulteConversion(e.petite, e.grande) + 1;
      const aide = `${lg(total, e.petite)} = ${e.hi} × ${fmt(e.rapport)} + ${e.lo} : ${lg(total, e.petite)} = ${lg(e.hi, e.grande)} ${lg(e.lo, e.petite)}.`;
      const enonce = `${lg(total, e.petite)} = … ${e.grande} … ${e.petite}`;
      out.push(nombreItem(d, `${enonce}. Combien de ${e.grande} entiers ?`, e.hi, aide, [nb(total)]));
      out.push(nombreItem(d, `${enonce}. Combien de ${e.petite} en plus ?`, e.lo, aide, [nb(total)]));
    } else {
      out.push(nombreItem(difficulteConversion(e.grande, e.petite) + 1, `${lg(e.hi, e.grande)} ${lg(e.lo, e.petite)} = … ${e.petite}`, total,
        `${lg(e.hi, e.grande)} = ${lg(e.hi * e.rapport, e.petite)}, puis j’ajoute ${lg(e.lo, e.petite)} : ${lg(total, e.petite)}.`, [nb(e.hi), nb(e.lo)]));
    }
  }
  out.push(...c.comparaisons.map((p) => comparaisonItem(p, fm)));
  const tour = (f) => (f.forme === 'carre' ? Array(4).fill(f.cotes[0]) : f.forme === 'rectangle' ? [f.cotes[0], f.cotes[1], f.cotes[0], f.cotes[1]] : f.cotes);
  const FORMES = { carre: 1, rectangle: 2, triangle: 3, pentagone: 4 };
  for (const f of c.figures) {
    const t = tour(f);
    const p = t.reduce((s, x) => s + x, 0);
    const cotes = f.cotes.map((x) => lg(x, 'cm'));
    const phrase = { carre: `Un carré a un côté de ${cotes[0]}.`, rectangle: `Un rectangle mesure ${cotes[0]} de long et ${cotes[1]} de large.`,
      triangle: `Un triangle a des côtés de ${cotes.slice(0, -1).join(', ')} et ${cotes[2]}.`,
      pentagone: `Un pentagone a cinq côtés : ${cotes.slice(0, -1).join(', ')} et ${cotes[4]}.` }[f.forme];
    out.push(nombreItem(FORMES[f.forme], `${phrase} Quel est son périmètre, en cm ?`, p,
      `${fm.rappel.calculer()} ${t.map((x) => lg(x, 'cm')).join(' + ')} = ${lg(p, 'cm')}.`, f.cotes.map(nb),
      { visuel: { type: 'polygone', forme: f.forme, cotes: f.cotes } }));
  }
  return out;
}

function itemsMasses(c, fm) {
  const out = [];
  const UNITES = { masses: ['g', 'kg', 't'], contenances: ['cL', 'dL', 'L'] };
  const RANG_OBJET = { g: 1, cL: 1, kg: 2, dL: 2, t: 3, L: 3 };
  for (const o of c.objets) {
    const famille = ['g', 'kg', 't'].includes(o.u) ? 'masses' : 'contenances';
    const rel = famille === 'masses' ? '1 kg = 1 000 g et 1 t = 1 000 kg' : '1 L = 10 dL = 100 cL';
    out.push(choixItem(RANG_OBJET[o.u], `${o.nom} : ${fmt(o.n)} … Quelle unité faut-il écrire ?`, UNITES[famille], o.u,
      `Je pense à un repère : ${rel}. ${o.nom} : ${lg(o.n, o.u)} est une mesure qui convient.`, [nb(o.n)]));
  }
  out.push(...c.conversions.map((x) => conversionItem(x, fm)));
  out.push(...c.comparaisons.map((p) => comparaisonItem(p, fm)));
  for (const pb of c.problemes) {
    out.push(nombreItem(2 + (pb.modele === 'recette' || pb.modele === 'verres' ? 0 : 1), pb.enonce, pb.resultat,
      `${pb.calcul}.`, pb.nombres.map(nb)));
  }
  return out;
}

/* Monnaie : tous les montants sont des entiers en centimes d'euro */
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
const listeArticles = (articles) => {
  const t = articles.map((a) => `${a.nom} à ${eur(a.prix)}`);
  return t.length > 1 ? `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}` : t[0];
};

function itemsMonnaie(c, fm) {
  const out = itemsSommes(c);
  const unite = c.centimes ? 'combien de centimes ?' : 'combien d’euros ?';
  const sortie = (cts) => (c.centimes ? cts : cts / 100);
  if (c.centimes) {
    for (const { vers, total } of c.conversions) {
      const e = Math.floor(total / 100), r = total % 100;
      const aide = `1 € = 100 c, donc ${e} € = ${e * 100} c et ${e} € ${r} c = ${total} c.`;
      if (vers === 'cts') {
        out.push(nombreItem(2, `${e}${NBSP}€ ${r}${NBSP}c = … c`, total, aide, [e, r]));
      } else {
        out.push(nombreItem(2, `${total}${NBSP}c = … € … c. Combien d’euros entiers ?`, e, aide, [total]));
        out.push(nombreItem(3, `${total}${NBSP}c = … € … c. Combien de centimes en plus ?`, r, aide, [total]));
      }
    }
  } else {
    for (const { termes } of c.additions) {
      const total = termes.reduce((s, t) => s + t, 0);
      out.push(nombreItem(termes.length > 3 ? 2 : 1, `${termes.map((t) => eur(t * 100)).join(' + ')} = … €`, total,
        `J’additionne les euros : ${termes.join(' + ')} = ${total}.`, termes));
    }
  }
  for (const a of c.achats) {
    const { etapes, rendu } = complement(a.prix, a.billet, c.centimes);
    out.push(nombreItem((c.centimes ? 3 : 1) + (etapes.length > 1 ? 1 : 0),
      `Rends la monnaie sur ${eur(a.billet * 100)} pour ${eur(a.prix)} : ${unite}`, sortie(rendu),
      fm.corrige.complement({ etapes, rendu }), [eurNu(a.prix), a.billet],
      { visuel: { type: 'monnaie', valeurs: [a.billet * 100] } }));
  }
  for (const pb of c.problemes) {
    const total = pb.articles.reduce((s, x) => s + x.prix, 0);
    const { etapes, rendu } = complement(total, pb.billet, c.centimes);
    const base = (c.centimes ? 4 : 2) + (etapes.length > 1 ? 1 : 0);
    const operandes = [...pb.articles.map((x) => eurNu(x.prix)), pb.billet];
    const enonce = `${pb.prenom} achète ${listeArticles(pb.articles)} et paie avec un billet de ${eur(pb.billet * 100)}.`;
    out.push(nombreItem(base - 1, `${enonce} Quel est le prix total, ${c.centimes ? 'en centimes' : 'en euros'} ?`, sortie(total),
      `Prix total : ${pb.articles.map((x) => eur(x.prix)).join(' + ')} = ${eur(total)}.`, operandes));
    out.push(nombreItem(base, `${enonce} Combien le vendeur rend-il, ${c.centimes ? 'en centimes' : 'en euros'} ?`, sortie(rendu),
      `Prix total : ${eur(total)}. ${fm.corrige.complement({ etapes, rendu })}`, operandes));
  }
  return out;
}

/* Durées */
function itemsDurees(c, fm) {
  const out = [];
  const trous = (e, rangDifficile) => {
    const aide = `${e.gauche.replace(NBSP, ' ')} = ${e.reponses.map(([v, u]) => lg(v, u)).join(' ')}.`;
    const nombres = (e.gauche.match(/\d+/g) || []);
    if (e.reponses.length === 1) {
      const [v, u] = e.reponses[0];
      return [nombreItem(rangDifficile ? 2 : 1, `${e.gauche} = … ${u}`, v, aide, nombres)];
    }
    const enonce = `${e.gauche} = ${e.reponses.map(([, u]) => `… ${u}`).join(' ')}`;
    return e.reponses.map(([v, u]) => nombreItem(3, `${enonce}. Combien de ${u} ?`, v, aide, nombres));
  };
  for (const e of c.egalites) {
    const simple = /^1 /.test(e.gauche);
    out.push(...trous(e, !simple));
  }
  for (const e of c.conversions) out.push(...trous(e, true));
  const nbSauts = ({ t0, duree }) => {
    const m = t0 % 60;
    let reste = duree, n = 0;
    if (m && reste >= 60 - m) { n++; reste -= 60 - m; }
    const heures = Math.floor(reste / 60);
    if (heures) n++;
    return n + (reste - heures * 60 ? 1 : 0);
  };
  const dif = (x) => 1 + (x.t0 % 60 && x.duree >= 60 - (x.t0 % 60) ? 1 : 0) + (nbSauts(x) >= 3 ? 1 : 0) + (x.duree >= 120 ? 1 : 0);
  // Les nombres tels qu'imprimés : « 9 h 05 » → 9 et 05 ; « 1 h 35 min » → 1 et 35.
  const opHoraire = (t) => [String(Math.floor(t / 60)), ...(t % 60 ? [String(t % 60).padStart(2, '0')] : [])];
  const opDuree = (d) => [...(Math.floor(d / 60) ? [String(Math.floor(d / 60))] : []), ...(d % 60 ? [String(d % 60)] : [])];
  const aideDe = (x, fin) => `${fm.rappel.calcul(horaireTxt(x.t0), horaireTxt(x.t1))} ${fin}`;
  for (const x of c.durees) {
    const enonce = `Départ : ${horaireTxt(x.t0)} ; arrivée : ${horaireTxt(x.t1)}. Durée : … h … min`;
    const aide = aideDe(x, `Durée : ${dureeTxt(x.duree)}.`);
    const op = [...opHoraire(x.t0), ...opHoraire(x.t1)];
    out.push(nombreItem(dif(x), `${enonce}. Combien d’heures ?`, Math.floor(x.duree / 60), aide, op));
    out.push(nombreItem(dif(x), `${enonce}. Combien de minutes en plus ?`, x.duree % 60, aide, op));
  }
  for (const x of c.arrivees) {
    const enonce = `Départ : ${horaireTxt(x.t0)} ; durée : ${dureeTxt(x.duree)}. Arrivée : … h …`;
    const aide = aideDe(x, `Arrivée à ${horaireTxt(x.t1)}.`);
    const op = [...opHoraire(x.t0), ...opDuree(x.duree)];
    out.push(nombreItem(dif(x), `${enonce} Combien d’heures ?`, Math.floor(x.t1 / 60), aide, op));
    out.push(nombreItem(dif(x), `${enonce} Combien de minutes ?`, x.t1 % 60, aide, op));
  }
  for (const pb of c.problemes) {
    if (pb.modele === 'film') {
      const aide = aideDe(pb, `Le film finit à ${horaireTxt(pb.t1)}.`);
      const op = [...opHoraire(pb.t0), ...opDuree(pb.duree)];
      out.push(nombreItem(dif(pb) + 1, `${pb.enonce} Donne d’abord les heures.`, Math.floor(pb.t1 / 60), aide, op));
      out.push(nombreItem(dif(pb) + 1, `${pb.enonce} Donne maintenant les minutes.`, pb.t1 % 60, aide, op));
    } else {
      const enonce = pb.modele === 'trajet' ? pb.enonce.replace(/ \?$/, ', en minutes ?') : pb.enonce;
      out.push(nombreItem(dif(pb) + 1, enonce, pb.duree, aideDe(pb, `La durée est de ${dureeTxt(pb.duree)}, soit ${pb.duree} minutes.`), [...opHoraire(pb.t0), ...opHoraire(pb.t1)]));
    }
  }
  return out;
}

/* Fractions : on demande le numérateur, le dénominateur est donné dans l'énoncé */
const fr = (n, d) => `${n}/${d}`;
const difficulteFraction = (d, sous, probleme) => AU_PLUS((d <= 3 ? 1 : d <= 5 ? 2 : d <= 7 ? 3 : 4) + (sous ? 1 : 0) + (probleme ? 1 : 0));
function itemsFractions(c, fm) {
  const out = itemsBandes(c, fm);
  const aide = (a, b, d, sous) => `${sous ? fm.rappel.soustraire : fm.rappel.additionner} ${a} ${sous ? '−' : '+'} ${b} = ${sous ? a - b : a + b}, donc ${fr(sous ? a - b : a + b, d)}.`;
  for (const { a, b, d } of c.additions) {
    out.push(nombreItem(difficulteFraction(d, false), `${fr(a, d)} + ${fr(b, d)} = …/${d}. Quel est le numérateur ?`, a + b, aide(a, b, d, false), [a, b, d]));
  }
  for (const { a, b, d } of c.soustractions) {
    out.push(nombreItem(difficulteFraction(d, true), `${fr(a, d)} − ${fr(b, d)} = …/${d}. Quel est le numérateur ?`, a - b, aide(a, b, d, true), [a, b, d]));
  }
  for (const pb of c.problemes) {
    const F = (n) => fr(n, pb.d);
    const enonce = pb.modele === 'gateau'
      ? (pb.op === '+'
        ? `${pb.p} mange ${F(pb.a)} d’un gâteau et ${pb.q} en mange ${F(pb.b)}. Quelle fraction du gâteau ont-ils mangée ?`
        : `Il reste ${F(pb.a)} d’un gâteau. ${pb.p} en mange ${F(pb.b)}. Quelle fraction du gâteau reste-t-il ?`)
      : (pb.op === '+'
        ? `Un ruban rouge mesure ${F(pb.a)} de mètre et un ruban bleu ${F(pb.b)} de mètre. On les met bout à bout. Quelle est la longueur totale ?`
        : `Un ruban mesure ${F(pb.a)} de mètre. On en coupe ${F(pb.b)} de mètre. Quelle longueur de ruban reste-t-il ?`);
    const sous = pb.op === '−';
    out.push(nombreItem(difficulteFraction(pb.d, sous, true), `${enonce} Écris le numérateur, le dénominateur est ${pb.d}.`, sous ? pb.a - pb.b : pb.a + pb.b,
      aide(pb.a, pb.b, pb.d, sous), [pb.a, pb.b, pb.d]));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Lot 2 : les figures et les mots se répondent par QCM                */
/* ------------------------------------------------------------------ */

// `visuelEnonce` : un dessin posé AVEC l'énoncé (la figure à lire), même spec que `visuel` ; il vient de la même
// donnée que la figure de la feuille de même code. `visuel` reste l'aide montrée après une réponse.
const OUI_NON = ['oui', 'non'];
const ouiNon = (b) => (b ? 'oui' : 'non');
const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Le texte brut d'un morceau de formulation (sans balises ni entités).
const texteBrut = (h) => String(h).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, NBSP).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const Fp = (n, d) => `${n}/${d}`;
// Les propositions : la bonne, puis les premiers leurres distincts, au plus `n`.
function qcm(bonne, leurres, n = 4) {
  const out = [bonne];
  for (const l of leurres) { if (out.length >= n) break; if (!out.includes(l)) out.push(l); }
  return out;
}

/* Fractions : lire */
const NOM_FRACTION = { 2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 7: 'septième', 8: 'huitième', 9: 'neuvième', 10: 'dixième' };
const enMots = (n, d) => `${enLettres(n)} ${NOM_FRACTION[d]}${n > 1 && d !== 3 ? 's' : ''}`;
const nomPluriel = (n, d) => `${n} ${NOM_FRACTION[d]}${n > 1 && d !== 3 ? 's' : ''}`;
// Quatre fractions : la bonne et trois erreurs classiques (inverser, prendre les parts non coloriées…).
function proposerFractions(n, d, candidats) {
  const bonnes = candidats.filter(([a, b]) => a >= 1 && b >= 1 && a * d !== n * b && !(a === n && b === d)).map(([a, b]) => [a, b]);
  const vus = new Set([Fp(n, d)]);
  const choisies = [[n, d]];
  for (const f of bonnes) { if (choisies.length >= 4) break; if (!vus.has(Fp(...f))) { vus.add(Fp(...f)); choisies.push(f); } }
  // Un ordre sans lien avec la bonne réponse, mais le même à chaque tirage (une empreinte de l'écriture).
  const empreinte = (f) => [...Fp(...f)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 1009, 7);
  return choisies.sort((x, y) => empreinte(x) - empreinte(y)).map((f) => Fp(...f));
}

const MESURE_DIFFICILE = (d) => (d <= 3 ? 1 : d <= 5 ? 2 : d <= 7 ? 3 : 4);

function phraseAffirmation(a) {
  switch (a.modele) {
    case 'den': return `Dans ${Fp(a.n, a.d)}, le dénominateur est ${a.x}.`;
    case 'num': return `Dans ${Fp(a.n, a.d)}, le numérateur est ${a.x}.`;
    case 'nom': return `${Fp(1, a.d)}, c’est un ${NOM_FRACTION[a.x]}.`;
    case 'ecrit': return `${enMots(a.n, a.d)} s’écrit ${Fp(a.n, a.x)}.`;
    case 'fois': return `${Fp(a.n, a.d)}, c’est ${enLettres(a.x)} fois ${Fp(1, a.d)}.`;
    case 'parts': return a.vrai
      ? 'Le dénominateur indique en combien de parts égales on partage l’unité.'
      : 'Le dénominateur indique combien de parts on a coloriées.';
    default: return a.vrai
      ? 'Le numérateur indique combien de parts on a coloriées.'
      : 'Le numérateur indique en combien de parts égales on partage l’unité.';
  }
}
const DIFFICULTE_AFFIRMATION = { den: 2, num: 2, parts: 2, colorie: 2, nom: 3, ecrit: 3, fois: 3 };

function itemsFractionsLire(c, fm) {
  const out = [];
  const aideFigure = (n, d) => (fm.nom === 'livret'
    ? `L’unité est partagée en ${d} parts égales : le dénominateur est ${d}. On a colorié ${n === 1 ? 'une part' : `${n} parts`} : le numérateur est ${n}. La fraction est ${Fp(n, d)}.`
    : `L’unité est partagée en ${d} parts : le dénominateur est ${d}. On en prend ${n} : le numérateur est ${n}. On écrit ${Fp(n, d)}.`);
  for (const f of c.lire) {
    const choix = proposerFractions(f.n, f.parts, [[f.parts - f.n, f.parts], [f.n, f.parts - f.n], [f.parts, f.n], [f.n + 1, f.parts], [f.n - 1, f.parts], [f.n, f.parts + 1], [f.n, f.parts - 1]]);
    out.push(choixItem(difficulteFraction(f.parts, false), 'Quelle fraction est coloriée ?', choix, Fp(f.n, f.parts), aideFigure(f.n, f.parts), [],
      { visuelEnonce: { type: 'fraction', forme: f.forme, parts: f.parts, coloriees: f.n } }));
  }
  for (const f of c.chiffres) {
    const mots = enMots(f.n, f.d);
    const d2 = (x) => (x >= 2 && x <= 10 ? x : f.d + 1);
    const choix = proposerFractions(f.n, f.d, [[f.d, f.n], [f.n, d2(f.d + 1)], [f.n + 1, f.d], [f.n, d2(f.d - 1)], [f.n, f.d + 2], [f.n - 1, f.d]]);
    out.push(choixItem(difficulteFraction(f.d, false), `Quelle fraction s’écrit « ${mots} » ?`, choix, Fp(f.n, f.d),
      `« ${mots} » : le nom dit qu’on a des ${NOM_FRACTION[f.d]}s, donc le dénominateur est ${f.d} ; le nombre dit combien on en a, donc le numérateur est ${f.n}. On écrit ${Fp(f.n, f.d)}.`, [mots]));
  }
  const regles = fm.rappel.droite().map(texteBrut);
  for (const a of c.affirmations) {
    const aide = () => {
      switch (a.modele) {
        case 'den': return `Le dénominateur est le nombre du bas : dans ${Fp(a.n, a.d)}, c’est ${a.d}. Le numérateur, celui du haut, est ${a.n}.`;
        case 'num': return `Le numérateur est le nombre du haut : dans ${Fp(a.n, a.d)}, c’est ${a.n}. Le dénominateur, celui du bas, est ${a.d}.`;
        case 'nom': return `${Fp(1, a.d)} se lit « un ${NOM_FRACTION[a.d]} » : il en faut ${a.d} pour faire 1.`;
        case 'ecrit': return `« ${enMots(a.n, a.d)} » s’écrit ${Fp(a.n, a.d)} : le nom donne le dénominateur et le nombre donne le numérateur.`;
        case 'fois': return `${Fp(a.n, a.d)}, c’est ${enLettres(a.n)} fois ${Fp(1, a.d)} : on a ${a.n} parts d’un ${NOM_FRACTION[a.d]}.`;
        default: return `Par exemple, dans ${Fp(3, 4)} : ${regles[1]} ${regles[2]}`;
      }
    };
    out.push(choixItem(DIFFICULTE_AFFIRMATION[a.modele], `Cette phrase est-elle vraie ? ${phraseAffirmation(a)}`, OUI_NON, ouiNon(a.vrai), aide(),
      a.n ? [a.n, a.d] : []));
  }
  return out;
}

/* Fractions : égales et comparer */
function itemsFractionsComparer(c, fm) {
  const out = [];
  const cartes = fm.rappel.cartes(Fp).map((x) => texteBrut(x.texte));
  for (const f of c.demi.slice(0, 8)) {
    const m = f.d / 2, moitie = String(m).replace('.', ',');
    out.push(choixItem(2, `${Fp(f.n, f.d)} est-elle égale à 1/2 ?`, OUI_NON, ouiNon(f.n * 2 === f.d),
      f.n * 2 === f.d ? `Dans ${Fp(f.n, f.d)}, la moitié de ${f.d} est ${m} et c’est bien le numérateur : ${Fp(f.n, f.d)} = 1/2. ${cartes[1]}`
        : `Dans ${Fp(f.n, f.d)}, la moitié de ${f.d} est ${moitie}, mais le numérateur est ${f.n} : ${Fp(f.n, f.d)} n’est pas égale à 1/2. ${cartes[1]}`, [f.n, f.d]));
  }
  for (const f of c.un.slice(0, 8)) {
    out.push(choixItem(1, `${Fp(f.n, f.d)} est-elle égale à 1 ?`, OUI_NON, ouiNon(f.n === f.d),
      f.n === f.d ? `Le numérateur ${f.n} est égal au dénominateur ${f.d} : ${Fp(f.n, f.d)} = 1. ${cartes[2]}`
        : `Le numérateur ${f.n} et le dénominateur ${f.d} ne sont pas égaux : ${Fp(f.n, f.d)} n’est pas égale à 1. ${cartes[2]}`, [f.n, f.d]));
  }
  for (const { d, a, b } of c.memeDen) {
    const s = symbole(a, b);
    out.push(choixItem(1 + (d >= 10 ? 1 : 0), `Compare : ${Fp(a, d)} … ${Fp(b, d)}`, ['<', '>'], s,
      `Je compare ${Fp(a, d)} et ${Fp(b, d)} : ${texteBrut(fm.corrige.memeDen(a, b, s))}.`, [a, b, d]));
  }
  for (const { n, a, b } of c.memeNum) {
    const s = symbole(b, a);   // n/a est plus petit quand a est plus grand
    out.push(choixItem(2 + (n >= 3 ? 1 : 0), `Compare : ${Fp(n, a)} … ${Fp(n, b)}`, ['<', '>'], s,
      `Je compare ${Fp(n, a)} et ${Fp(n, b)} : ${texteBrut(fm.corrige.memeNum(nomPluriel(n, a), nomPluriel(n, b), s))}.`, [n, a, b],
      { visuel: { type: 'figures', liste: [{ type: 'fraction', forme: 'bande', parts: a, coloriees: n }, { type: 'fraction', forme: 'bande', parts: b, coloriees: n }] } }));
  }
  c.ranger.forEach(({ d, valeurs }, i) => {
    const tri = [...valeurs].sort((x, y) => x - y);
    const petite = i % 2 === 0;
    const rep = petite ? tri[0] : tri[tri.length - 1];
    out.push(choixItem(3 + (d >= 10 ? 1 : 0), `Parmi ces fractions, laquelle est la plus ${petite ? 'petite' : 'grande'} ? ${valeurs.map((v) => Fp(v, d)).join(' ; ')}`,
      valeurs.map((v) => Fp(v, d)), Fp(rep, d),
      `${maj(texteBrut(fm.corrige.rang(tri)))}. La plus ${petite ? 'petite' : 'grande'} est ${Fp(rep, d)}.`, [...valeurs, d]));
  });
  return out;
}

/* Heures */
const MOINS_H = { 35: 25, 40: 20, 45: 'le quart', 50: 10, 55: 5 };
const RONDE_MOINS = [25, 20, 'le quart', 10, 5];
const lectureMoins = (h, m) => (m === 30 ? `${h} heures et demie` : `${h + 1} heures moins ${MOINS_H[m]}`);
const heure12 = (h) => ((h + 11) % 12) + 1;
const cle12 = (h, m) => (h % 12) * 60 + m;
function itemsHeures(c, fm) {
  const out = [];
  const horlogeDe = (h, m) => ({ type: 'horloge', heures: h, minutes: m, titre: 'Horloge à aiguilles' });
  const minutesAide = (m) => (m === 15 || m === 30 ? ` ${fm.rappel.minutes}` : '');
  for (const { h, m } of c.lire) {
    const juste = hm(h, m);
    const cand = [[m === 0 ? 12 : m / 5, (h % 12) * 5], [h % 12 + 1, m], [h, (60 - m) % 60], [heure12(h + 10), m], [h, (m + 5) % 60], [h, (m + 55) % 60]]
      .filter(([x, y]) => y % 5 === 0 && y >= 0 && y < 60 && x >= 1 && x <= 12).map(([x, y]) => hm(x, y));
    const choix = qcm(juste, cand).sort((x, y) => {
      const f = (t) => { const [a, b] = t.split(/\s*h\s*/).map(Number); return cle12(a, b); };
      return f(x) - f(y);
    });
    const d = m === 0 ? 1 : m % 15 === 0 ? 2 : 3 + (m > 30 ? 1 : 0);
    out.push(choixItem(d, 'Quelle heure indique l’horloge ?', choix, juste,
      `La petite aiguille indique les heures : elle est sur le ${h}. La grande aiguille indique les minutes : elle est sur le ${m === 0 ? 12 : m / 5}, soit ${m} minute${m > 1 ? 's' : ''}.${minutesAide(m)} Il est ${juste}.`, [],
      { visuelEnonce: horlogeDe(h, m) }));
  }
  for (const { h, m } of c.moins) {
    const juste = lectureMoins(h, m);
    let cand;
    if (m === 30) cand = [`${h + 1} heures et demie`, `${h} heures moins le quart`, `${h + 1} heures moins le quart`];
    else {
      const i = RONDE_MOINS.indexOf(MOINS_H[m]);
      cand = [`${h} heures moins ${MOINS_H[m]}`, `${h + 1} heures moins ${RONDE_MOINS[(i + 1) % 5]}`, `${h + 1} heures moins ${RONDE_MOINS[(i + 4) % 5]}`];
    }
    const choix = qcm(juste, cand).sort((x, y) => parseInt(x, 10) - parseInt(y, 10) || x.localeCompare(y, 'fr'));
    const d = m === 30 ? 2 : m === 45 ? 3 : 4;
    out.push(choixItem(d, 'Comment dit-on l’heure de cette horloge ?', choix, juste,
      `La grande aiguille est sur le ${m / 5} : il est ${hm(h, m)}${m === 30 ? '' : `, et il manque ${60 - m} minutes pour arriver à ${h + 1} heures`}. ${fm.corrige.moins(juste, hm(h, m))}`, [],
      { visuelEnonce: horlogeDe(h, m) }));
  }
  const PERIODE = { 'apres-midi': 'l’après-midi', soir: 'le soir' };
  for (const { h, m, periode } of c.vingtQuatre) {
    out.push(nombreItem(2, `Il est ${hm(h, m)} ${PERIODE[periode]}. Sur 24 heures, combien d’heures ?`, h + 12,
      `${fm.corrige.vingtQuatre(hm(h, m), PERIODE[periode], hm(h + 12, m))} J’ajoute 12 heures : ${h} + 12 = ${h + 12}.`, [],
      { visuelEnonce: horlogeDe(h, m) }));
  }
  return out;
}

/* Solides */
const SOLIDES_LECON = {
  cube: { faces: 6, sommets: 8, aretes: 12, nom: 'un cube', dessin: 'cube', variante: 0 },
  pave: { faces: 6, sommets: 8, aretes: 12, nom: 'un pavé droit', dessin: 'pave', variante: 0 },
  'pave-carre': { faces: 6, sommets: 8, aretes: 12, nom: 'un pavé droit à base carrée', dessin: 'pave', variante: 1 },
  pyramide: { faces: 5, sommets: 5, aretes: 8, nom: 'une pyramide à base carrée', dessin: 'pyramide', variante: 0 },
};
const MOTS_SOLIDE = { faces: ['Combien de faces', 'faces'], sommets: ['Combien de sommets', 'sommets'], aretes: ['Combien d’arêtes', 'arêtes'] };
const NOMS_DES_SOLIDES = { cube: 'cube', pave: 'pavé droit', pyramide: 'pyramide', boule: 'boule', cylindre: 'cylindre', cone: 'cône' };
const CONFUSIONS_SOLIDE = { cube: ['pave', 'pyramide', 'cylindre'], pave: ['cube', 'pyramide', 'cylindre'], pyramide: ['cone', 'cube', 'pave'],
  boule: ['cylindre', 'cone', 'cube'], cylindre: ['cone', 'boule', 'pave'], cone: ['pyramide', 'cylindre', 'boule'] };
const DIFFICULTE_SOLIDE = { cube: 1, boule: 1, pave: 2, pyramide: 2, cylindre: 2, cone: 3 };
function difficultePatron(numero) {
  if (numero < 6) return 3;          // 1-4-1
  if (numero < 11) return 4;         // les autres patrons
  return numero < 13 ? 2 : 4;        // une ligne de six, un rectangle 2 × 3 : évidents ; les autres assemblages
}
function itemsSolides(c, fm) {
  const out = [];
  const ordre = Object.keys(NOMS_DES_SOLIDES);
  for (const s of c.solides) {
    const choix = qcm(s.nom, CONFUSIONS_SOLIDE[s.nom]).sort((x, y) => ordre.indexOf(x) - ordre.indexOf(y)).map((k) => NOMS_DES_SOLIDES[k]);
    out.push(choixItem(DIFFICULTE_SOLIDE[s.nom], 'Quel est le nom de ce solide ?', choix, NOMS_DES_SOLIDES[s.nom],
      `C’est ${s.nom === 'pyramide' || s.nom === 'boule' ? 'une' : 'un'} ${NOMS_DES_SOLIDES[s.nom]}. ${fm.corrige.justification[s.nom]}`, [],
      { visuelEnonce: { type: 'solide', nom: s.nom, variante: s.variante, etiquette: 'Solide à nommer' } }));
  }
  const descriptions = fm.rappel.descriptions.map(texteBrut);
  const rang = { cube: 0, pave: 1, 'pave-carre': 2, pyramide: 3 };
  for (const id of c.tableau) {
    const l = SOLIDES_LECON[id];
    for (const prop of ['faces', 'sommets', 'aretes']) {
      const d = (prop === 'faces' ? 1 : prop === 'sommets' ? 2 : 3) + (id === 'pyramide' ? 1 : 0);
      out.push(nombreItem(d, `${MOTS_SOLIDE[prop][0]} a ${l.nom} ?`, l[prop],
        `${descriptions[rang[id]]} Donc ${l.nom} a ${l[prop]} ${MOTS_SOLIDE[prop][1]}.`, [],
        { visuelEnonce: { type: 'solide', nom: l.dessin, variante: l.variante, etiquette: 'Solide' } }));
    }
  }
  for (const p of c.patrons) {
    const { estPatron } = patronCube(p.numero, { quart: p.quart, miroir: p.miroir });
    out.push(choixItem(difficultePatron(p.numero), 'Ces six carrés se plient-ils pour faire un cube ?', OUI_NON, ouiNon(estPatron),
      estPatron ? `Oui : en pliant ces six carrés, on obtient un cube. C’est un des onze patrons du cube. ${texteBrut(fm.rappel.patrons)}`
        : `En pliant ces six carrés, deux carrés tombent au même endroit, ou il reste une face sans place : on n’obtient pas un cube. ${texteBrut(fm.rappel.patrons)}`, [],
      { visuelEnonce: { type: 'patron', numero: p.numero, quart: p.quart, miroir: p.miroir } }));
  }
  return out;
}

/* Polygones */
const COTES_POLYGONE = { triangle: 3, quadrilatere: 4, pentagone: 5, hexagone: 6 };
const NOM_POLYGONE = { triangle: 'triangle', quadrilatere: 'quadrilatère', pentagone: 'pentagone', hexagone: 'hexagone' };
const LECON_POLYGONE = {
  triangle: 'Un triangle est un polygone qui a trois côtés et trois sommets.',
  quadrilatere: 'Un quadrilatère est un polygone qui a quatre côtés et quatre sommets.',
  pentagone: 'Un pentagone a 5 côtés et 5 sommets.',
  hexagone: 'Un hexagone a 6 côtés et 6 sommets.',
};
const RAISON_NON_POLYGONE = {
  'ligne ouverte': 'Cette ligne n’est pas fermée : ce n’est pas un polygone.',
  cercle: 'Cette figure est ronde : on ne peut pas la tracer avec une règle, ce n’est pas un polygone.',
  ovale: 'Cette figure est ronde : on ne peut pas la tracer avec une règle, ce n’est pas un polygone.',
  'courbe fermée': 'Cette figure a un contour courbe : on ne peut pas la tracer avec une règle, ce n’est pas un polygone.',
  'demi-disque': 'Cette figure a un côté courbe : on ne peut pas la tracer entièrement avec une règle, ce n’est pas un polygone.',
};
const DIFFICULTE_FIGURE = { triangle: 1, quadrilatere: 1, pentagone: 2, hexagone: 2, 'ligne ouverte': 1, cercle: 1, ovale: 2, 'courbe fermée': 2, 'demi-disque': 3 };
function itemsPolygones(c, fm) {
  const out = [];
  const figure = (f, etiquette) => ({ type: 'figure', nom: f.nom, variante: f.variante, etiquette });
  for (const f of c.reconnaitre) {
    const poly = COTES_POLYGONE[f.nom] !== undefined;
    out.push(choixItem(DIFFICULTE_FIGURE[f.nom], 'Cette figure est-elle un polygone ?', OUI_NON, ouiNon(poly),
      poly ? `Un polygone est une figure fermée qu’on peut tracer avec une règle. Cette figure est un ${NOM_POLYGONE[f.nom]} : c’est un polygone.` : RAISON_NON_POLYGONE[f.nom], [],
      { visuelEnonce: figure(f, 'Figure à reconnaître') }));
  }
  const noms = Object.keys(NOM_POLYGONE);
  for (const f of c.nommer) {
    const n = COTES_POLYGONE[f.nom];
    out.push(choixItem(DIFFICULTE_FIGURE[f.nom], 'Quel est le nom de ce polygone ?', noms.map((k) => NOM_POLYGONE[k]), NOM_POLYGONE[f.nom],
      `Je compte les côtés : ${n}. ${LECON_POLYGONE[f.nom]}`, [], { visuelEnonce: figure(f, 'Polygone à nommer') }));
    out.push(nombreItem(DIFFICULTE_FIGURE[f.nom] + 1, 'Combien de côtés ce polygone a-t-il ?', n,
      `Je compte les côtés, un par un, sans en oublier : il y en a ${n}. ${LECON_POLYGONE[f.nom]}`, [], { visuelEnonce: figure(f, 'Polygone à nommer') }));
  }
  for (const k of c.cas) {
    const rayon = k.sens === 'rayon';
    out.push(nombreItem(rayon ? 2 : 3,
      rayon ? `Le rayon d’un cercle mesure ${k.rayon}${NBSP}cm. Quel est son diamètre, en cm ?` : `Le diamètre d’un cercle mesure ${k.diametre}${NBSP}cm. Quel est son rayon, en cm ?`,
      rayon ? k.diametre : k.rayon,
      rayon ? `Le diamètre est égal au double du rayon : ${k.rayon} × 2 = ${k.diametre}.` : `Le rayon est la moitié du diamètre : ${k.diametre} ÷ 2 = ${k.rayon}.`,
      [rayon ? k.rayon : k.diametre]));
  }
  return out;
}

/* Symétrie */
const DIFFICULTE_RECONNAITRE_SYM = (nom) => (nbAxesFigure(nom) > 0 ? 1 : nom === 'parallélogramme' ? 3 : 2);
function itemsSymetrie(c, fm) {
  const out = [];
  const axesTxt = (n) => `${n} axe${n > 1 ? 's' : ''} de symétrie`;
  for (const nom of c.reconnaitre) {
    const n = nbAxesFigure(nom);
    out.push(choixItem(DIFFICULTE_RECONNAITRE_SYM(nom), 'Cette figure a-t-elle un axe de symétrie ?', OUI_NON, ouiNon(n > 0),
      n > 0 ? `${fm.rappel.pliage} Ici, un pli convient : la figure a ${n === Infinity ? 'une infinité d’axes' : axesTxt(n)}.`
        : `${fm.rappel.pliage} Ici, aucun pli ne superpose exactement les deux parties : la figure n’a pas d’axe de symétrie.`, [],
      { visuelEnonce: { type: 'symetrie', nom } }));
  }
  for (const nom of c.compter) {
    const n = nbAxesFigure(nom);
    out.push(nombreItem(1 + Math.min(n, 4), 'Combien d’axes de symétrie cette figure a-t-elle ?', n,
      `${fm.rappel.pliage} On cherche tous les plis qui conviennent : cette figure a ${axesTxt(n)}.`, [],
      { visuelEnonce: { type: 'symetrie', nom } }));
  }
  return out;
}

/* Données : un tableau à double entrée et un diagramme en barres */
function itemsDonnees(c, fm) {
  const out = [];
  const T = c.tableau, D = c.diagramme;
  const g = c.grands ? 1 : 0;
  const lire = texteBrut(fm.rappel.lire);
  const tab = { type: 'tableau', coin: T.coin, colonnes: T.colonnes, lignes: T.lignes.map((l, r) => ({ cap: l.cap, valeurs: T.valeurs[r] })) };
  const dia = { type: 'diagramme', categories: D.categories, valeurs: D.valeurs, pas: D.pas, titreY: D.titreY, hauteur: 146 };
  const colonne = (j) => T.valeurs.map((r) => r[j]);
  const caps = T.lignes.map((l) => l.cap);
  for (const q of c.questionsTableau) {
    if (q.type === 'case') {
      out.push(nombreItem(1, q.texte, q.reponse, `${lire} Ligne « ${caps[q.ligne]} », colonne ${T.colonnes[q.col]} : ${q.reponse}.`, [], { visuelEnonce: tab }));
    } else if (q.type === 'totalLigne') {
      out.push(nombreItem(2 + g, q.texte, q.reponse, `Je lis toute la ligne « ${caps[q.ligne]} » et j’additionne : ${q.calcul} = ${q.reponse}.`, [], { visuelEnonce: tab }));
    } else if (q.type === 'maxCol' || q.type === 'minCol') {
      const plus = q.type === 'maxCol';
      out.push(choixItem(2, q.texte, caps, q.reponse,
        `En ${T.colonnes[q.col]}, je lis la colonne : ${caps.map((cap, r) => `${cap} ${colonne(q.col)[r]}`).join(', ')}. Le ${plus ? 'plus grand' : 'plus petit'} nombre est ${colonne(q.col)[caps.indexOf(q.reponse)]} : ${q.reponse}.`, [], { visuelEnonce: tab }));
    } else {
      out.push(choixItem(2, q.texte, T.colonnes, q.reponse,
        `Je lis la ligne « ${caps[q.ligne]} » : ${T.colonnes.map((col, j) => `${col} ${T.valeurs[q.ligne][j]}`).join(', ')}. Le plus grand nombre est ${Math.max(...T.valeurs[q.ligne])} : ${q.reponse}.`, [], { visuelEnonce: tab }));
    }
  }
  for (const q of c.questionsDiagramme) {
    if (q.type === 'valeur') {
      out.push(nombreItem(1, q.texte, q.reponse, `${lire} La barre de ${D.categories[q.i]} monte jusqu’à ${fmt(q.reponse)}.`, [], { visuelEnonce: dia }));
    } else if (q.type === 'ecart') {
      out.push(nombreItem(3, q.texte, q.reponse, `Je lis les deux barres : ${D.categories[q.a]} ${fmt(D.valeurs[q.a])} et ${D.categories[q.b]} ${fmt(D.valeurs[q.b])}. Calcul : ${q.calcul} = ${fmt(q.reponse)}.`, [], { visuelEnonce: dia }));
    } else {
      const plus = q.type === 'max';
      const idx = D.categories.map((_, i) => i).sort((x, y) => (plus ? D.valeurs[y] - D.valeurs[x] : D.valeurs[x] - D.valeurs[y]));
      const gardes = new Set(idx.slice(0, 4));
      const choix = D.categories.filter((_, i) => gardes.has(i));
      out.push(choixItem(2, q.texte, choix, q.reponse, `La barre la plus ${plus ? 'haute' : 'basse'} est celle de ${q.reponse} : ${fmt(D.valeurs[D.categories.indexOf(q.reponse)])}.`, [], { visuelEnonce: dia }));
    }
  }
  for (const q of c.calculs) {
    const d = (q.type === 'ecartCases' ? 3 : 2) + g;
    out.push(nombreItem(d, q.texte, q.reponse, `Je lis le tableau, puis je calcule : ${q.calcul} = ${q.reponse}.`, [], { visuelEnonce: tab }));
  }
  return out;
}

/* Les restes du lot 1 : ranger, intercaler (nombres), composer une somme (monnaie), bandes (fractions) */
function itemsRanger(c) {
  const out = [];
  const q = c.quatre ? 1 : 0;
  const unSeul = (liste, plusPetit) => {
    const rep = plusPetit ? Math.min(...liste) : Math.max(...liste);
    const autres = liste.filter((x) => x !== rep).slice(0, 3);
    const gardes = new Set([rep, ...autres]);
    const choix = liste.filter((x) => gardes.has(x)).map(nb);
    const tri = [...liste].sort((x, y) => (plusPetit ? x - y : y - x));
    out.push(choixItem(2 + q, `Quel est le plus ${plusPetit ? 'petit' : 'grand'} de ces nombres ? ${liste.map(nb).join(' ; ')}`, choix, nb(rep),
      `Je compare les nombres, chiffre par chiffre en commençant par la gauche. Rangés du plus ${plusPetit ? 'petit au plus grand' : 'grand au plus petit'} : ${tri.map(nb).join(plusPetit ? ' < ' : ' > ')}. Le plus ${plusPetit ? 'petit' : 'grand'} est ${nb(rep)}.`, liste.map(nb)));
  };
  unSeul(c.croissant, true);
  unSeul(c.decroissant, false);
  return out;
}
function itemsIntercaler(c) {
  return c.intercaler.map(({ a, b }) => nombreItem(1 + (a % 10 === 0 ? 0 : 1) + (a % 10 === 9 ? 1 : 0),
    `${nb(a)} < … < ${nb(b)}. Quel est le plus petit nombre entier qui convient ?`, a + 1,
    `Un nombre entier qui convient est plus grand que ${nb(a)} et plus petit que ${nb(b)}. Le plus petit est le nombre qui vient juste après ${nb(a)} : ${nb(a)} + 1 = ${nb(a + 1)}.`, [nb(a), nb(b)]));
}

function itemsSommes(c) {
  const valeurs = [...BILLETS_EURO, ...PIECES_EURO.filter((v) => c.centimes || v >= 100)].sort((x, y) => y - x);
  const nomVal = (v) => (v >= 100 ? eur(v) : `${v}${NBSP}c`);
  return c.sommes.map((s) => {
    const compo = [];
    let reste = s;
    for (const v of valeurs) { const n = Math.floor(reste / v); if (n) { compo.push({ v, n }); reste -= n * v; } }
    const total = compo.reduce((t, x) => t + x.n, 0);
    return nombreItem(2 + (total >= 5 ? 1 : 0) + (c.centimes ? 1 : 0), `Quel est le plus petit nombre de pièces et de billets pour faire ${eur(s)} ?`, total,
      `Je prends toujours la plus grande valeur possible : ${compo.map(({ v, n }) => `${n} × ${nomVal(v)}`).join(' + ')}. Cela fait ${total} pièces ou billets.`, [eurNu(s)],
      { visuel: { type: 'monnaie', valeurs: compo.flatMap(({ v, n }) => Array(n).fill(v)) } });
  });
}

function itemsBandes(c, fm) {
  return c.mesures.map(({ n, d }) => nombreItem(MESURE_DIFFICILE(d), `Quelle est la longueur de la bande, en fraction d’unité ? Écris le numérateur : le dénominateur est ${d}.`, n,
    `Chaque unité de la règle est partagée en ${d} parts égales : le dénominateur est ${d}. La bande couvre ${n} de ces parts : le numérateur est ${n}, et la bande mesure ${Fp(n, d)} d’unité. Comme dans l’exemple : ${texteBrut(fm.rappel.cartes(Fp)[0])}`, [n, d],
    { visuelEnonce: { type: 'regle', unite: 1, parts: d, longueur: n } }));
}

const GENERATEURS = {
  'ce2-addition-posee': itemsAddition,
  'ce2-soustraction-posee': itemsSoustraction,
  'ce2-multiplication': itemsMultiplication,
  'ce2-nombres-lire-ecrire': itemsNombres,
  'ce2-nombres-comparer': itemsComparer,
  'ce2-fractions-lire': itemsFractionsLire,
  'ce2-fractions-comparer': itemsFractionsComparer,
  'ce2-fractions-calculer': itemsFractions,
  'ce2-monnaie': itemsMonnaie,
  'ce2-longueurs': itemsLongueurs,
  'ce2-heures': itemsHeures,
  'ce2-masses-contenances': itemsMasses,
  'ce2-durees': itemsDurees,
  'ce2-solides': itemsSolides,
  'ce2-polygones': itemsPolygones,
  'ce2-symetrie': itemsSymetrie,
  'ce2-donnees': itemsDonnees,
};

// Combien d'items (les premiers de la liste) reprennent l'exercice 1 de la fiche imprimée.
const PREMIER_EXERCICE = {
  'ce2-addition-posee': (c) => c.posees.length,
  'ce2-soustraction-posee': (c) => c.posees.length,
  'ce2-multiplication': (c) => c.enligne.length,
  'ce2-nombres-lire-ecrire': (c) => c.lire.length,
  'ce2-nombres-comparer': (c) => c.paires.length,
  'ce2-fractions-lire': (c) => c.lire.length,
  'ce2-fractions-comparer': (c) => c.demi.slice(0, 8).length + c.un.slice(0, 8).length,
  'ce2-fractions-calculer': (c) => c.mesures.length,
  'ce2-monnaie': (c) => c.sommes.length,
  'ce2-longueurs': (c) => c.conversions.length,
  'ce2-heures': (c) => c.lire.length,
  'ce2-solides': (c) => c.solides.length,
  'ce2-polygones': (c) => c.reconnaitre.length,
  'ce2-symetrie': (c) => c.reconnaitre.length,
  'ce2-donnees': (c) => c.questionsTableau.length,
  'ce2-masses-contenances': (c) => c.objets.length,
  'ce2-durees': (c) => c.egalites.reduce((s, e) => s + (e.reponses.length === 1 ? 1 : e.reponses.length), 0),
};

// Les notions qui ont des items, dans l'ordre des fiches.
export const notionsAvecItems = () => Object.keys(GENERATEURS);

// `difficulte` : un nombre (cette difficulté) ou { min, max } ; sans lui, tous les items de la fiche.
export function items(ficheId, { options = {}, graine, difficulte, formulation: nom = FORMULATION_DEFAUT } = {}) {
  const generateur = GENERATEURS[ficheId];
  const fiche = ficheParId(ficheId);
  if (!generateur || !fiche) return [];
  const opts = { ...optionsParDefaut(fiche), ...options };
  // Les exercices imprimés sur la page sans le rappel de méthode : la fiche entière, rien de plus.
  const tire = tirer(fiche, opts, graine);
  const contenu = fiche.mise.combien ? { ...tire, ...fiche.mise.combien(tire, false) } : tire;
  const fm = formulation(fiche, nom);
  const n1 = PREMIER_EXERCICE[ficheId] ? PREMIER_EXERCICE[ficheId](contenu) : 0;
  const liste = generateur(contenu, fm, opts).map((it, i) => ({
    id: `${contenu.code}#${i}`,
    notion: ficheId,
    ...it,
    exercice1: i < n1,
    formulation: fm.nom,
  }));
  if (difficulte === undefined || difficulte === null) return liste;
  const { min, max } = typeof difficulte === 'object' ? difficulte : { min: difficulte, max: difficulte };
  return liste.filter((it) => it.difficulte >= min && it.difficulte <= max);
}
