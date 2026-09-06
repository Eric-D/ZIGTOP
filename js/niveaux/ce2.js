// Catalogue des exercices de mathématiques — classe de CE2.
// Chaque module expose `gen(d)` où d = difficulté (1 = doux, 2 = normal, 3 = costaud).
// Un exercice renvoyé a la forme :
//   { type: 'nombre' | 'choix', enonce, choix?, reponse, aide, unite? }
// `reponse` est comparée en texte après normalisation.

import { rnd, pick, shuffle, fmt, enLettres, leurres } from '../utils.js';

/* ------------------------------------------------------------------ */
/* 1. Les nombres jusqu'à 10 000                                       */
/* ------------------------------------------------------------------ */

const RANGS = [
  { nom: 'unités', div: 1 },
  { nom: 'dizaines', div: 10 },
  { nom: 'centaines', div: 100 },
  { nom: 'milliers', div: 1000 },
];

function genNombres(d) {
  const max = d === 1 ? 999 : d === 2 ? 4999 : 9999;
  const n = rnd(d === 1 ? 100 : 1000, max);

  return pick([
    () => {
      const rang = pick(RANGS.slice(0, n >= 1000 ? 4 : 3));
      const chiffre = Math.floor(n / rang.div) % 10;
      return {
        type: 'nombre',
        enonce: `Dans le nombre ${fmt(n)}, quel est le chiffre des ${rang.nom} ?`,
        reponse: chiffre,
        visuel: n < 1000 ? { type: 'decimal', n } : null,
        aide: `On lit ${fmt(n)} de droite à gauche : unités, dizaines, centaines, milliers. Le chiffre des ${rang.nom} est ${chiffre}.`,
      };
    },
    () => ({
      type: 'nombre',
      enonce: `Écris ce nombre en chiffres : « ${enLettres(n)} »`,
      reponse: n,
      aide: `« ${enLettres(n)} » s'écrit ${fmt(n)}.`,
    }),
    () => {
      const m = n + rnd(1, 3) * pick([1, 10, 100, -1, -10, -100]);
      const a = Math.min(n, m), b = Math.max(n, m);
      return {
        type: 'choix',
        enonce: `Quel nombre est le plus grand ?`,
        choix: shuffle([fmt(a), fmt(b)]),
        reponse: fmt(b),
        aide: `On compare chiffre par chiffre en partant de la gauche : ${fmt(b)} est plus grand que ${fmt(a)}.`,
      };
    },
    () => {
      const pas = pick([1, 10, 100, 1000]);
      const sens = pick([1, -1]);
      const val = n + pas * sens;
      if (val < 0 || val > 9999) return genNombres(d);
      return {
        type: 'nombre',
        enonce: `${fmt(n)} ${sens > 0 ? '+' : '−'} ${fmt(pas)} = ?`,
        reponse: val,
        aide: `On ajoute ${sens > 0 ? '' : 'ou on retire '}${fmt(pas)} : ${fmt(n)} ${sens > 0 ? '+' : '−'} ${fmt(pas)} = ${fmt(val)}.`,
      };
    },
    () => {
      const m = Math.floor(n / 1000) * 1000;
      const c = Math.floor((n % 1000) / 100) * 100;
      const du = n % 100;
      return {
        type: 'nombre',
        enonce: `Complète la décomposition : ${fmt(n)} = ${fmt(m)} + ${c} + ?`,
        reponse: du,
        aide: `${fmt(n)} = ${fmt(m)} + ${c} + ${du}. Il restait les dizaines et les unités.`,
      };
    },
  ])();
}

/* ------------------------------------------------------------------ */
/* 2. Additions                                                        */
/* ------------------------------------------------------------------ */

function genAddition(d) {
  const [min, max] = d === 1 ? [10, 99] : d === 2 ? [100, 999] : [1000, 4999];
  const a = rnd(min, max), b = rnd(min, max);

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${fmt(a)} + ${fmt(b)} = ?`,
      reponse: a + b,
      aide: `On additionne les unités, puis les dizaines, puis les centaines : ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`,
    }),
    () => {
      const total = a + b;
      return {
        type: 'nombre',
        enonce: `${fmt(a)} + ? = ${fmt(total)}`,
        reponse: b,
        aide: `Pour trouver le nombre qui manque, on soustrait : ${fmt(total)} − ${fmt(a)} = ${fmt(b)}.`,
      };
    },
    () => {
      const c = rnd(min, max);
      return {
        type: 'nombre',
        enonce: `${fmt(a)} + ${fmt(b)} + ${fmt(c)} = ?`,
        reponse: a + b + c,
        aide: `On additionne deux par deux : ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}, puis ${fmt(a + b)} + ${fmt(c)} = ${fmt(a + b + c)}.`,
      };
    },
  ])();
}

/* ------------------------------------------------------------------ */
/* 3. Soustractions                                                    */
/* ------------------------------------------------------------------ */

function genSoustraction(d) {
  const [min, max] = d === 1 ? [10, 99] : d === 2 ? [100, 999] : [1000, 9999];
  let a = rnd(min, max), b = rnd(min, max);
  if (b > a) [a, b] = [b, a];

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${fmt(a)} − ${fmt(b)} = ?`,
      reponse: a - b,
      aide: `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}. Astuce : on peut vérifier en faisant ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `? − ${fmt(b)} = ${fmt(a - b)}`,
      reponse: a,
      aide: `Le nombre du début se retrouve en additionnant : ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `Combien manque-t-il à ${fmt(b)} pour arriver à ${fmt(a)} ?`,
      reponse: a - b,
      aide: `On cherche l'écart : ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`,
    }),
  ])();
}

/* ------------------------------------------------------------------ */
/* 4. Tables de multiplication                                         */
/* ------------------------------------------------------------------ */

function genTables(d) {
  const tables = d === 1 ? [2, 3, 4, 5, 10] : d === 2 ? [2, 3, 4, 5, 6, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const a = pick(tables), b = rnd(1, 10);
  const p = a * b;

  return pick([
    () => ({
      type: 'nombre',
      enonce: `${a} × ${b} = ?`,
      reponse: p,
      aide: `${a} × ${b} = ${p}. C'est ${b} fois ${a}, ou ${a} paquets de ${b} : c'est pareil !`,
      visuel: { type: 'grille', lignes: b, colonnes: a },
    }),
    () => ({
      type: 'choix',
      enonce: `${a} × ${b} = ?`,
      choix: leurres(p, 3, Math.max(4, a), 0).map(String),
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
  ])();
}

/* ------------------------------------------------------------------ */
/* 5. Multiplication posée                                             */
/* ------------------------------------------------------------------ */

function genMultiplication(d) {
  if (d === 1) {
    const a = rnd(11, 49), b = rnd(2, 5);
    return {
      type: 'nombre',
      enonce: `${a} × ${b} = ?`,
      reponse: a * b,
      aide: `On décompose : ${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b} et ${a % 10} × ${b} = ${(a % 10) * b}. Total : ${a * b}.`,
    };
  }
  if (d === 2) {
    const a = rnd(100, 499), b = rnd(2, 9);
    return {
      type: 'nombre',
      enonce: `${fmt(a)} × ${b} = ?`,
      reponse: a * b,
      aide: `${fmt(a)} × ${b} = ${fmt(a * b)} (on multiplie les unités, les dizaines, puis les centaines).`,
    };
  }
  const a = rnd(12, 99), b = rnd(11, 25);
  return {
    type: 'nombre',
    enonce: `${a} × ${b} = ?`,
    reponse: a * b,
    aide: `${a} × ${b} = (${a} × ${Math.floor(b / 10) * 10}) + (${a} × ${b % 10}) = ${a * Math.floor(b / 10) * 10} + ${a * (b % 10)} = ${fmt(a * b)}.`,
  };
}

/* ------------------------------------------------------------------ */
/* 6. Divisions et partages                                            */
/* ------------------------------------------------------------------ */

function genDivision(d) {
  const diviseur = d === 1 ? rnd(2, 5) : rnd(2, 9);
  const quotient = d === 1 ? rnd(2, 10) : d === 2 ? rnd(3, 20) : rnd(10, 50);
  const reste = d === 3 ? rnd(0, diviseur - 1) : 0;
  const dividende = diviseur * quotient + reste;

  if (reste === 0) {
    return pick([
      () => ({
        type: 'nombre',
        enonce: `${dividende} ÷ ${diviseur} = ?`,
        reponse: quotient,
        aide: `${diviseur} × ${quotient} = ${dividende}, donc ${dividende} ÷ ${diviseur} = ${quotient}.`,
      }),
      () => ({
        type: 'nombre',
        enonce: `On partage ${dividende} billes entre ${diviseur} enfants, à parts égales. Combien de billes par enfant ?`,
        reponse: quotient,
        aide: `${dividende} ÷ ${diviseur} = ${quotient} : chaque enfant reçoit ${quotient} billes.`,
        visuel: { type: 'partage', total: dividende, parts: diviseur },
      }),
    ])();
  }
  return pick([
    () => ({
      type: 'nombre',
      enonce: `Dans ${dividende} ÷ ${diviseur}, quel est le quotient (le résultat entier) ?`,
      reponse: quotient,
      aide: `${diviseur} × ${quotient} = ${diviseur * quotient}, et il reste ${reste}. Le quotient est ${quotient}.`,
    }),
    () => ({
      type: 'nombre',
      enonce: `Dans ${dividende} ÷ ${diviseur}, quel est le reste ?`,
      reponse: reste,
      aide: `${diviseur} × ${quotient} = ${diviseur * quotient}. ${dividende} − ${diviseur * quotient} = ${reste} : le reste est ${reste}.`,
    }),
  ])();
}

/* ------------------------------------------------------------------ */
/* 7. Doubles, moitiés, calcul mental                                  */
/* ------------------------------------------------------------------ */

function genCalculMental(d) {
  const base = d === 1 ? rnd(2, 20) : d === 2 ? rnd(10, 100) : rnd(50, 500);
  return pick([
    () => ({
      type: 'nombre',
      enonce: `Quel est le double de ${fmt(base)} ?`,
      reponse: base * 2,
      aide: `Le double, c'est deux fois : ${fmt(base)} + ${fmt(base)} = ${fmt(base * 2)}.`,
    }),
    () => {
      const pair = base * 2;
      return {
        type: 'nombre',
        enonce: `Quelle est la moitié de ${fmt(pair)} ?`,
        reponse: base,
        aide: `La moitié, c'est partager en 2 : ${fmt(pair)} ÷ 2 = ${fmt(base)}.`,
      };
    },
    () => {
      const n = rnd(10, 90);
      return {
        type: 'nombre',
        enonce: `Combien faut-il ajouter à ${n} pour arriver à 100 ?`,
        reponse: 100 - n,
        aide: `${n} + ${100 - n} = 100. C'est le complément à 100.`,
      };
    },
    () => {
      const n = rnd(2, 20);
      return {
        type: 'nombre',
        enonce: `${n} × 10 = ?`,
        reponse: n * 10,
        aide: `Multiplier par 10, c'est ajouter un zéro : ${n} × 10 = ${n * 10}.`,
      };
    },
  ])();
}

/* ------------------------------------------------------------------ */
/* 8. Problèmes                                                        */
/* ------------------------------------------------------------------ */

const PRENOMS = ['Léa', 'Sacha', 'Nina', 'Tom', 'Awa', 'Malo', 'Jade', 'Ilyes', 'Zoé', 'Noé'];

function genProblemes(d) {
  const p = pick(PRENOMS);
  const q = pick(PRENOMS.filter((x) => x !== p));

  const modeles = [
    () => {
      const a = rnd(d === 1 ? 5 : 20, d === 1 ? 30 : 200), b = rnd(d === 1 ? 5 : 20, d === 1 ? 30 : 200);
      return {
        type: 'nombre',
        enonce: `${p} a ${a} images. ${q} lui en donne ${b}. Combien ${p} a-t-elle d'images en tout ?`,
        reponse: a + b,
        aide: `« En tout » veut dire qu'on additionne : ${a} + ${b} = ${a + b} images.`,
      };
    },
    () => {
      const a = rnd(30, d === 1 ? 60 : 500), b = rnd(5, a - 1);
      return {
        type: 'nombre',
        enonce: `Il y a ${a} élèves dans l'école. ${b} sont partis en sortie. Combien reste-t-il d'élèves ?`,
        reponse: a - b,
        aide: `« Combien reste-t-il » : on soustrait. ${a} − ${b} = ${a - b} élèves.`,
      };
    },
    () => {
      const paquets = rnd(3, d === 1 ? 6 : 9), parPaquet = rnd(4, d === 1 ? 8 : 25);
      return {
        type: 'nombre',
        enonce: `${p} achète ${paquets} paquets de ${parPaquet} gâteaux. Combien de gâteaux au total ?`,
        reponse: paquets * parPaquet,
        aide: `Des paquets identiques : on multiplie. ${paquets} × ${parPaquet} = ${paquets * parPaquet} gâteaux.`,
      };
    },
    () => {
      const parts = rnd(2, 8), chacun = rnd(3, d === 1 ? 8 : 20);
      return {
        type: 'nombre',
        enonce: `${parts * chacun} bonbons sont partagés équitablement entre ${parts} enfants. Combien chacun en reçoit-il ?`,
        reponse: chacun,
        aide: `Partage équitable : on divise. ${parts * chacun} ÷ ${parts} = ${chacun} bonbons chacun.`,
      };
    },
    () => {
      const prix = rnd(3, 20), nb = rnd(2, 6), donne = prix * nb + rnd(1, 15);
      return {
        type: 'nombre',
        enonce: `${p} achète ${nb} livres à ${prix} € l'un. Il paie avec ${donne} €. Combien lui rend-on ?`,
        reponse: donne - prix * nb,
        aide: `D'abord le total : ${nb} × ${prix} = ${prix * nb} €. Puis la monnaie : ${donne} − ${prix * nb} = ${donne - prix * nb} €.`,
      };
    },
  ];
  return pick(modeles)();
}

/* ------------------------------------------------------------------ */
/* 9. Mesures                                                          */
/* ------------------------------------------------------------------ */

function genMesures(d) {
  return pick([
    () => {
      const m = rnd(1, d === 1 ? 9 : 40);
      return { type: 'nombre', enonce: `${m} m = ? cm`, reponse: m * 100, aide: `1 m = 100 cm, donc ${m} m = ${fmt(m * 100)} cm.` };
    },
    () => {
      const km = rnd(1, 9);
      return { type: 'nombre', enonce: `${km} km = ? m`, reponse: km * 1000, aide: `1 km = 1 000 m, donc ${km} km = ${fmt(km * 1000)} m.` };
    },
    () => {
      const kg = rnd(1, 9);
      return { type: 'nombre', enonce: `${kg} kg = ? g`, reponse: kg * 1000, aide: `1 kg = 1 000 g, donc ${kg} kg = ${fmt(kg * 1000)} g.` };
    },
    () => {
      const h = rnd(1, 5);
      return { type: 'nombre', enonce: `${h} h = ? min`, reponse: h * 60, aide: `1 heure = 60 minutes, donc ${h} h = ${h * 60} min.` };
    },
    () => {
      const e = rnd(2, 20), c = pick([10, 25, 50, 75]);
      return {
        type: 'nombre',
        enonce: `${e} € et ${c} centimes, cela fait combien de centimes en tout ?`,
        reponse: e * 100 + c,
        aide: `1 € = 100 centimes : ${e} × 100 = ${fmt(e * 100)}, plus ${c} = ${fmt(e * 100 + c)} centimes.`,
      };
    },
    () => {
      const h = rnd(8, 17), m = pick([0, 15, 30, 45]), duree = pick([15, 30, 45, 60, 90]);
      const total = h * 60 + m + duree;
      const fh = Math.floor(total / 60), fm = total % 60;
      return {
        type: 'nombre',
        enonce: `Le film commence à ${h} h ${String(m).padStart(2, '0')} et dure ${duree} min. À quelle heure finit-il ? (réponds en minutes après l'heure pile, ex : 14 h 30 → 30)`,
        reponse: fm,
        aide: `${h} h ${String(m).padStart(2, '0')} + ${duree} min = ${fh} h ${String(fm).padStart(2, '0')}. La réponse attendue était ${fm}.`,
      };
    },
  ])();
}

/* ------------------------------------------------------------------ */
/* 10. Géométrie                                                       */
/* ------------------------------------------------------------------ */

function genGeometrie(d) {
  return pick([
    () => {
      const c = rnd(2, d === 1 ? 12 : 40);
      return {
        type: 'nombre',
        enonce: `Un carré a des côtés de ${c} cm. Quel est son périmètre, en cm ?`,
        reponse: c * 4,
        aide: `Le carré a 4 côtés égaux : ${c} × 4 = ${c * 4} cm.`,
      };
    },
    () => {
      const L = rnd(5, 30), l = rnd(2, L - 1);
      return {
        type: 'nombre',
        enonce: `Un rectangle mesure ${L} cm de long et ${l} cm de large. Quel est son périmètre, en cm ?`,
        reponse: 2 * (L + l),
        aide: `On fait le tour : ${L} + ${l} + ${L} + ${l} = ${2 * (L + l)} cm.`,
      };
    },
    () => {
      const formes = [
        { nom: 'triangle', cotes: 3, sommets: 3 },
        { nom: 'carré', cotes: 4, sommets: 4 },
        { nom: 'rectangle', cotes: 4, sommets: 4 },
        { nom: 'pentagone', cotes: 5, sommets: 5 },
        { nom: 'hexagone', cotes: 6, sommets: 6 },
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
        { e: 'Quelle figure a 4 côtés égaux et 4 angles droits ?', r: 'le carré', c: ['le carré', 'le triangle', 'le cercle', 'le losange'] },
        { e: 'Quel solide a 6 faces carrées ?', r: 'le cube', c: ['le cube', 'la pyramide', 'la boule', 'le cylindre'] },
        { e: "Quel instrument sert à tracer un cercle ?", r: 'le compas', c: ['le compas', 'la règle', 'l’équerre', 'le rapporteur'] },
        { e: "Quel instrument sert à vérifier un angle droit ?", r: 'l’équerre', c: ['l’équerre', 'le compas', 'la règle', 'la gomme'] },
      ]);
      return { type: 'choix', enonce: q.e, choix: shuffle(q.c), reponse: q.r, aide: `La bonne réponse est ${q.r}.` };
    },
  ])();
}

/* ------------------------------------------------------------------ */

export const MODULES = [
  { id: 'nombres', titre: 'Les nombres jusqu’à 10 000', emoji: '🔢', couleur: '#6C5CE7', gen: genNombres },
  { id: 'addition', titre: 'Les additions', emoji: '➕', couleur: '#00B894', gen: genAddition },
  { id: 'soustraction', titre: 'Les soustractions', emoji: '➖', couleur: '#0984E3', gen: genSoustraction },
  { id: 'tables', titre: 'Les tables de multiplication', emoji: '✖️', couleur: '#E17055', gen: genTables },
  { id: 'multiplication', titre: 'Multiplications posées', emoji: '🧮', couleur: '#D63031', gen: genMultiplication },
  { id: 'division', titre: 'Divisions et partages', emoji: '➗', couleur: '#00CEC9', gen: genDivision },
  { id: 'mental', titre: 'Doubles, moitiés, calcul malin', emoji: '⚡', couleur: '#FDCB6E', gen: genCalculMental },
  { id: 'problemes', titre: 'Les problèmes', emoji: '🧩', couleur: '#E84393', gen: genProblemes },
  { id: 'mesures', titre: 'Les mesures', emoji: '📏', couleur: '#2D98DA', gen: genMesures },
  { id: 'geometrie', titre: 'La géométrie', emoji: '📐', couleur: '#8E44AD', gen: genGeometrie },
];
