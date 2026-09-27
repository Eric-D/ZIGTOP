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

const ENTETES = ['u', 'd', 'c', 'm'];
const entetes = (largeur) => ENTETES.slice(0, largeur).reverse();

// Une opération posée. `mode` : 'vide' (tout à écrire), 'pose' (chiffres placés),
// 'corrige' (tout rempli, en couleur).
// Toutes les lignes ont exactement le même nombre de cellules — colonne du signe
// comprise — sinon les unités ne tomberaient pas sous les unités, ce qui est
// précisément ce que la leçon demande d'apprendre.
function operationPosee({ a, b, largeur, mode, numero }) {
  const resultat = String(a + b);
  const colonnes = Math.max(largeur, resultat.length);   // colonnes de chiffres
  const A = chiffres(a, colonnes);
  const B = chiffres(b, colonnes);
  const R = chiffres(a + b, colonnes);
  const ret = retenues(a, b, colonnes);

  const cellule = (v, classe = '') => `<td class="${classe}">${v && v !== ' ' ? v : ''}</td>`;
  const vides = (n, classe = '') => (n > 0 ? Array(n).fill(`<td class="${classe}"></td>`).join('') : '');
  const signe = (v) => `<td class="signe">${v}</td>`;

  const entetesLigne = entetes(largeur);
  const ligneEntetes = `<tr class="pose__entetes">${signe('')}${vides(colonnes - largeur)}${entetesLigne.map((e) => `<td>${e}</td>`).join('')}</tr>`;

  const ligneRetenues = mode === 'corrige'
    ? `<tr class="pose__retenues">${signe('')}${ret.map((r) => cellule(r, 'retenue')).join('')}</tr>`
    : `<tr class="pose__retenues">${signe('')}${vides(colonnes, 'retenue')}</tr>`;

  const lignesNombres = mode === 'vide'
    ? `<tr class="pose__nombre">${signe('')}${vides(colonnes, 'case')}</tr>
       <tr class="pose__nombre pose__nombre--derniere">${signe('+')}${vides(colonnes, 'case')}</tr>`
    : `<tr class="pose__nombre">${signe('')}${A.map((c) => cellule(c)).join('')}</tr>
       <tr class="pose__nombre pose__nombre--derniere">${signe('+')}${B.map((c) => cellule(c)).join('')}</tr>`;

  const ligneResultat = mode === 'corrige'
    ? `<tr class="pose__resultat">${signe('')}${R.map((c) => cellule(c, 'reponse')).join('')}</tr>`
    : `<tr class="pose__resultat">${signe('')}${vides(colonnes, 'case')}</tr>`;

  return `
    <div class="op">
      ${numero || mode === 'vide' ? `<div class="op__titre">${numero ? `${numero}.` : ''} ${mode === 'vide' && numero ? `${fmt(a)} + ${fmt(b)} =` : ''}</div>` : ''}
      <table class="pose">
        ${ligneEntetes}
        ${ligneRetenues}
        ${lignesNombres}
        ${ligneResultat}
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
    // Les deux dernières additions de chaque liste ne sont imprimées que lorsque
    // le rappel de méthode est masqué : la page libérée sert à s'entraîner plus.
    posees: [
      { ...additionAvec(tailles[0], 'aucune'), largeur: tailles[0] },
      { ...additionAvec(tailles[1], 'une'), largeur: tailles[1] },
      { ...additionAvec(tailles[2], 'plusieurs'), largeur: tailles[2] },
      { ...additionAvec(tailles[3], 'plusieurs'), largeur: tailles[3] },
      { ...additionAvec(tailles[1], 'plusieurs'), largeur: tailles[1] },
      { ...additionAvec(tailles[3], 'une'), largeur: tailles[3] },
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
/* Mise en page de la fiche                                            */
/* ------------------------------------------------------------------ */

const echappe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Le QR code rouvre exactement cette fiche (et son corrigé) dans l'application.
function enTete(fiche, sousTitre, contenu, base, identite = true) {
  const lien = base ? `${base}?fiche=${contenu.code}` : '';
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

// Combien d'exercices tiennent sur la page, selon qu'on imprime ou non la méthode.
const combien = (contenu, methode) => ({
  posees: contenu.posees.slice(0, methode ? 4 : 6),
  aposer: contenu.aposer.slice(0, methode ? 3 : 4),
});

function pageExercices(fiche, contenu, { base = '', methode = true, identite = true } = {}) {
  const exemple = operationPosee({ ...contenu.methode.exemple, mode: 'corrige', numero: '' });
  const { posees, aposer } = combien(contenu, methode);

  return `
  <section class="feuille">
    ${enTete(fiche, '', contenu, base, identite)}

    <div class="objectif">${echappe(contenu.objectif)}</div>

    ${methode ? `<div class="bloc bloc--methode">
      <h2>Je me souviens de la méthode</h2>
      <div class="methode">
        <div class="methode__exemple">${exemple}<div class="methode__egalite">685 + 267 = 952</div></div>
        <ol class="methode__etapes">${contenu.methode.etapes.map((e) => `<li>${echappe(e)}</li>`).join('')}</ol>
      </div>
    </div>` : ''}

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

    <div class="pied-feuille">Mathoo · fiche de révision à imprimer</div>
  </section>`;
}

function pageCorrige(fiche, contenu, { base = '', methode = true } = {}) {
  const { posees, aposer } = combien(contenu, methode);
  return `
  <section class="feuille feuille--corrige">
    ${enTete(fiche, 'corrigé', contenu, base, false)}
    <div class="objectif objectif--corrige">Pour le parent ou l’enseignant : les retenues sont notées en haut de chaque colonne.
      Pour retrouver exactement cette fiche plus tard : scanner le QR code, ou saisir <strong>${contenu.code}</strong> dans l’application.</div>

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
export function rendre(fiche, contenus, { corrige = true, methode = true, identite = true, base = '' } = {}) {
  const liste = Array.isArray(contenus) ? contenus : [contenus];
  const pages = liste.map((c) => pageExercices(fiche, c, { base, methode, identite }));
  if (corrige) pages.push(...liste.map((c) => pageCorrige(fiche, c, { base, methode })));
  return pages.join('');
}
