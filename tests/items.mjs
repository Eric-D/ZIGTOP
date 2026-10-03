// Banque d'items (js/items.js) : des exercices structurés tirés du même contenu que les fiches.
// Node pur, sans jsdom : on recalcule les réponses ici, à partir de l'énoncé seul.
import { FICHES, tirer, rendre, optionsParDefaut } from '../js/fiches.js';
import { items, notionsAvecItems } from '../js/items.js';
import { enLettres, fmt } from '../js/utils.js';
import { visuel, horloge, figurePlane, figureSymetrie, regleFractions, FIGURES_POLYGONES, NB_PATRONS } from '../js/visuels.js';

let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

const GRAINES = Array.from({ length: 20 }, (_, i) => 1000 + 7919 * i);
const NEGATIFS = /\b(faux|fausse|erreur|impossible|interdit|raté|ratée|mauvais|mauvaise|incorrect|dommage|nul|nulle|perdu)\b/i;
// La même normalisation que `normalise()` de js/app.js (non importable sans DOM).
const normalise = (v) => String(v).toLowerCase().trim().replace(/’/g, "'").replace(/\s| | /g, '').replace(/€|cm|min|^l'|^le|^la|^d'/g, '');

// Toutes les combinaisons d'options d'une fiche.
const combinaisons = (fiche) => (fiche.options || []).reduce(
  (acc, o) => acc.flatMap((a) => o.valeurs.map((v) => ({ ...a, [o.id]: v.v }))), [{}]);
const nom = (o) => Object.values(o).join('/') || 'sans option';

const nums = (t) => [...String(t).matchAll(/\d+(?:[\s ]\d{3})*/g)].map((m) => parseInt(m[0].replace(/\s/g, ''), 10));
const N = '(\\d[\\d\\s\\u202f]*)';
const entier = (t) => parseInt(String(t).replace(/\s/g, ''), 10);
const cents = (t) => Math.round(parseFloat(String(t).replace(',', '.')) * 100);
const signe = (a, b) => (a < b ? '<' : a > b ? '>' : '=');

const VAL = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1e6, g: 1, kg: 1000, t: 1e6, cL: 1, dL: 10, L: 100 };

// La réponse recalculée depuis l'énoncé seul ; `undefined` : non recalculée ici.
function attendu(notion, it, ctx = {}) {
  const e = it.enonce.replace(/\u00a0/g, ' ');
  let m;
  switch (notion) {
    case 'ce2-addition-posee': { const [a, b] = nums(e); return a + b; }
    case 'ce2-soustraction-posee': { const [a, b] = nums(e); return Math.max(a, b) - Math.min(a, b); }
    case 'ce2-multiplication': { const [a, b] = nums(e); return a * b; }
    case 'ce2-nombres-lire-ecrire': {
      if ((m = /^Écris en chiffres : « (.+) »$/.exec(e))) return it.reponse; // vérifié ci-dessous par enLettres
      if ((m = new RegExp(`^${N} = (.*)\\. Quel nombre remplace le (premier|second) « … » \\?$`).exec(e))) {
        const n = entier(m[1]), s = String(n);
        const termes = s.split('').map((c, i) => Number(c) * 10 ** (s.length - 1 - i));
        const trous = m[2].split(' + ').map((x, i) => (x === '…' ? i : -1)).filter((i) => i >= 0);
        return termes[trous[m[3] === 'premier' ? 0 : 1]];
      }
      if ((m = /^(.*) = \?$/.exec(e))) return nums(m[1]).reduce((s, x) => s + x, 0);
      if ((m = new RegExp(`^Combien de (dizaines|centaines) y a-t-il en tout dans ${N} \\?$`).exec(e))) return Math.floor(entier(m[2]) / (m[1] === 'dizaines' ? 10 : 100));
      return undefined;
    }
    case 'ce2-nombres-comparer': {
      if ((m = /^Quel est le plus (petit|grand) de ces nombres \? (.*)$/.exec(e))) {
        const l = m[2].split(' ; ').map(entier);
        return fmt(m[1] === 'petit' ? Math.min(...l) : Math.max(...l));
      }
      if ((m = new RegExp(`^${N} < … < ${N}\\. Quel est le plus petit nombre entier qui convient \\?$`).exec(e))) return entier(m[1]) + 1;
      if ((m = new RegExp(`^Compare : ${N} … ${N}$`).exec(e))) return signe(entier(m[1]), entier(m[2]));
      if ((m = new RegExp(`^Encadre ${N} à la (dizaine|centaine|millier) : .* Quelle est la borne de (gauche|droite) \\?$`).exec(e))) {
        const n = entier(m[1]), u = { dizaine: 10, centaine: 100, millier: 1000 }[m[2]];
        return Math.floor(n / u) * u + (m[3] === 'droite' ? u : 0);
      }
      return undefined;
    }
    case 'ce2-longueurs': case 'ce2-masses-contenances': {
      if ((m = new RegExp(`^${N}\\s(\\p{L}+) = … (\\p{L}+)$`, 'u').exec(e))) return entier(m[1]) * VAL[m[2]] / VAL[m[3]];
      if ((m = new RegExp(`^${N}\\s(\\p{L}+) = … (\\p{L}+) … (\\p{L}+)\\. Combien de (\\p{L}+) (entiers|en plus) \\?$`, 'u').exec(e))) {
        const total = entier(m[1]) * VAL[m[2]], r = VAL[m[3]] / VAL[m[4]];
        return m[6] === 'entiers' ? Math.floor(total / VAL[m[3]]) : (total / VAL[m[4]]) % r;
      }
      if ((m = new RegExp(`^${N}\\s(\\p{L}+) ${N}\\s(\\p{L}+) = … (\\p{L}+)$`, 'u').exec(e))) return entier(m[1]) * VAL[m[2]] / VAL[m[5]] + entier(m[3]) * VAL[m[4]] / VAL[m[5]];
      if ((m = new RegExp(`^Compare : ${N}\\s(\\p{L}+) … ${N}\\s(\\p{L}+)$`, 'u').exec(e))) return signe(entier(m[1]) * VAL[m[2]], entier(m[3]) * VAL[m[4]]);
      if (it.visuel && it.visuel.type === 'polygone') {
        const { forme, cotes } = it.visuel;
        return forme === 'carre' ? 4 * cotes[0] : forme === 'rectangle' ? 2 * (cotes[0] + cotes[1]) : cotes.reduce((s, x) => s + x, 0);
      }
      return undefined;
    }
    case 'ce2-monnaie': {
      if ((m = /^Quel est le plus petit nombre de pièces et de billets pour faire ([\d,]+) € \?$/.exec(e))) return nbPieces(cents(m[1]), ctx.opts.centimes !== 'non');
      if ((m = /^(\d+) € (\d+) c = … c$/.exec(e))) return 100 * +m[1] + +m[2];
      if ((m = /^(\d+) c = … € … c\. Combien d’euros entiers \?$/.exec(e))) return Math.floor(+m[1] / 100);
      if ((m = /^(\d+) c = … € … c\. Combien de centimes en plus \?$/.exec(e))) return +m[1] % 100;
      if (/ = … €$/.test(e)) return nums(e.split('=')[0]).reduce((s, x) => s + x, 0);
      if ((m = /^Rends la monnaie sur (\d+) € pour ([\d,]+) € : combien d(e centimes|’euros) \?$/.exec(e))) {
        const rendu = 100 * +m[1] - cents(m[2]);
        return m[3] === 'e centimes' ? rendu : rendu / 100;
      }
      if ((m = /billet de (\d+) €\. .*en (centimes|euros) \?$/.exec(e))) {
        const prix = [...e.matchAll(/à ([\d,]+) €/g)].reduce((s, x) => s + cents(x[1]), 0);
        const valeur = /Quel est le prix total/.test(e) ? prix : 100 * +m[1] - prix;
        return m[2] === 'centimes' ? valeur : valeur / 100;
      }
      return undefined;
    }
    case 'ce2-durees': {
      const H = '(\\d+) h(?: (\\d\\d))?';
      const tm = (h, mi) => 60 * +h + (mi ? +mi : 0);
      if ((m = new RegExp(`^Départ : ${H} ; arrivée : ${H}\\. Durée : … h … min\\. Combien d(’heures|e minutes en plus) \\?$`).exec(e))) {
        const d = tm(m[3], m[4]) - tm(m[1], m[2]);
        return m[5] === '’heures' ? Math.floor(d / 60) : d % 60;
      }
      if ((m = new RegExp(`^Départ : ${H} ; durée : (?:(\\d+) h)?(?: (\\d+) min)?\\. Arrivée : … h … Combien d(’heures|e minutes) \\?$`).exec(e))) {
        const t = tm(m[1], m[2]) + 60 * (+m[3] || 0) + (+m[4] || 0);
        return m[5] === '’heures' ? Math.floor(t / 60) : t % 60;
      }
      if ((m = new RegExp(`^(.*) commence à ${H} et finit à ${H}\\. Combien de minutes dure-t-elle \\?$`).exec(e))) return tm(m[4], m[5]) - tm(m[2], m[3]);
      if ((m = new RegExp(`part en \\p{L}+ à ${H} et arrive à ${H}\\. Quelle est la durée du trajet, en minutes \\?$`, 'u').exec(e))) return tm(m[3], m[4]) - tm(m[1], m[2]);
      if ((m = new RegExp(`commence à ${H}\\. Il dure (?:(\\d+) h)?(?: (\\d+) min)?\\. Donne (d’abord les heures|maintenant les minutes)\\.$`).exec(e))) {
        const t = tm(m[1], m[2]) + 60 * (+m[3] || 0) + (+m[4] || 0);
        return m[5] === 'd’abord les heures' ? Math.floor(t / 60) : t % 60;
      }
      // égalités et conversions
      if ((m = /^(\d+) h = … min$/.exec(e))) return 60 * +m[1];
      if ((m = /^(\d+) h (\d+) = … min$/.exec(e))) return 60 * +m[1] + +m[2];
      if ((m = /^(\d+) min = … h$/.exec(e))) return +m[1] / 60;
      if ((m = /^(\d+) min = … h … min\. Combien de (h|min) \?$/.exec(e))) return m[2] === 'h' ? Math.floor(+m[1] / 60) : +m[1] % 60;
      if ((m = /^(\d+) min = … s$/.exec(e))) return 60 * +m[1];
      if ((m = /^(\d+) s = … min … s\. Combien de (min|s) \?$/.exec(e))) return m[2] === 'min' ? Math.floor(+m[1] / 60) : +m[1] % 60;
      if ((m = /^1 quart d’heure = … min$/.exec(e))) return 15;
      if ((m = /^1 demi-heure = … min$/.exec(e))) return 30;
      if ((m = /^(\d+) siècles? = … ans$/.exec(e))) return 100 * +m[1];
      if ((m = /^1 millénaire = … ans$/.exec(e))) return 1000;
      if ((m = /^1 millénaire = … siècles$/.exec(e))) return 10;
      if ((m = /^(\d+) millénaires = … siècles$/.exec(e))) return 10 * +m[1];
      if ((m = /^(\d+) ans = … siècles$/.exec(e))) return +m[1] / 100;
      return undefined;
    }
    case 'ce2-fractions-lire': return fractionsLire(e, it);
    case 'ce2-fractions-comparer': return fractionsComparer(e);
    case 'ce2-heures': return heures(e, it);
    case 'ce2-solides': return solides(e, it);
    case 'ce2-polygones': return polygones(e, it);
    case 'ce2-symetrie': return symetrie(e, it);
    case 'ce2-donnees': return donnees(it, ctx);
    case 'ce2-fractions-calculer': {
      if (it.visuelEnonce && it.visuelEnonce.type === 'regle') return bande(e, it);
      const f = [...e.matchAll(/(\d+)\/(\d+)/g)].map((x) => [+x[1], +x[2]]);
      const moins = /−/.test(e.split('Quel est')[0]) && /^\d+\/\d+ − /.test(e) || /Il reste|On en coupe/.test(e);
      return moins ? f[0][0] - f[1][0] : f[0][0] + f[1][0];
    }
    default: return undefined;
  }
}


/* ---- Le lot 2 : des réponses recalculées sans passer par items.js ---- */
const nbPieces = (centimes, avecCentimes) => {   // le moins de pièces et de billets : on prend toujours le plus grand
  const valeurs = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, ...(avecCentimes ? [50, 20, 10, 5, 2, 1] : [])];
  let reste = centimes, n = 0;
  for (const v of valeurs) { n += Math.floor(reste / v); reste %= v; }
  return n;
};
const NOMS_FR = { demi: 2, demis: 2, tiers: 3, quart: 4, quarts: 4, cinquième: 5, cinquièmes: 5, sixième: 6, sixièmes: 6, septième: 7, septièmes: 7,
  huitième: 8, huitièmes: 8, neuvième: 9, neuvièmes: 9, dixième: 10, dixièmes: 10 };
const NOMBRE_EN_LETTRES = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [enLettres(i + 1), i + 1]));
// « trois quarts » → [3, 4]
const motsEnFraction = (s) => { const [n, ...nom] = s.split(' '); return [NOMBRE_EN_LETTRES[n], NOMS_FR[nom.join(' ')]]; };
const svgDe = (spec) => visuel(spec);
const attr = (svg, nom) => new RegExp(`${nom}="([^"]*)"`).exec(svg)[1];

function fractionsLire(e, it) {
  let m;
  if (e === 'Quelle fraction est coloriée ?') {
    const svg = svgDe(it.visuelEnonce);
    return `${(svg.match(/part--coloriee/g) || []).length}/${attr(svg, 'data-parts')}`;
  }
  if ((m = /^Quelle fraction s’écrit « (.+) » \?$/.exec(e))) return motsEnFraction(m[1]).join('/');
  if (!(m = /^Cette phrase est-elle vraie \? (.*)$/.exec(e))) return undefined;
  const p = m[1];
  const oui = (b) => (b ? 'oui' : 'non');
  if ((m = /^Dans (\d+)\/(\d+), le dénominateur est (\d+)\.$/.exec(p))) return oui(+m[2] === +m[3]);
  if ((m = /^Dans (\d+)\/(\d+), le numérateur est (\d+)\.$/.exec(p))) return oui(+m[1] === +m[3]);
  if ((m = /^1\/(\d+), c’est un (.+)\.$/.exec(p))) return oui(NOMS_FR[m[2]] === +m[1]);
  if ((m = /^(.+) s’écrit (\d+)\/(\d+)\.$/.exec(p))) { const [n, d] = motsEnFraction(m[1]); return oui(n === +m[2] && d === +m[3]); }
  if ((m = /^(\d+)\/(\d+), c’est (.+) fois 1\/(\d+)\.$/.exec(p))) return oui(NOMBRE_EN_LETTRES[m[3]] === +m[1] && +m[2] === +m[4]);
  if (p === 'Le dénominateur indique en combien de parts égales on partage l’unité.') return 'oui';
  if (p === 'Le numérateur indique combien de parts on a coloriées.') return 'oui';
  if (p === 'Le dénominateur indique combien de parts on a coloriées.') return 'non';
  if (p === 'Le numérateur indique en combien de parts égales on partage l’unité.') return 'non';
  return undefined;
}

function fractionsComparer(e) {
  let m;
  if ((m = /^(\d+)\/(\d+) est-elle égale à 1\/2 \?$/.exec(e))) return +m[1] * 2 === +m[2] ? 'oui' : 'non';
  if ((m = /^(\d+)\/(\d+) est-elle égale à 1 \?$/.exec(e))) return +m[1] === +m[2] ? 'oui' : 'non';
  if ((m = /^Compare : (\d+)\/(\d+) … (\d+)\/(\d+)$/.exec(e))) return signe(+m[1] * +m[4], +m[3] * +m[2]);
  if ((m = /^Parmi ces fractions, laquelle est la plus (petite|grande) \? (.*)$/.exec(e))) {
    const l = m[2].split(' ; ').map((x) => x.split('/').map(Number));
    const val = (f) => f[0] / f[1];
    const rep = l.reduce((a, b) => ((m[1] === 'petite' ? val(b) < val(a) : val(b) > val(a)) ? b : a));
    return rep.join('/');
  }
  return undefined;
}

const MOINS = (m) => (m === 45 ? 'le quart' : 60 - m);
function heures(e, it) {
  const spec = it.visuelEnonce;
  const { heures: h, minutes: mi } = spec;
  if (e === 'Quelle heure indique l’horloge ?') return `${h}\u00a0h\u00a0${String(mi).padStart(2, '0')}`;
  if (e === 'Comment dit-on l’heure de cette horloge ?') return mi === 30 ? `${h} heures et demie` : `${h + 1} heures moins ${MOINS(mi)}`;
  if (/^Il est .* Sur 24 heures, combien d’heures \?$/.test(e)) return h + 12;
  return undefined;
}

// Nombre de faces, de sommets et d'arêtes, d'après le nom du solide dessiné (la relation d'Euler les relie).
const COMPTES = { cube: [6, 8, 12], pave: [6, 8, 12], pyramide: [5, 5, 8] };
const NOMS_SOLIDE = { cube: 'cube', pave: 'pavé droit', pyramide: 'pyramide', boule: 'boule', cylindre: 'cylindre', cone: 'cône' };
function solides(e, it) {
  let m;
  const spec = it.visuelEnonce;
  if (e === 'Quel est le nom de ce solide ?') return NOMS_SOLIDE[spec.nom];
  if ((m = /^Combien (de faces|de sommets|d’arêtes) a /.exec(e))) {
    const [F, S, A] = COMPTES[spec.nom];
    if (F - A + S !== 2) return NaN;
    return { 'de faces': F, 'de sommets': S, 'd’arêtes': A }[m[1]];
  }
  if (e === 'Ces six carrés se plient-ils pour faire un cube ?') return spec.numero < NB_PATRONS ? 'oui' : 'non';
  return undefined;
}

const NOMS_POLYGONE = { 3: 'triangle', 4: 'quadrilatère', 5: 'pentagone', 6: 'hexagone' };
function polygones(e, it) {
  let m;
  const spec = it.visuelEnonce;
  if (spec) {
    const fig = figurePlane(spec.nom, { variante: spec.variante });
    if (e === 'Cette figure est-elle un polygone ?') return fig.svg.includes('data-polygone="oui"') ? 'oui' : 'non';
    if (e === 'Quel est le nom de ce polygone ?') return NOMS_POLYGONE[attr(fig.svg, 'data-cotes')];
    if (e === 'Combien de côtés ce polygone a-t-il ?') return +attr(fig.svg, 'data-cotes');
  }
  if ((m = /^Le rayon d’un cercle mesure (\d+) cm\. Quel est son diamètre, en cm \?$/.exec(e.replace(/\u00a0/g, ' ')))) return 2 * +m[1];
  if ((m = /^Le diamètre d’un cercle mesure (\d+) cm\. Quel est son rayon, en cm \?$/.exec(e.replace(/\u00a0/g, ' ')))) return +m[1] / 2;
  return undefined;
}

const AXES_CONNUS = { 'carré': 4, rectangle: 2, 'triangle isocèle': 1, losange: 2, étoile: 5, croix: 4, 'lettre H': 2, cœur: 1, sablier: 2 };
function symetrie(e, it) {
  const spec = it.visuelEnonce;
  const fig = figureSymetrie(spec.nom);
  const axes = attr(fig.svg, 'data-axes');
  if (spec.nom in AXES_CONNUS && +axes !== AXES_CONNUS[spec.nom]) return NaN;   // la figure dessinée a bien le nombre d'axes de la leçon
  if (e === 'Cette figure a-t-elle un axe de symétrie ?') return axes === '0' ? 'non' : 'oui';
  if (e === 'Combien d’axes de symétrie cette figure a-t-elle ?') return +axes;
  return undefined;
}

// Le tableau et le diagramme : les réponses sont relues dans les données brutes du tirage, par l'indice de la question.
function donnees(it, { contenu, i }) {
  const T = contenu.tableau, D = contenu.diagramme;
  const nT = contenu.questionsTableau.length, nD = contenu.questionsDiagramme.length;
  const v = T.valeurs, col = (j) => v.map((r) => r[j]);
  const argmax = (t) => t.indexOf(Math.max(...t)), argmin = (t) => t.indexOf(Math.min(...t));
  const somme = (t) => t.reduce((a, b) => a + b, 0);
  if (i < nT) {
    const q = contenu.questionsTableau[i];
    if (it.enonce !== q.texte) return NaN;
    if (q.type === 'case') return v[q.ligne][q.col];
    if (q.type === 'totalLigne') return somme(v[q.ligne]);
    if (q.type === 'maxCol') return T.lignes[argmax(col(q.col))].cap;
    if (q.type === 'minCol') return T.lignes[argmin(col(q.col))].cap;
    if (q.type === 'maxLigne') return T.colonnes[argmax(v[q.ligne])];
    return undefined;
  }
  if (i < nT + nD) {
    const q = contenu.questionsDiagramme[i - nT];
    if (it.enonce !== q.texte) return NaN;
    if (q.type === 'valeur') return D.valeurs[q.i];
    if (q.type === 'max') return D.categories[argmax(D.valeurs)];
    if (q.type === 'min') return D.categories[argmin(D.valeurs)];
    if (q.type === 'ecart') return D.valeurs[q.a] - D.valeurs[q.b];
    return undefined;
  }
  const q = contenu.calculs[i - nT - nD];
  if (it.enonce !== q.texte) return NaN;
  if (q.type === 'ecartCases') return v[q.ligne][q.colA] - v[q.ligne][q.colB];
  if (q.type === 'totalColonne') return somme(col(q.col));
  if (q.type === 'sommeDeux') return v[q.ligne][q.cols[0]] + v[q.ligne][q.cols[1]];
  return undefined;
}

// Une bande sur sa règle : la longueur se lit dans le dessin lui-même.
function bande(e, it) {
  const svg = regleFractions(it.visuelEnonce);
  const m = /le dénominateur est (\d+)\.$/.exec(e);
  if (!m || +m[1] !== +attr(svg, 'data-parts')) return NaN;
  return +attr(svg, 'data-longueur');
}

// Un dessin d'item doit se retrouver dans la page de la fiche de même code (à la taille et au titre près).
const SANS_TAILLE = (h) => h.replace(/\s+/g, ' ').replace(/ width="[^"]*" height="[^"]*"/g, '').replace(/ aria-label="[^"]*"/g, '');
function figureSurLaPage(spec, pageHtml) {
  if (spec.type === 'tableau') {
    return spec.lignes.every((l) => pageHtml.includes(`<th>${l.cap}</th>${l.valeurs.map((x) => `<td>${x}</td>`).join('')}`))
      && spec.colonnes.every((c) => pageHtml.includes(`<th>${c}</th>`));
  }
  const svgs = visuel(spec).match(/<svg[\s\S]*?<\/svg>/g) || [];
  return svgs.length > 0 && svgs.every((s) => pageHtml.includes(SANS_TAILLE(s)));
}
const TYPES_VISUELS = ['fraction', 'regle', 'horloge', 'solide', 'patron', 'figure', 'symetrie', 'diagramme', 'tableau'];

// La page élève (tous les exercices) en texte, sans balises ni espaces.
const pageTexte = (fiche, opts, graine) => rendre(fiche, tirer(fiche, opts, graine), { methode: false, corrige: false })
  .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, '');
const sansEspace = (s) => String(s).replace(/\s+/g, '');

const moyenne = (l) => l.reduce((s, x) => s + x.difficulte, 0) / l.length;
const ids = notionsAvecItems();

console.log('— Banque d’items');
verifier(ids.length === 17 && ids.every((id) => FICHES.some((f) => f.id === id)), `notionsAvecItems : ${ids.length} notions, toutes des fiches`);
verifier(items('inconnue').length === 0 && JSON.stringify(ids) === JSON.stringify(FICHES.map((f) => f.id)), 'une notion inconnue donne une liste vide ; les 17 fiches ont des items, dans l’ordre des fiches');

const stats = {};
for (const id of ids) {
  const fiche = FICHES.find((f) => f.id === id);
  console.log(`— ${id}`);
  let nbItems = 0, invalides = [], faux = [], absents = [], nonRecalcules = 0, total = 0, ordreInstable = 0;
  const difficultes = new Set();
  for (const options of combinaisons(fiche)) {
    for (const graine of GRAINES) {
      const l = items(id, { options, graine });
      const l2 = items(id, { options, graine });
      if (JSON.stringify(l) !== JSON.stringify(l2)) ordreInstable++;
      nbItems = l.length;
      const page = pageTexte(fiche, { ...optionsParDefaut(fiche), ...options }, graine);
      const contenuTire = tirer(fiche, { ...optionsParDefaut(fiche), ...options }, graine);
      const code = contenuTire.code;
      const contenuComplet = fiche.mise.combien ? { ...contenuTire, ...fiche.mise.combien(contenuTire, false) } : contenuTire;
      const pageHtml = SANS_TAILLE(rendre(fiche, contenuTire, { methode: false, corrige: false }));
      const vus = new Set();
      l.forEach((it, i) => {
        total++;
        const cle = `${nom(options)}@${graine}#${i}`;
        const ok = it.notion === id && ['nombre', 'choix'].includes(it.type)
          && Number.isInteger(it.difficulte) && it.difficulte >= 1 && it.difficulte <= 5
          && typeof it.enonce === 'string' && it.enonce.length > 5
          && typeof it.aide === 'string' && it.aide.length > 10 && !NEGATIFS.test(`${it.aide} ${it.enonce}`)
          && (it.type === 'nombre' ? Number.isInteger(it.reponse) && it.reponse >= 0 && /^\d+$/.test(normalise(it.reponse)) && it.choix === undefined
            : typeof it.reponse === 'string' && it.reponse.length <= 40 && Array.isArray(it.choix) && it.choix.includes(it.reponse) && normalise(it.reponse) !== ''
              && it.choix.length >= 2 && it.choix.length <= 4 && new Set(it.choix.map(normalise)).size === it.choix.length
              && it.choix.every((x) => typeof x === 'string' && x.length > 0)
              && (it.choix.length >= 3 || it.choix.every((x) => ['oui', 'non', '<', '>'].includes(x))))
          && it.formulation === 'commune' && it.id === `${code}#${i}` && !vus.has(it.id) && Array.isArray(it.operandes);
        vus.add(it.id);
        if (!ok) invalides.push(cle);
        difficultes.add(it.difficulte);
        // réponse recalculée depuis l'énoncé
        const a = attendu(id, it, { contenu: contenuComplet, i, opts: { ...optionsParDefaut(fiche), ...options } });
        if (a === undefined) nonRecalcules++;
        else if (it.type === 'nombre' ? !Number.isInteger(a) || a !== it.reponse : a !== it.reponse) faux.push(`${cle} « ${it.enonce} » : ${it.reponse} au lieu de ${a}`);
        if (/^Écris en chiffres : « (.+) »$/.test(it.enonce) && enLettres(it.reponse) !== /« (.+) »/.exec(it.enonce)[1]) faux.push(`${cle} : lettres`);
        // les nombres de l'item sont ceux de la fiche de même code
        for (const o of it.operandes) if (!page.includes(sansEspace(o))) absents.push(`${cle} : ${o}`);
        if (it.operandes.length === 0 && !it.visuelEnonce && /\d/.test(it.enonce)) absents.push(`${cle} : aucun opérande`);
        if (it.visuel && !['polygone', 'monnaie', 'figures'].includes(it.visuel.type)) invalides.push(`${cle} : visuel inconnu`);
        if (it.visuel && !visuel(it.visuel)) invalides.push(`${cle} : visuel vide`);
        if (it.visuelEnonce) {
          if (!TYPES_VISUELS.includes(it.visuelEnonce.type) || !visuel(it.visuelEnonce)) invalides.push(`${cle} : visuelEnonce inconnu`);
          else if (!figureSurLaPage(it.visuelEnonce, pageHtml)) absents.push(`${cle} : la figure (${it.visuelEnonce.type}) n’est pas celle de la fiche`);
        }
      });
    }
  }
  stats[id] = { nbItems, total, nonRecalcules };
  verifier(nbItems >= 10, `${id} : ${nbItems} items par tirage`);
  verifier(invalides.length === 0, `${id} : ${total} items valides (type, réponse, difficulté 1–5, aide, id, aucun mot négatif)${invalides.length ? ' — ' + invalides.slice(0, 3).join(' | ') : ''}`);
  verifier(faux.length === 0, `${id} : réponses recalculées depuis l’énoncé (${total - nonRecalcules}/${total})${faux.length ? ' — ' + faux.slice(0, 3).join(' | ') : ''}`);
  const seuil = id === 'ce2-masses-contenances' ? 0.5 : 0.25;   // les objets (choix d'unité) et les problèmes de la fiche restent à la main
  verifier(nonRecalcules / total <= seuil, `${id} : au plus ${Math.round(seuil * 100)} % des items hors recalcul (${Math.round(100 * nonRecalcules / total)} %)`);
  verifier(absents.length === 0, `${id} : chaque opérande est imprimé sur la fiche de même code${absents.length ? ' — ' + absents.slice(0, 3).join(' | ') : ''}`);
  verifier(ordreInstable === 0, `${id} : même graine et mêmes options, mêmes items dans le même ordre`);
  const a = items(id, { graine: 11 }), b = items(id, { graine: 12 });
  verifier(JSON.stringify(a) !== JSON.stringify(b), `${id} : une autre graine donne d’autres items`);
  verifier(difficultes.size >= 2, `${id} : plusieurs difficultés (${[...difficultes].sort().join(', ')})`);

  // la formulation ne change ni les nombres, ni les réponses, ni la difficulté
  const livret = items(id, { graine: 21, formulation: 'livret' }), commune = items(id, { graine: 21 });
  const memes = livret.length === commune.length && livret.every((x, i) => x.enonce === commune[i].enonce && x.reponse === commune[i].reponse
    && x.difficulte === commune[i].difficulte && x.id === commune[i].id && x.formulation === 'livret');
  verifier(memes, `${id} : livret et commune portent les mêmes énoncés, réponses et difficultés`);
  const filtre = items(id, { graine: 21, difficulte: commune[0].difficulte });
  verifier(filtre.length > 0 && filtre.every((x) => x.difficulte === commune[0].difficulte) && filtre.length <= commune.length, `${id} : le filtre de difficulté ne garde que ce niveau`);
  const plage = items(id, { graine: 21, difficulte: { min: 1, max: 2 } });
  verifier(plage.every((x) => x.difficulte <= 2), `${id} : le filtre { min, max } borne la difficulté`);
}

// QCM : ni toujours « oui », ni toujours la bonne réponse à la même place (20 graines).
console.log('— QCM');
for (const id of ids) {
  const tous = GRAINES.flatMap((graine) => items(id, { graine }));
  const binaires = tous.filter((it) => it.type === 'choix' && it.choix.length === 2 && it.choix.includes('oui'));
  if (binaires.length) {
    const part = binaires.filter((it) => it.reponse === 'oui').length / binaires.length;
    verifier(part >= 0.25 && part <= 0.75, `${id} : ${Math.round(100 * part)} % de « oui » sur ${binaires.length} questions oui / non`);
  }
  const larges = tous.filter((it) => it.type === 'choix' && it.choix.length >= 3 && !it.choix.includes('<'));
  if (larges.length) {
    const places = new Set(larges.map((it) => it.choix.indexOf(it.reponse)));
    verifier(places.size >= 3, `${id} : la bonne réponse n’est pas toujours à la même place (${[...places].sort().join(', ')})`);
  }
}

// La difficulté croît avec les options « plus dures » (moyenne sur 20 graines).
console.log('— Difficulté et options');
const moy = (id, options) => moyenne(GRAINES.flatMap((graine) => items(id, { options, graine })));
const PLUS_DURS = [
  ['ce2-addition-posee', { taille: '3' }, { taille: '4' }],
  ['ce2-soustraction-posee', { taille: '3' }, { taille: '4' }],
  ['ce2-multiplication', { facteur: '1' }, { facteur: '2' }],
  ['ce2-nombres-lire-ecrire', { taille: '1000' }, { taille: '10000' }],
  ['ce2-nombres-comparer', { taille: '1000' }, { taille: '10000' }],
  ['ce2-longueurs', { km: 'non' }, { km: 'oui' }],
  ['ce2-monnaie', { centimes: 'non' }, { centimes: 'oui' }],
  ['ce2-fractions-calculer', { denominateur: '4' }, { denominateur: '10' }],
  ['ce2-heures', { minutes: 'quarts' }, { minutes: 'cinq' }],
  ['ce2-donnees', { effectifs: 'petits' }, { effectifs: 'grands' }],
];
for (const [id, doux, dur] of PLUS_DURS) {
  const d1 = moy(id, doux), d2 = moy(id, dur);
  verifier(d2 > d1, `${id} : ${nom(dur)} (${d2.toFixed(2)}) plus dur que ${nom(doux)} (${d1.toFixed(2)})`);
}

console.log('— Bilan');
for (const id of ids) console.log(`  ${id} : ${stats[id].nbItems} items`);
console.log(echecs ? `✘ ${echecs} échec(s)` : '✔ toute la banque d’items est valide');
process.exit(echecs ? 1 : 0);
