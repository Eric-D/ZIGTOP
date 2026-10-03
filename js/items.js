// Banque d'items par notion : des exercices structurés, tirés du MÊME contenu que la fiche.
//
// `items(ficheId, { options, graine, difficulte, formulation })` appelle `tirer(fiche, options, graine)`
// (le tirage de la fiche imprimée) et en fait une liste d'items :
//   { id, notion, difficulte (1–5), type: 'nombre' | 'choix', enonce, reponse, aide,
//     choix? (type 'choix'), visuel? (spec de `visuel()` de visuels.js), formulation, operandes }
// - `reponse` est toujours un entier (type 'nombre') ou une chaîne courte (type 'choix'), comparable avec
//   `normalise()` de l'application ; un décimal n'est jamais demandé : on demande des centimes, ou on
//   sépare les euros et les centimes (ou les heures et les minutes) en deux items ;
// - `operandes` : les nombres de l'item tels qu'ils sont imprimés sur la fiche de même code (chaînes), pour
//   vérifier que la feuille et l'application portent les mêmes nombres ;
// - `aide` reprend la formulation (`commune` par défaut, ou `livret`), comme le rappel de la fiche ;
// - `id` : « code de fiche # rang » (stable pour une fiche donnée, quelle que soit la formulation) ;
// - `exercice1` : vrai pour les items qui reprennent l'exercice 1 de la page élève (celui qu'une feuille
//   panachée garde, voir js/panache.js). Faux pour tous les items de la fiche monnaie et de la fiche des
//   fractions : leur exercice 1 (composer une somme en pièces, mesurer une bande) reste sur papier.
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
// Hors de ce lot (restent sur papier, ou viendront ensuite) : composer une somme en pièces, ranger une liste,
// intercaler, la droite graduée, les tableaux de numération, lire un nombre en lettres à écrire, les bandes
// de fractions à mesurer.

import { ficheParId, tirer, formulation, optionsParDefaut, FORMULATION_DEFAUT } from './fiches.js';
import { fmt, enLettres } from './utils.js';

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
  const out = [];
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
  const out = [];
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

const GENERATEURS = {
  'ce2-addition-posee': itemsAddition,
  'ce2-soustraction-posee': itemsSoustraction,
  'ce2-multiplication': itemsMultiplication,
  'ce2-nombres-lire-ecrire': itemsNombres,
  'ce2-nombres-comparer': itemsComparer,
  'ce2-longueurs': itemsLongueurs,
  'ce2-masses-contenances': itemsMasses,
  'ce2-monnaie': itemsMonnaie,
  'ce2-durees': itemsDurees,
  'ce2-fractions-calculer': itemsFractions,
};

// Combien d'items (les premiers de la liste) reprennent l'exercice 1 de la fiche imprimée.
const PREMIER_EXERCICE = {
  'ce2-addition-posee': (c) => c.posees.length,
  'ce2-soustraction-posee': (c) => c.posees.length,
  'ce2-multiplication': (c) => c.enligne.length,
  'ce2-nombres-lire-ecrire': (c) => c.lire.length,
  'ce2-nombres-comparer': (c) => c.paires.length,
  'ce2-longueurs': (c) => c.conversions.length,
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
