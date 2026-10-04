// Mode interactif : transforme une composition (la fiche ou la feuille panachée qu'on allait imprimer)
// en une liste d'items à faire dans l'application. Module pur : ni DOM, ni localStorage.
//
// Une composition est une liste de feuilles : [{ notions: [{ id, options, graine }] }].
//   - fiche simple : une feuille par contenu tiré, `graine` = celle du contenu (donc les nombres de la page) ;
//   - feuille panachée : une feuille par feuille imprimée ; la graine de chaque notion est celle que
//     `composer` de panache.js a utilisée (`graineDerivee`), et on ne garde que l'exercice 1 de la notion,
//     comme la feuille.
// Un bloc = une notion d'une feuille. Une notion sans items est annoncée (`avant` / `papierFin`) et sautée.
//
// Difficulté qui suit l'enfant : pour une notion qui a un classement (js/maitrise.js), on garde les items de
// difficulté cible ± 1 ; si cela en laisse trop peu, on complète avec les items les plus proches de la cible.
// Sans classement, tous les items, dans l'ordre de la feuille.

import { FICHES, ficheParId } from './fiches.js';
import { graineDerivee } from './panache.js';
import { items } from './items.js';
import { difficulteCible } from './maitrise.js';

export const PALIER = 10;          // items par session ; au-delà, on propose de continuer ou de s'arrêter
export const ITEMS_PAR_BLOC = 4;   // une notion d'une feuille panachée : au moins quatre items si elle en a

export const compositionSimple = (id, options, contenus) =>
  contenus.map((c) => ({ notions: [{ id, options, graine: c.graine }] }));

export const compositionPanachee = (feuilles) => feuilles.map((f) => ({
  panache: true,
  notions: f.notions.map((n) => ({ id: n.id, options: n.options, graine: graineDerivee(f.graine, FICHES.indexOf(ficheParId(n.id))) })),
}));

// Difficulté cible d'une notion d'après le classement de `classer`, ou null sans historique.
export const cibleDe = (classement, id) => (classement && classement[id] ? difficulteCible(classement[id].r) : null);

// Les items de cette liste qui conviennent à `cible` (± 1), complétés jusqu'à `assez` avec les plus proches.
export function filtrer(liste, cible, assez) {
  if (cible === null || cible === undefined) return liste;
  const gardes = new Set(liste.filter((it) => Math.abs(it.difficulte - cible) <= 1));
  const visee = Math.min(assez, liste.length);
  if (gardes.size < visee) {
    const voisins = liste.filter((it) => !gardes.has(it)).sort((a, b) => Math.abs(a.difficulte - cible) - Math.abs(b.difficulte - cible));
    for (const it of voisins) { if (gardes.size >= visee) break; gardes.add(it); }
  }
  return liste.filter((it) => gardes.has(it));
}

export const moyenneDifficulte = (liste) => (liste.length ? liste.reduce((s, it) => s + it.difficulte, 0) / liste.length : 0);

// → { exercices, papier, papierFin }
//   exercices : les items à la suite, avec `bloc` (numéro) et `avant` (notions sautées juste avant, sur le premier item du bloc)
//   papier    : toutes les notions de la composition qui se font sur papier ; papierFin : celles qui n'ont plus de bloc après elles
export function construire(composition, { formulation, classement } = {}) {
  const exercices = [];
  const papier = [];
  let enAttente = [];
  let bloc = 0;
  for (const feuille of composition) {
    for (const n of feuille.notions) {
      const tous = items(n.id, { options: n.options, graine: n.graine, formulation });
      let liste = tous;
      let assez = PALIER;
      if (feuille.panache) {
        const premier = tous.filter((it) => it.exercice1);
        // Son exercice 1 n'a pas d'équivalent en item (monnaie, fractions) : on prend les premiers items de la notion.
        liste = premier.length ? premier : tous.slice(0, ITEMS_PAR_BLOC);
        assez = Math.min(ITEMS_PAR_BLOC, liste.length);
      }
      if (!liste.length) {
        papier.push(n.id);
        enAttente.push(n.id);
        continue;
      }
      const choisis = filtrer(liste, cibleDe(classement, n.id), assez);
      choisis.forEach((it, i) => exercices.push(i === 0 ? { ...it, bloc, avant: enAttente } : { ...it, bloc, avant: [] }));
      enAttente = [];
      bloc += 1;
    }
  }
  return { exercices, papier, papierFin: enAttente };
}
