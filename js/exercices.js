// Registre des classes et fabrique de séries d'exercices.
// Chaque classe fournit ses propres modules dans js/niveaux/<classe>.js ; l'application
// ne connaît que cette interface, ce qui permet d'ajouter le CM1 ou le CM2 sans la modifier.

import { MODULES as CP } from './niveaux/cp.js';
import { MODULES as CE1 } from './niveaux/ce1.js';
import { MODULES as CE2 } from './niveaux/ce2.js';

export const CLASSES = [
  { id: 'cp', nom: 'CP', age: '6-7 ans', emoji: '🐣', modules: CP },
  { id: 'ce1', nom: 'CE1', age: '7-8 ans', emoji: '🐥', modules: CE1 },
  { id: 'ce2', nom: 'CE2', age: '8-9 ans', emoji: '🦉', modules: CE2 },
];

export const CLASSE_DEFAUT = 'ce2';

export const classeParId = (id) => CLASSES.find((c) => c.id === id) || CLASSES.find((c) => c.id === CLASSE_DEFAUT);

export const modulesDe = (classeId) => classeParId(classeId).modules;

export const moduleParId = (classeId, id) => modulesDe(classeId).find((m) => m.id === id);

// Identifiant unique d'un module toutes classes confondues (pour la progression).
export const cle = (classeId, moduleId) => `${classeId}:${moduleId}`;

// Fabrique une série d'exercices variés, sans énoncé en double.
// `difficulte(moduleId)` renvoie 1, 2 ou 3.
export function serie(classeId, moduleIds, nb, difficulte) {
  const out = [];
  const vus = new Set();
  let garde = 0;
  while (out.length < nb && garde++ < nb * 40) {
    const id = moduleIds[out.length % moduleIds.length];
    const mod = moduleParId(classeId, id);
    const ex = mod.gen(difficulte(id));
    if (vus.has(ex.enonce)) continue;
    vus.add(ex.enonce);
    out.push({ ...ex, moduleId: id, classeId });
  }
  return out;
}
