// Le carnet : un journal d'événements qu'on ajoute et qu'on n'écrase jamais.
// Il vit dans la sauvegarde locale (`carnet: []`) et pourra être synchronisé tel quel plus tard :
// chaque événement a un identifiant unique, la fusion de deux carnets ne crée donc jamais de doublon.
//
//   { id, date (ISO), type, notion, donnees }
//
//   type « serie »        une série terminée dans l'application
//                         notion = « classe:module » (ex. « ce2:tables »), donnees = { etoiles, questions }
//   type « fiche »        une fiche ou une feuille panachée imprimée
//                         notion = '' (la feuille), donnees = { code, notions: [id de fiche…] }
//   type « appreciation » saisie par l'adulte après correction
//                         notion = id de fiche, donnees = { valeur: 'acquis' | 'en cours' | 'a revoir', code? }
import * as P from './progression.js';
import { FICHES } from './fiches.js';

export const VERSION_EXPORT = 1;
export const TYPES = ['serie', 'fiche', 'appreciation'];
export const APPRECIATIONS = ['acquis', 'en cours', 'a revoir'];

/* Correspondance module de l'application -> fiche (« classe:module » -> id de fiche).
   Elle n'est pas exacte : les modules d'entraînement et les fiches de révision ne découpent pas
   le programme de la même façon. On ne relie que ce qui est évident ; un module sans entrée ici
   (division, calcul mental, problèmes…) est tout de même enregistré dans le carnet, mais ne
   met aucune fiche à jour.
     tables         -> multiplication (les tables sont le cœur de la fiche)
     multiplication -> multiplication (multiplications posées)
     addition       -> addition posée
     soustraction   -> soustraction posée
     nombres        -> nombres : lire et écrire
     mesures        -> longueurs (le premier thème des mesures)
     geometrie      -> polygones et cercle (le premier thème de la géométrie)
   Pas de correspondance : division, mental, problemes. */
export const MODULE_VERS_FICHE = {
  'ce2:tables': 'ce2-multiplication',
  'ce2:multiplication': 'ce2-multiplication',
  'ce2:addition': 'ce2-addition-posee',
  'ce2:soustraction': 'ce2-soustraction-posee',
  'ce2:nombres': 'ce2-nombres-lire-ecrire',
  'ce2:mesures': 'ce2-longueurs',
  'ce2:geometrie': 'ce2-polygones',
};
export const ficheDuModule = (module) => MODULE_VERS_FICHE[module] || null;

const liste = () => {
  const e = P.get();
  if (!Array.isArray(e.carnet)) e.carnet = [];
  return e.carnet;
};

const nouvelId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;

export function ajouter(type, notion, donnees = {}) {
  const evenement = { id: nouvelId(), date: new Date().toISOString(), type, notion: notion || '', donnees: { ...donnees } };
  liste().push(evenement);
  P.sauvegarder();
  return evenement;
}

export const evenements = ({ type, notion } = {}) =>
  liste().filter((e) => (type === undefined || e.type === type) && (notion === undefined || e.notion === notion));

const plusRecent = (a, b) => (a && a > b ? a : b);

// Par id de fiche : { derniereRevision, derniereAppreciation, nbFiches, nbSeries }.
// Seules les fiches qui ont au moins un événement apparaissent.
export function resume() {
  const sortie = {};
  const entree = (id) => (sortie[id] ||= { derniereRevision: null, derniereAppreciation: null, nbFiches: 0, nbSeries: 0 });
  const connues = new Set(FICHES.map((f) => f.id));
  for (const e of liste()) {
    const d = e.donnees || {};
    if (e.type === 'serie') {
      const id = ficheDuModule(e.notion);
      if (!id) continue;
      const r = entree(id);
      r.nbSeries += 1;
      r.derniereRevision = plusRecent(e.date, r.derniereRevision || '');
    } else if (e.type === 'fiche') {
      for (const id of (d.notions || []).filter((n) => connues.has(n))) {
        const r = entree(id);
        r.nbFiches += 1;
        r.derniereRevision = plusRecent(e.date, r.derniereRevision || '');
      }
    } else if (e.type === 'appreciation' && connues.has(e.notion)) {
      const r = entree(e.notion);
      if (!r.derniereAppreciation || e.date >= r.derniereAppreciation.date) {
        r.derniereAppreciation = { valeur: d.valeur, date: e.date };
      }
    }
  }
  return sortie;
}

export function exporter() {
  const e = P.get();
  return JSON.stringify({
    version: VERSION_EXPORT,
    carnet: liste(),
    progression: {
      etoiles: e.etoiles, modules: e.modules, jours: e.jours, serieJours: e.serieJours,
      badges: e.badges, jardin: e.jardin, etoilesDepensees: e.etoilesDepensees,
    },
  }, null, 2);
}

const valide = (x) => x && typeof x.id === 'string' && typeof x.date === 'string' && TYPES.includes(x.type);

// Fusionne un carnet exporté : renvoie le nombre d'événements ajoutés, ou -1 si le fichier n'est pas un carnet.
// Les réglages, le prénom, la classe… restent ceux de cet appareil.
export function importer(json) {
  let recu;
  try { recu = JSON.parse(json); } catch { return -1; }
  if (!recu || typeof recu !== 'object' || !Array.isArray(recu.carnet)) return -1;

  const connus = new Set(liste().map((x) => x.id));
  let ajoutes = 0;
  for (const x of recu.carnet.filter(valide)) {
    if (connus.has(x.id)) continue;
    connus.add(x.id);
    liste().push({ id: x.id, date: x.date, type: x.type, notion: String(x.notion || ''), donnees: x.donnees && typeof x.donnees === 'object' ? x.donnees : {} });
    ajoutes += 1;
  }

  const e = P.get();
  const p = recu.progression && typeof recu.progression === 'object' ? recu.progression : {};
  const nb = (v) => (Number.isFinite(v) ? v : 0);
  if (p.modules && typeof p.modules === 'object') {
    for (const [cle, m] of Object.entries(p.modules)) {
      if (!m || typeof m !== 'object') continue;
      const local = e.modules[cle];
      if (!local || nb(m.etoiles) > nb(local.etoiles)) e.modules[cle] = { reussites: 0, essais: 0, niveau: 1, ...m };
    }
  }
  e.etoiles = Math.max(nb(e.etoiles), nb(p.etoiles));
  e.etoilesDepensees = Math.max(nb(e.etoilesDepensees), nb(p.etoilesDepensees));
  e.serieJours = Math.max(nb(e.serieJours), nb(p.serieJours));
  if (Array.isArray(p.jours)) e.jours = [...new Set([...e.jours, ...p.jours.filter((j) => typeof j === 'string')])].sort().slice(-400);
  if (Array.isArray(p.badges)) e.badges = [...new Set([...e.badges, ...p.badges.filter((b) => typeof b === 'string')])];
  if (Array.isArray(p.jardin)) e.jardin = [...e.jardin, ...p.jardin.filter((d) => typeof d === 'string' && !e.jardin.includes(d))];
  P.sauvegarder();
  return ajoutes;
}
