// Banque d'items (js/items.js) : des exercices structurés tirés du même contenu que les fiches.
// Node pur, sans jsdom : on recalcule les réponses ici, à partir de l'énoncé seul.
import { FICHES, tirer, rendre, optionsParDefaut } from '../js/fiches.js';
import { items, notionsAvecItems } from '../js/items.js';
import { enLettres } from '../js/utils.js';

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
function attendu(notion, it) {
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
    case 'ce2-fractions-calculer': {
      const f = [...e.matchAll(/(\d+)\/(\d+)/g)].map((x) => [+x[1], +x[2]]);
      const moins = /−/.test(e.split('Quel est')[0]) && /^\d+\/\d+ − /.test(e) || /Il reste|On en coupe/.test(e);
      return moins ? f[0][0] - f[1][0] : f[0][0] + f[1][0];
    }
    default: return undefined;
  }
}

// La page élève (tous les exercices) en texte, sans balises ni espaces.
const pageTexte = (fiche, opts, graine) => rendre(fiche, tirer(fiche, opts, graine), { methode: false, corrige: false })
  .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, '');
const sansEspace = (s) => String(s).replace(/\s+/g, '');

const moyenne = (l) => l.reduce((s, x) => s + x.difficulte, 0) / l.length;
const ids = notionsAvecItems();

console.log('— Banque d’items');
verifier(ids.length === 10 && ids.every((id) => FICHES.some((f) => f.id === id)), `notionsAvecItems : ${ids.length} notions, toutes des fiches`);
verifier(items('ce2-solides', { graine: 1 }).length === 0 && items('inconnue').length === 0, 'une notion sans items donne une liste vide');

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
      const code = tirer(fiche, { ...optionsParDefaut(fiche), ...options }, graine).code;
      const vus = new Set();
      l.forEach((it, i) => {
        total++;
        const cle = `${nom(options)}@${graine}#${i}`;
        const ok = it.notion === id && ['nombre', 'choix'].includes(it.type)
          && Number.isInteger(it.difficulte) && it.difficulte >= 1 && it.difficulte <= 5
          && typeof it.enonce === 'string' && it.enonce.length > 5
          && typeof it.aide === 'string' && it.aide.length > 10 && !NEGATIFS.test(`${it.aide} ${it.enonce}`)
          && (it.type === 'nombre' ? Number.isInteger(it.reponse) && it.reponse >= 0 && /^\d+$/.test(normalise(it.reponse))
            : typeof it.reponse === 'string' && it.reponse.length <= 4 && Array.isArray(it.choix) && it.choix.includes(it.reponse) && normalise(it.reponse) !== '')
          && it.formulation === 'commune' && it.id === `${code}#${i}` && !vus.has(it.id) && Array.isArray(it.operandes);
        vus.add(it.id);
        if (!ok) invalides.push(cle);
        difficultes.add(it.difficulte);
        // réponse recalculée depuis l'énoncé
        const a = attendu(id, it);
        if (a === undefined) nonRecalcules++;
        else if (it.type === 'nombre' ? !Number.isInteger(a) || a !== it.reponse : a !== it.reponse) faux.push(`${cle} « ${it.enonce} » : ${it.reponse} au lieu de ${a}`);
        if (/^Écris en chiffres : « (.+) »$/.test(it.enonce) && enLettres(it.reponse) !== /« (.+) »/.exec(it.enonce)[1]) faux.push(`${cle} : lettres`);
        // les nombres de l'item sont ceux de la fiche de même code
        for (const o of it.operandes) if (!page.includes(sansEspace(o))) absents.push(`${cle} : ${o}`);
        if (it.operandes.length === 0 && !/^Écris en chiffres/.test(it.enonce)) absents.push(`${cle} : aucun opérande`);
        if (it.visuel && !['polygone', 'monnaie'].includes(it.visuel.type)) invalides.push(`${cle} : visuel inconnu`);
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
];
for (const [id, doux, dur] of PLUS_DURS) {
  const d1 = moy(id, doux), d2 = moy(id, dur);
  verifier(d2 > d1, `${id} : ${nom(dur)} (${d2.toFixed(2)}) plus dur que ${nom(doux)} (${d1.toFixed(2)})`);
}

console.log('— Bilan');
for (const id of ids) console.log(`  ${id} : ${stats[id].nbItems} items`);
console.log(echecs ? `✘ ${echecs} échec(s)` : '✔ toute la banque d’items est valide');
process.exit(echecs ? 1 : 0);
