// Catalogue des exercices de mathématiques — classe de CP.
// Les énoncés sont volontairement très courts : au CP, l'enfant lit encore doucement.

import { rnd, pick, shuffle, enLettres, leurres } from '../utils.js';

/* 1. Les nombres jusqu'à 100 ---------------------------------------- */

function genNombres(d) {
  const max = d === 1 ? 20 : d === 2 ? 59 : 99;
  const n = rnd(1, max);

  return pick([
    () => ({
      type: 'nombre',
      enonce: `Quel nombre vient juste après ${n} ?`,
      reponse: n + 1,
      aide: `Après ${n}, on dit ${n + 1}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `Quel nombre vient juste avant ${n + 1} ?`,
      reponse: n,
      aide: `Avant ${n + 1}, on dit ${n}.`,
    }),
    () => {
      const m = Math.max(0, Math.min(99, n + rnd(1, 12) * pick([1, -1])));
      if (m === n) return genNombres(d);
      return {
        type: 'choix',
        enonce: 'Quel nombre est le plus grand ?',
        choix: shuffle([String(n), String(m)]),
        reponse: String(Math.max(n, m)),
        aide: `${Math.max(n, m)} est plus grand que ${Math.min(n, m)}.`,
      };
    },
    () => {
      const v = rnd(11, max);
      const quoi = pick(['dizaines', 'unités']);
      return {
        type: 'nombre',
        enonce: `Dans ${v}, combien y a-t-il de ${quoi} ?`,
        reponse: quoi === 'dizaines' ? Math.floor(v / 10) : v % 10,
        aide: `${v}, c'est ${Math.floor(v / 10)} dizaine${Math.floor(v / 10) > 1 ? 's' : ''} et ${v % 10} unité${v % 10 > 1 ? 's' : ''}.`,
        visuel: { type: 'decimal', n: v },
      };
    },
    () => {
      const v = rnd(11, d === 1 ? 20 : 69);
      return {
        type: 'nombre',
        enonce: `Écris ce nombre en chiffres : « ${enLettres(v)} »`,
        reponse: v,
        aide: `« ${enLettres(v)} » s'écrit ${v}.`,
      };
    },
    () => {
      const v = rnd(21, max);
      const diz = Math.floor(v / 10) * 10;
      return {
        type: 'nombre',
        enonce: `${v} = ${diz} + ?`,
        reponse: v % 10,
        aide: `${v}, c'est ${diz} et encore ${v % 10}.`,
        visuel: { type: 'decimal', n: v },
      };
    },
  ])();
}

/* 2. Additions ------------------------------------------------------ */

function genAddition(d) {
  const max = d === 1 ? 10 : d === 2 ? 20 : 50;
  const a = rnd(1, max), b = rnd(1, max);

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${a} + ${b} = ?`,
      reponse: a + b,
      aide: `On part de ${a} et on avance de ${b} : ${a + b}.`,
      visuel: a + b <= 20 ? { type: 'jetons', a, b, signe: '+' } : { type: 'ligne', de: a, saut: b, vers: a + b },
    }),
    () => ({
      type: 'nombre',
      enonce: `${a} + ? = ${a + b}`,
      reponse: b,
      aide: `De ${a} à ${a + b}, il y a ${b} pas. Donc ${a} + ${b} = ${a + b}.`,
    }),
    () => {
      const c = rnd(1, 5);
      return {
        type: 'nombre',
        enonce: `${a} + ${b} + ${c} = ?`,
        reponse: a + b + c,
        aide: `D'abord ${a} + ${b} = ${a + b}, puis ${a + b} + ${c} = ${a + b + c}.`,
      };
    },
  ])();
}

/* 3. Soustractions -------------------------------------------------- */

function genSoustraction(d) {
  const max = d === 1 ? 10 : d === 2 ? 20 : 50;
  let a = rnd(2, max), b = rnd(1, max);
  if (b > a) [a, b] = [b, a];

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${a} − ${b} = ?`,
      reponse: a - b,
      aide: `On part de ${a} et on recule de ${b} : ${a - b}.`,
      visuel: { type: 'ligne', de: a, saut: -b, vers: a - b },
    }),
    () => ({
      type: 'nombre',
      enonce: `J'ai ${a} bonbons, j'en mange ${b}. Combien m'en reste-t-il ?`,
      reponse: a - b,
      aide: `${a} − ${b} = ${a - b} bonbons.`,
    }),
  ])();
}

/* 4. Compléments, doubles et moitiés -------------------------------- */

function genCalculMental(d) {
  const cible = d === 1 ? 10 : pick([10, 20]);
  return pick([
    () => {
      const n = rnd(1, cible - 1);
      return {
        type: 'nombre',
        enonce: `${n} + ? = ${cible}`,
        reponse: cible - n,
        aide: `Pour aller de ${n} à ${cible}, il faut ${cible - n}.`,
      };
    },
    () => {
      const n = d === 1 ? rnd(1, 5) : rnd(1, 10);
      return {
        type: 'nombre',
        enonce: `Quel est le double de ${n} ?`,
        reponse: n * 2,
        aide: `Le double, c'est deux fois : ${n} + ${n} = ${n * 2}.`,
        visuel: { type: 'jetons', a: n, b: n, signe: '+' },
      };
    },
    () => {
      const n = d === 1 ? rnd(1, 5) : rnd(1, 10);
      return {
        type: 'nombre',
        enonce: `Quelle est la moitié de ${n * 2} ?`,
        reponse: n,
        aide: `On partage ${n * 2} en 2 parts égales : ${n} et ${n}.`,
      };
    },
    () => {
      const n = rnd(1, 9);
      return {
        type: 'choix',
        enonce: `${n} + ${n} = ?`,
        choix: leurres(n * 2, 2, 3, 0).map(String),
        reponse: String(n * 2),
        aide: `C'est le double de ${n} : ${n * 2}.`,
      };
    },
  ])();
}

/* 5. Suites de nombres ---------------------------------------------- */

function genSuites(d) {
  const pas = d === 1 ? pick([1, 2, 10]) : pick([2, 5, 10]);
  const depart = pas === 10 ? rnd(0, 4) * 10 : rnd(0, 6);
  const suite = [0, 1, 2, 3].map((i) => depart + i * pas);
  const manquant = suite[3] + pas;
  return pick([
    () => ({
      type: 'nombre',
      enonce: `Continue la suite : ${suite.join(', ')}, ?`,
      reponse: manquant,
      aide: `On avance de ${pas} en ${pas} : après ${suite[3]} vient ${manquant}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `Trouve le nombre caché : ${suite[0]}, ${suite[1]}, ?, ${suite[3]}`,
      reponse: suite[2],
      aide: `La suite avance de ${pas} en ${pas} : ${suite.join(', ')}.`,
    }),
  ])();
}

/* 6. Problèmes ------------------------------------------------------ */

const PRENOMS = ['Léa', 'Tom', 'Awa', 'Malo', 'Zoé', 'Noé', 'Lou', 'Sacha'];

function genProblemes(d) {
  const p = pick(PRENOMS);
  const max = d === 1 ? 10 : 20;
  const a = rnd(2, max), b = rnd(1, max);

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${p} a ${a} billes. On lui en donne ${b}. Combien en a-t-il maintenant ?`,
      reponse: a + b,
      aide: `On en ajoute : ${a} + ${b} = ${a + b} billes.`,
      visuel: { type: 'jetons', a, b, signe: '+' },
    }),
    () => {
      const grand = Math.max(a, b), petit = Math.min(a, b);
      return {
        type: 'nombre',
        enonce: `Il y a ${grand} oiseaux sur l'arbre. ${petit} s'envolent. Combien en reste-t-il ?`,
        reponse: grand - petit,
        aide: `On enlève : ${grand} − ${petit} = ${grand - petit} oiseaux.`,
      };
    },
    () => {
      const paires = rnd(2, 5);
      return {
        type: 'nombre',
        enonce: `${p} range ${paires} paires de chaussettes. Combien de chaussettes en tout ?`,
        reponse: paires * 2,
        aide: `Une paire, c'est 2. ${paires} fois 2 = ${paires * 2} chaussettes.`,
        visuel: { type: 'grille', lignes: paires, colonnes: 2 },
      };
    },
    () => {
      const total = rnd(6, 12), pris = rnd(1, total - 1);
      return {
        type: 'nombre',
        enonce: `Dans la boîte il y a ${total} gâteaux. ${p} en prend ${pris}. Combien reste-t-il ?`,
        reponse: total - pris,
        aide: `${total} − ${pris} = ${total - pris} gâteaux.`,
      };
    },
  ])();
}

/* 7. Mesures et monnaie --------------------------------------------- */

function genMesures(d) {
  return pick([
    () => {
      const piece = pick([1, 2, 5, 10]);
      const nb = rnd(2, 5);
      return {
        type: 'nombre',
        enonce: `${nb} pièces de ${piece} € font combien d'euros ?`,
        reponse: nb * piece,
        aide: `${nb} fois ${piece} € = ${nb * piece} €.`,
      };
    },
    () => {
      const a = rnd(2, 10), b = rnd(1, 10);
      return {
        type: 'nombre',
        enonce: `Un billet de ${a * 2} € et une pièce de ${b} € : combien en tout ?`,
        reponse: a * 2 + b,
        aide: `${a * 2} + ${b} = ${a * 2 + b} €.`,
      };
    },
    () => {
      const h = rnd(1, 11);
      return {
        type: 'nombre',
        enonce: `Il est ${h} h. Dans 2 heures, quelle heure sera-t-il ?`,
        reponse: h + 2,
        aide: `${h} + 2 = ${h + 2} h.`,
      };
    },
    () => {
      const j = pick([
        { e: 'Combien de jours dans une semaine ?', r: 7, a: 'Une semaine a 7 jours.' },
        { e: 'Combien de mois dans une année ?', r: 12, a: 'Une année a 12 mois.' },
        { e: 'Combien de doigts sur les deux mains ?', r: 10, a: '5 et 5 : 10 doigts.' },
        { e: 'Combien de minutes dans une heure ?', r: 60, a: 'Une heure a 60 minutes.' },
      ]);
      return { type: 'nombre', enonce: j.e, reponse: j.r, aide: j.a };
    },
  ])();
}

/* 8. Formes --------------------------------------------------------- */

function genGeometrie() {
  const formes = [
    { nom: 'carré', cotes: 4 },
    { nom: 'triangle', cotes: 3 },
    { nom: 'rectangle', cotes: 4 },
  ];
  return pick([
    () => {
      const f = pick(formes);
      return {
        type: 'nombre',
        enonce: `Combien de côtés a un ${f.nom} ?`,
        reponse: f.cotes,
        aide: `Un ${f.nom} a ${f.cotes} côtés.`,
      };
    },
    () => {
      const q = pick([
        { e: 'Quelle forme est toute ronde ?', r: 'le rond', c: ['le rond', 'le carré', 'le triangle'] },
        { e: 'Quelle forme a 3 côtés ?', r: 'le triangle', c: ['le triangle', 'le carré', 'le rond'] },
        { e: 'Quelle forme a 4 côtés tous égaux ?', r: 'le carré', c: ['le carré', 'le triangle', 'le rond'] },
        { e: 'Un ballon de foot a la forme…', r: 'd’une boule', c: ['d’une boule', 'd’un cube', 'd’un carré'] },
      ]);
      return { type: 'choix', enonce: q.e, choix: shuffle(q.c), reponse: q.r, aide: `C'est ${q.r}.` };
    },
    () => {
      const c = rnd(2, 6);
      return {
        type: 'nombre',
        enonce: `Un carré a des côtés de ${c} cm. Combien mesurent ses 4 côtés mis bout à bout ?`,
        reponse: c * 4,
        aide: `${c} + ${c} + ${c} + ${c} = ${c * 4} cm.`,
      };
    },
  ])();
}

export const MODULES = [
  { id: 'nombres', titre: 'Les nombres jusqu’à 100', emoji: '🔢', couleur: '#6C5CE7', gen: genNombres },
  { id: 'addition', titre: 'Les additions', emoji: '➕', couleur: '#00B894', gen: genAddition },
  { id: 'soustraction', titre: 'Les soustractions', emoji: '➖', couleur: '#0984E3', gen: genSoustraction },
  { id: 'mental', titre: 'Doubles, moitiés, compléments', emoji: '⚡', couleur: '#FDCB6E', gen: genCalculMental },
  { id: 'suites', titre: 'Les suites de nombres', emoji: '🪜', couleur: '#00CEC9', gen: genSuites },
  { id: 'problemes', titre: 'Les petits problèmes', emoji: '🧩', couleur: '#E84393', gen: genProblemes },
  { id: 'mesures', titre: 'Les sous et le temps', emoji: '🪙', couleur: '#2D98DA', gen: genMesures },
  { id: 'geometrie', titre: 'Les formes', emoji: '🔺', couleur: '#8E44AD', gen: genGeometrie },
];
