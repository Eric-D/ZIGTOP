// Feuilles panachées : une révision qui mélange plusieurs notions (pratique entrelacée).
// Une feuille = un exercice par notion choisie, pris dans les blocs déjà écrits par chaque
// fiche, sur une page A4 élève et son corrigé. Le code « Z… » (voir fiches.js) redonne
// exactement la même composition.

import { FICHES, NOMS_FORMULATIONS, ficheParId, optionsParDefaut, tirer, blocsDe, objectifDe, codePanache, enTeteHTML, echappe, avecZigo } from './fiches.js';
import { HAUTEURS_PAGE, HAUTEURS_RAPPEL } from './hauteurs-blocs.js';

// Budget de hauteur d'une page élève ou corrigé (px, impression, 673 px de large). La page A4 avec ses marges
// de 12 mm offre 273 mm ≈ 1 032 px : les 32 px de reste absorbent l'écart entre la mesure et l'imprimante.
export const BUDGET_HAUTEUR = 1000;
export const NOTIONS_MAX = 5;         // par feuille
const RAPPEL_PAR_DEFAUT = 26;         // px par ligne de mini-rappel (la table mesurée donne la valeur de chaque fiche)
const MARGE_RAPPELS = 6;              // px sous la liste des mini-rappels

// RÈGLE DE CHOIX DU BLOC, la même pour toutes les fiches : on prend le premier exercice
// (« Exercice 1 »). Chaque fiche va du plus guidé au plus ouvert et son exercice 1 est
// autonome (il ne renvoie à aucun autre) ; c'est aussi un des plus courts, ce qui laisse de
// la place à cinq notions. Changer cette règle change le contenu des codes déjà imprimés.
export const INDEX_BLOC = 0;

// Graine du tirage d'une notion : mélange déterministe de la graine du code et de l'index de la
// fiche dans FICHES (jamais de sa place dans la sélection : une notion garde ses nombres
// quand on en ajoute une autre).
export function graineDerivee(graine, indexFiche) {
  let h = (Math.imul(graine >>> 0, 0x9E3779B1) ^ Math.imul(indexFiche + 1, 0x85EBCA6B)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) % 36 ** 6;
}

const hauteurRappel = (id) => HAUTEURS_RAPPEL[id] || RAPPEL_PAR_DEFAUT;

// Rend la liste des notions canonique : ordre de FICHES, sans doublon, options valides.
function normaliser(notions) {
  const vus = new Set();
  const liste = [];
  for (const n of notions || []) {
    const fiche = ficheParId(n.id);
    if (!fiche) throw new Error(`Notion inconnue : ${n.id}`);
    if (vus.has(fiche.id)) continue;
    vus.add(fiche.id);
    const defauts = optionsParDefaut(fiche);
    const options = {};
    for (const o of fiche.options || []) {
      const v = (n.options || {})[o.id];
      options[o.id] = o.valeurs.some((x) => x.v === v) ? v : defauts[o.id];
    }
    liste.push({ fiche, options });
  }
  if (!liste.length) throw new Error('Une feuille panachée a au moins une notion.');
  return liste.sort((a, b) => FICHES.indexOf(a.fiche) - FICHES.indexOf(b.fiche));
}

// composer({ notions: [{ id, options }], graine, miniRappel }) → { feuilles, code, … }
// Une feuille : { code, notions: [{ id, options }], blocs, graine, miniRappel }. Tous les feuilles
// d'une composition portent le même code.
export function composer({ notions, graine, miniRappel = false }) {
  const choisies = normaliser(notions);
  const code = codePanache(choisies.map((n) => ({ id: n.fiche.id, options: n.options })), graine, miniRappel);

  const candidats = choisies.map(({ fiche, options }) => {
    const index = FICHES.indexOf(fiche);
    const contenu = tirer(fiche, options, graineDerivee(graine, index));
    const bloc = blocsDe(fiche, contenu, { methode: true })[INDEX_BLOC];
    // Une fiche convertie garde aussi son bloc et son objectif dans chaque formulation : la
    // composition (qui tient sur quelle feuille) est la même, seul le texte change à l'affichage.
    const variantes = fiche.formulations ? Object.fromEntries(NOMS_FORMULATIONS.map((nom) => {
      const b = blocsDe(fiche, contenu, { methode: true, formulation: nom })[INDEX_BLOC];
      return [nom, { eleve: b.eleve, corrige: b.corrige, consigne: b.consigne, objectif: objectifDe(fiche, contenu, nom) }];
    })) : null;
    return { id: fiche.id, options, bloc: { ...bloc, ficheId: fiche.id, court: fiche.court, objectif: objectifDe(fiche, contenu), ...(variantes ? { variantes } : {}) } };
  });

  // Le budget des deux pages (élève et corrigé) : en-tête + mini-rappels + blocs ≤ 1 000 px.
  const tient = (liste, rappel) => {
    const eleve = HAUTEURS_PAGE.enteteEleve + (rappel ? MARGE_RAPPELS : 0) + liste.reduce((s, c) => s + c.bloc.hauteur + (rappel ? hauteurRappel(c.id) : 0), 0);
    const corrige = HAUTEURS_PAGE.enteteCorrige + liste.reduce((s, c) => s + c.bloc.hauteurCorrige, 0);
    return eleve <= BUDGET_HAUTEUR && corrige <= BUDGET_HAUTEUR;
  };

  const feuilles = [];
  let courante = [], rappel = miniRappel;
  const fermer = () => {
    if (!courante.length) return;
    feuilles.push({
      code, graine,
      miniRappel: rappel,
      notions: courante.map((c) => ({ id: c.id, options: c.options })),
      blocs: courante.map((c) => c.bloc),
    });
    courante = [];
    rappel = miniRappel;
  };
  for (const c of candidats) {
    const essai = [...courante, c];
    if (courante.length < NOTIONS_MAX && tient(essai, rappel)) courante = essai;
    else if (courante.length < NOTIONS_MAX && rappel && tient(essai, false)) { courante = essai; rappel = false; }
    else { fermer(); courante = [c]; }   // un bloc seul qui dépasserait reste seul : il ne déborde pas plus ailleurs
  }
  fermer();
  return { feuilles, code, graine, miniRappel, notions: choisies.map((n) => ({ id: n.fiche.id, options: n.options })) };
}

/* ------------------------------------------------------------------ */
/* Rendu                                                               */
/* ------------------------------------------------------------------ */

// Le bloc tel que la fiche l'a écrit, dont seul le titre est renuméroté :
// « Exercice 3 — consigne », identique sur la page élève et sur le corrigé.
// `formulation` : le bloc d'une fiche convertie existe dans chaque formulation (`bloc.variantes`) ;
// à défaut (fiche non convertie, ou bloc sans variantes) c'est le bloc tel quel.
export const varianteDe = (bloc, formulation = 'livret') => (bloc.variantes && (bloc.variantes[formulation] || bloc.variantes.livret)) || bloc;

export function htmlBloc(bloc, numero, vue = 'eleve', formulation = 'livret') {
  const v = varianteDe(bloc, formulation);
  const h2 = `<h2>Exercice ${numero}${v.consigne ? ` — ${v.consigne}` : ''}</h2>`;
  return avecZigo((vue === 'corrige' ? v.corrige : v.eleve).replace(/<h2[^>]*>[\s\S]*?<\/h2>/, h2));
}

const titrePanache = (feuille) => `Révision : ${feuille.blocs.map((b) => b.court).join(' · ')}`;
const surtitre = (feuille, i, total) =>
  `${ficheParId(feuille.notions[0].id).classe.toUpperCase()} · Révision${total > 1 ? ` · feuille ${i + 1} sur ${total}` : ''}`;

function pageEleve(feuille, i, total, { base, identite, formulation }) {
  return `
  <section class="feuille feuille--panache">
    ${enTeteHTML({ surtitre: surtitre(feuille, i, total), titre: titrePanache(feuille), code: feuille.code, base, identite, vue: 'eleve' })}
${feuille.miniRappel ? `
    <ul class="rappels">${feuille.blocs.map((b, k) => `
      <li><strong>Exercice ${k + 1}.</strong> ${echappe(varianteDe(b, formulation).objectif)}</li>`).join('')}
    </ul>
` : ''}
${feuille.blocs.map((b, k) => `
    ${htmlBloc(b, k + 1, 'eleve', formulation)}`).join('\n')}
    <div class="pied-feuille">Mathoo · feuille de révision à imprimer</div>
  </section>`;
}

function pageCorrigePanache(feuille, i, total, { base, formulation }) {
  return `
  <section class="feuille feuille--corrige feuille--panache">
    ${enTeteHTML({ surtitre: surtitre(feuille, i, total), titre: `${titrePanache(feuille)} — <em>corrigé</em>`, code: feuille.code, base, identite: false, vue: 'corrige' })}
    <div class="objectif objectif--corrige">Pour le parent ou l’enseignant : un exercice par notion, corrigés dans le même ordre.
      Pour retrouver exactement cette feuille plus tard : scanner le QR code, ou saisir <strong>${feuille.code}</strong> dans l’application.</div>
${feuille.blocs.map((b, k) => `
    ${htmlBloc(b, k + 1, 'corrige', formulation)}`).join('\n')}
    <div class="pied-feuille">Mathoo · corrigé</div>
  </section>`;
}

// Même signature que `rendre` : les pages élève d'abord, les corrigés ensuite ; `eleve: false`
// ne rend que les corrigés (la vue partagée par lien). `feuilles` : ce que renvoie `composer`
// (ou son tableau `feuilles`).
export function rendrePanache(feuilles, { corrige = true, identite = true, eleve = true, base = '', formulation = 'livret' } = {}) {
  const liste = Array.isArray(feuilles) ? feuilles : feuilles.feuilles;
  const pages = eleve ? liste.map((f, i) => pageEleve(f, i, liste.length, { base, identite, formulation })) : [];
  if (corrige || !eleve) pages.push(...liste.map((f, i) => pageCorrigePanache(f, i, liste.length, { base, formulation })));
  return pages.join('');
}
