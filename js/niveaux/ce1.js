// Catalogue des exercices de mathématiques — classe de CE1.

import { rnd, pick, shuffle, fmt, enLettres, leurres } from '../utils.js';

/* 1. Les nombres jusqu'à 1 000 -------------------------------------- */

const RANGS = [
  { nom: 'unités', div: 1 },
  { nom: 'dizaines', div: 10 },
  { nom: 'centaines', div: 100 },
];

function genNombres(d) {
  const max = d === 1 ? 199 : d === 2 ? 599 : 999;
  const n = rnd(d === 1 ? 20 : 100, max);

  return pick([
    () => {
      const rang = pick(RANGS.slice(0, n >= 100 ? 3 : 2));
      const chiffre = Math.floor(n / rang.div) % 10;
      return {
        type: 'nombre',
        enonce: `Dans ${fmt(n)}, quel est le chiffre des ${rang.nom} ?`,
        reponse: chiffre,
        aide: `${fmt(n)} : en partant de la droite on a les unités, les dizaines, puis les centaines. Le chiffre des ${rang.nom} est ${chiffre}.`,
        visuel: { type: 'decimal', n },
      };
    },
    () => ({
      type: 'nombre',
      enonce: `Écris ce nombre en chiffres : « ${enLettres(n)} »`,
      reponse: n,
      aide: `« ${enLettres(n)} » s'écrit ${fmt(n)}.`,
    }),
    () => {
      const m = Math.min(999, Math.max(0, n + rnd(1, 9) * pick([1, -1, 10, -10])));
      if (m === n) return genNombres(d);
      return {
        type: 'choix',
        enonce: 'Quel nombre est le plus grand ?',
        choix: shuffle([String(n), String(m)]),
        reponse: String(Math.max(n, m)),
        aide: `On compare d'abord les centaines, puis les dizaines : ${Math.max(n, m)} est le plus grand.`,
      };
    },
    () => {
      const pas = pick([1, 10, 100]);
      const sens = pick([1, -1]);
      const v = n + pas * sens;
      if (v < 0 || v > 999) return genNombres(d);
      return {
        type: 'nombre',
        enonce: `${fmt(n)} ${sens > 0 ? '+' : '−'} ${pas} = ?`,
        reponse: v,
        aide: `${fmt(n)} ${sens > 0 ? '+' : '−'} ${pas} = ${fmt(v)}.`,
      };
    },
    () => {
      const c = Math.floor(n / 100) * 100;
      return {
        type: 'nombre',
        enonce: `Complète : ${fmt(n)} = ${c} + ?`,
        reponse: n % 100,
        aide: `${fmt(n)}, c'est ${c} et encore ${n % 100}.`,
        visuel: { type: 'decimal', n },
      };
    },
    () => {
      const v = rnd(100, max);
      return {
        type: 'nombre',
        enonce: `Combien y a-t-il de dizaines entières dans ${fmt(v)} ?`,
        reponse: Math.floor(v / 10),
        aide: `On regarde tout ce qui est à gauche des unités : ${fmt(v)} contient ${Math.floor(v / 10)} dizaines (et il reste ${v % 10}).`,
      };
    },
  ])();
}

/* 2. Additions ------------------------------------------------------ */

function genAddition(d) {
  const [min, max] = d === 1 ? [2, 40] : d === 2 ? [20, 99] : [100, 499];
  const a = rnd(min, max), b = rnd(min, max);

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${fmt(a)} + ${fmt(b)} = ?`,
      reponse: a + b,
      aide: `On additionne les unités, puis les dizaines : ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `${fmt(a)} + ? = ${fmt(a + b)}`,
      reponse: b,
      aide: `Il manque l'écart : ${fmt(a + b)} − ${fmt(a)} = ${fmt(b)}.`,
    }),
    () => {
      const diz = rnd(1, 9) * 10;
      const v = rnd(11, 89);
      return {
        type: 'nombre',
        enonce: `${v} + ${diz} = ?`,
        reponse: v + diz,
        aide: `Ajouter ${diz}, c'est ajouter ${diz / 10} dizaines : ${v} + ${diz} = ${v + diz}.`,
      };
    },
  ])();
}

/* 3. Soustractions -------------------------------------------------- */

function genSoustraction(d) {
  const [min, max] = d === 1 ? [2, 40] : d === 2 ? [20, 99] : [100, 999];
  let a = rnd(min, max), b = rnd(min, max);
  if (b > a) [a, b] = [b, a];

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${fmt(a)} − ${fmt(b)} = ?`,
      reponse: a - b,
      aide: `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}. On peut vérifier : ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `Combien manque-t-il à ${fmt(b)} pour aller jusqu'à ${fmt(a)} ?`,
      reponse: a - b,
      aide: `On cherche l'écart : ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `? − ${fmt(b)} = ${fmt(a - b)}`,
      reponse: a,
      aide: `On remonte en additionnant : ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
    }),
  ])();
}

/* 4. Tables de multiplication --------------------------------------- */

function genTables(d) {
  const tables = d === 1 ? [2, 5, 10] : d === 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 10];
  const a = pick(tables), b = rnd(1, 10);
  const p = a * b;

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${a} × ${b} = ?`,
      reponse: p,
      aide: `${a} × ${b}, c'est ${b} paquets de ${a} : ${p}.`,
      visuel: { type: 'grille', lignes: b, colonnes: a },
    }),
    () => ({
      type: 'choix',
      enonce: `${a} × ${b} = ?`,
      choix: leurres(p, 2, Math.max(3, a), 0).map(String),
      reponse: String(p),
      aide: `${a} × ${b} = ${p}.`,
      visuel: { type: 'grille', lignes: b, colonnes: a },
    }),
    () => ({
      type: 'nombre',
      enonce: `${a} × ? = ${p}`,
      reponse: b,
      aide: `Dans la table de ${a}, ${p} c'est ${a} × ${b}.`,
      visuel: { type: 'grille', lignes: b, colonnes: a },
    }),
    () => ({
      type: 'nombre',
      enonce: `${a} + ${a} + ${a} = ? (écris le résultat)`,
      reponse: a * 3,
      aide: `Trois fois ${a}, c'est ${a} × 3 = ${a * 3}. L'addition répétée, c'est la multiplication !`,
      visuel: { type: 'grille', lignes: 3, colonnes: a },
    }),
  ])();
}

/* 5. Partages, doubles et moitiés ------------------------------------ */

function genPartages(d) {
  return pick([
    () => {
      const parts = d === 1 ? pick([2, 5]) : rnd(2, 5);
      const chacun = rnd(2, d === 1 ? 6 : 10);
      return {
        type: 'nombre',
        enonce: `On partage ${parts * chacun} images entre ${parts} enfants. Combien chacun en reçoit-il ?`,
        reponse: chacun,
        aide: `${parts} × ${chacun} = ${parts * chacun}, donc chacun reçoit ${chacun} images.`,
        visuel: { type: 'partage', total: parts * chacun, parts },
      };
    },
    () => {
      const n = d === 1 ? rnd(2, 20) : rnd(10, 50);
      return {
        type: 'nombre',
        enonce: `Quel est le double de ${n} ?`,
        reponse: n * 2,
        aide: `${n} + ${n} = ${n * 2}.`,
      };
    },
    () => {
      const n = d === 1 ? rnd(2, 10) : rnd(5, 40);
      return {
        type: 'nombre',
        enonce: `Quelle est la moitié de ${n * 2} ?`,
        reponse: n,
        aide: `${n * 2} partagé en 2, c'est ${n}.`,
      };
    },
    () => {
      const n = rnd(2, 20);
      return {
        type: 'nombre',
        enonce: `${n} × 10 = ?`,
        reponse: n * 10,
        aide: `Multiplier par 10, c'est ajouter un zéro : ${n * 10}.`,
      };
    },
  ])();
}

/* 6. Problèmes ------------------------------------------------------ */

const PRENOMS = ['Léa', 'Tom', 'Awa', 'Malo', 'Jade', 'Ilyes', 'Zoé', 'Noé', 'Nina', 'Sacha'];

function genProblemes(d) {
  const p = pick(PRENOMS);
  const petit = d === 1;

  return pick([
    () => {
      const a = rnd(petit ? 5 : 20, petit ? 40 : 200), b = rnd(petit ? 3 : 10, petit ? 30 : 150);
      return {
        type: 'nombre',
        enonce: `${p} a ${a} images et en gagne ${b}. Combien en a-t-il en tout ?`,
        reponse: a + b,
        aide: `« En tout » : on additionne. ${a} + ${b} = ${a + b}.`,
      };
    },
    () => {
      const a = rnd(petit ? 20 : 100, petit ? 60 : 500), b = rnd(5, petit ? 19 : 90);
      return {
        type: 'nombre',
        enonce: `La boîte contient ${a} perles. ${p} en utilise ${b}. Combien en reste-t-il ?`,
        reponse: a - b,
        aide: `« Il reste » : on soustrait. ${a} − ${b} = ${a - b}.`,
      };
    },
    () => {
      const sachets = rnd(2, 6), parSachet = rnd(2, petit ? 5 : 10);
      return {
        type: 'nombre',
        enonce: `${p} achète ${sachets} sachets de ${parSachet} billes. Combien de billes en tout ?`,
        reponse: sachets * parSachet,
        aide: `Des sachets identiques : on multiplie. ${sachets} × ${parSachet} = ${sachets * parSachet}.`,
      };
    },
    () => {
      const parts = rnd(2, 5), chacun = rnd(2, petit ? 5 : 9);
      return {
        type: 'nombre',
        enonce: `${parts * chacun} bonbons pour ${parts} enfants, à parts égales. Combien chacun ?`,
        reponse: chacun,
        aide: `On partage : ${parts * chacun} ÷ ${parts} = ${chacun} bonbons.`,
        visuel: { type: 'partage', total: parts * chacun, parts },
      };
    },
    () => {
      const prix = rnd(2, 9), nb = rnd(2, 4), donne = prix * nb + rnd(1, 10);
      return {
        type: 'nombre',
        enonce: `${nb} cahiers coûtent ${prix} € chacun. ${p} paie avec ${donne} €. Combien lui rend-on ?`,
        reponse: donne - prix * nb,
        aide: `Le total : ${nb} × ${prix} = ${prix * nb} €. La monnaie : ${donne} − ${prix * nb} = ${donne - prix * nb} €.`,
      };
    },
  ])();
}

/* 7. Mesures -------------------------------------------------------- */

function genMesures(d) {
  return pick([
    () => {
      const m = rnd(1, d === 1 ? 5 : 20);
      return { type: 'nombre', enonce: `${m} m = ? cm`, reponse: m * 100, aide: `1 m = 100 cm, donc ${m} m = ${fmt(m * 100)} cm.` };
    },
    () => {
      const cm = rnd(1, 9) * 100;
      return { type: 'nombre', enonce: `${cm} cm = ? m`, reponse: cm / 100, aide: `100 cm = 1 m, donc ${cm} cm = ${cm / 100} m.` };
    },
    () => {
      const h = rnd(1, 4);
      return { type: 'nombre', enonce: `${h} h = ? min`, reponse: h * 60, aide: `1 heure = 60 minutes, donc ${h} h = ${h * 60} min.` };
    },
    () => {
      const e = rnd(2, 15);
      return {
        type: 'nombre',
        enonce: `${e} € en centimes, cela fait combien ?`,
        reponse: e * 100,
        aide: `1 € = 100 centimes, donc ${e} € = ${fmt(e * 100)} centimes.`,
      };
    },
    () => {
      const kg = rnd(1, 5);
      return { type: 'nombre', enonce: `${kg} kg = ? g`, reponse: kg * 1000, aide: `1 kg = 1 000 g, donc ${kg} kg = ${fmt(kg * 1000)} g.` };
    },
    () => {
      const h = rnd(8, 16), duree = pick([60, 120, 180]);
      return {
        type: 'nombre',
        enonce: `Il est ${h} h. Le trajet dure ${duree} min. À quelle heure arrive-t-on ?`,
        reponse: h + duree / 60,
        aide: `${duree} min = ${duree / 60} h. ${h} + ${duree / 60} = ${h + duree / 60} h.`,
      };
    },
    () => {
      const f = pick([
        { e: "Une demi-heure, c'est combien de minutes ?", r: 30, a: 'Une heure fait 60 min : la moitié, c\'est 30 min.' },
        { e: "Un quart d'heure, c'est combien de minutes ?", r: 15, a: '60 min partagées en 4 : 15 min.' },
        { e: 'Combien de jours dans une semaine ?', r: 7, a: 'Une semaine a 7 jours.' },
        { e: 'Combien de mois dans une année ?', r: 12, a: 'Une année a 12 mois.' },
      ]);
      return { type: 'nombre', enonce: f.e, reponse: f.r, aide: f.a };
    },
  ])();
}

/* 8. Géométrie ------------------------------------------------------ */

function genGeometrie(d) {
  return pick([
    () => {
      const c = rnd(2, d === 1 ? 10 : 20);
      return {
        type: 'nombre',
        enonce: `Un carré a des côtés de ${c} cm. Quel est son périmètre, en cm ?`,
        reponse: c * 4,
        aide: `Les 4 côtés sont égaux : ${c} × 4 = ${c * 4} cm.`,
      };
    },
    () => {
      const formes = [
        { nom: 'triangle', cotes: 3, sommets: 3 },
        { nom: 'carré', cotes: 4, sommets: 4 },
        { nom: 'rectangle', cotes: 4, sommets: 4 },
        { nom: 'pentagone', cotes: 5, sommets: 5 },
      ];
      const f = pick(formes);
      const quoi = pick(['côtés', 'sommets']);
      return {
        type: 'nombre',
        enonce: `Combien de ${quoi} a un ${f.nom} ?`,
        reponse: quoi === 'côtés' ? f.cotes : f.sommets,
        aide: `Un ${f.nom} a ${f.cotes} côtés et ${f.sommets} sommets.`,
      };
    },
    () => {
      const q = pick([
        { e: 'Quelle figure a 4 côtés égaux et 4 angles droits ?', r: 'le carré', c: ['le carré', 'le triangle', 'le rond'] },
        { e: 'Quel instrument sert à tracer un trait bien droit ?', r: 'la règle', c: ['la règle', 'le compas', 'la gomme'] },
        { e: 'Combien de faces a un cube ?', r: '6', c: ['6', '4', '8'] },
        { e: 'Quelle figure n’a aucun coin ?', r: 'le cercle', c: ['le cercle', 'le carré', 'le triangle'] },
      ]);
      return { type: 'choix', enonce: q.e, choix: shuffle(q.c), reponse: q.r, aide: `La bonne réponse est ${q.r}.` };
    },
    () => {
      const L = rnd(3, 15), l = rnd(2, L);
      return {
        type: 'nombre',
        enonce: `Un rectangle mesure ${L} cm et ${l} cm de côtés. Quel est son périmètre, en cm ?`,
        reponse: 2 * (L + l),
        aide: `On fait le tour : ${L} + ${l} + ${L} + ${l} = ${2 * (L + l)} cm.`,
      };
    },
  ])();
}

export const MODULES = [
  { id: 'nombres', titre: 'Les nombres jusqu’à 1 000', emoji: '🔢', couleur: '#6C5CE7', gen: genNombres },
  { id: 'addition', titre: 'Les additions', emoji: '➕', couleur: '#00B894', gen: genAddition },
  { id: 'soustraction', titre: 'Les soustractions', emoji: '➖', couleur: '#0984E3', gen: genSoustraction },
  { id: 'tables', titre: 'Les tables de multiplication', emoji: '✖️', couleur: '#E17055', gen: genTables },
  { id: 'partages', titre: 'Partages, doubles et moitiés', emoji: '➗', couleur: '#00CEC9', gen: genPartages },
  { id: 'problemes', titre: 'Les problèmes', emoji: '🧩', couleur: '#E84393', gen: genProblemes },
  { id: 'mesures', titre: 'Les mesures', emoji: '📏', couleur: '#2D98DA', gen: genMesures },
  { id: 'geometrie', titre: 'La géométrie', emoji: '📐', couleur: '#8E44AD', gen: genGeometrie },
];
