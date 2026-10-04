// Maîtrise d'une notion : un classement à la Elo, pas un ratio de bonnes réponses.
// Module pur : ni DOM, ni localStorage. On lui donne les événements du carnet, il rend un classement.
//
// Pourquoi pas « bonnes réponses / essais » ? Un enfant se trompe beaucoup au début d'une notion
// et de moins en moins ensuite : le ratio punit à vie les premiers essais et ne dit rien du niveau
// actuel. Ici chaque réussite ou échec est pesé par la difficulté de l'item (réussir un item
// difficile rapporte beaucoup, rater un item facile coûte cher) et les premiers items pèsent
// de moins en moins : le classement oublie ses débuts.
//
// Événement `item` (écrit par le carnet, voir #28) :
//   { id, date (ISO), type: 'item', notion: id de fiche (ex. 'ce2-soustraction-posee'),
//     donnees: { difficulte (1 à 5), reussi (true/false), essais (1 = du premier coup,
//                2 = après l'astuce), duree? (secondes, non utilisée) } }
// Résultat s : 1 si réussi du premier coup, 0,5 si réussi après l'astuce, 0 si raté.
//
// Modèle, par notion : un classement r (départ 1000) et une incertitude u (départ 350, min. 50).
//   difficulté de l'item  d = 900 + 100 × difficulte        (1 -> 1000 … 5 -> 1400)
//   probabilité attendue  p = 1 / (1 + 10^((d − r) / 400))
//   mise à jour           r += K × (s − p)   K = 80 (10 premiers items), 48 (jusqu'au 30ᵉ), 24 ensuite
//   incertitude           u = max(50, u × 0,9) à chaque item ; remonte de 20 par semaine sans pratique
//                         (plafond 350), jusqu'à « maintenant ». r ne bouge pas avec le temps.
//   reprise               un item réussi sur une notion qui avait été acquise fait baisser u plus
//                         vite (× 0,5 au lieu de × 0,9) : un seul succès après une pause confirme
//                         que la notion est encore là. Sans cela, une pause de 8 semaines
//                         demanderait plusieurs items pour retrouver l'état « acquis ».
// États : decouverte (< 10 items), en-cours, acquis (r ≥ 1150 et u ≤ 120),
//         a-consolider (a été acquise, r ≥ 1150 mais u est remontée au-dessus de 120 par l'oubli).

export const PARAMETRES = {
  depart: 1000,
  incertitudeDepart: 350,
  incertitudeMin: 50,
  facteurIncertitude: 0.9,
  facteurReprise: 0.5,
  oubliParSemaine: 20,
  K: { debut: 80, milieu: 48, ensuite: 24 },
  seuilsK: { debut: 10, milieu: 30 }, // nombre d'items jusqu'auquel s'applique K.debut, puis K.milieu
  itemsDecouverte: 10,
  seuilAcquisR: 1150,
  seuilAcquisU: 120,
  echelle: 400,
  difficulteBase: 900,
  difficultePas: 100,
};

const SEMAINE = 7 * 24 * 3600 * 1000;

const fusion = (parametres) => {
  const p = parametres || {};
  return {
    ...PARAMETRES, ...p,
    K: { ...PARAMETRES.K, ...(p.K || {}) },
    seuilsK: { ...PARAMETRES.seuilsK, ...(p.seuilsK || {}) },
  };
};

export const difficulteItem = (difficulte, P = PARAMETRES) => P.difficulteBase + P.difficultePas * difficulte;
export const probabilite = (r, d, P = PARAMETRES) => 1 / (1 + 10 ** ((d - r) / P.echelle));

const resultat = (donnees) => {
  if (!donnees.reussi) return 0;
  return donnees.essais === 2 ? 0.5 : 1;
};

const coefficient = (n, P) => (n <= P.seuilsK.debut ? P.K.debut : n <= P.seuilsK.milieu ? P.K.milieu : P.K.ensuite);

const remonter = (u, ms, P) => (ms > 0 ? Math.min(P.incertitudeDepart, u + (P.oubliParSemaine * ms) / SEMAINE) : u);

const itemValide = (e) => e && e.type === 'item' && typeof e.notion === 'string' && e.notion !== ''
  && Number.isFinite(Date.parse(e.date)) && e.donnees && typeof e.donnees === 'object'
  && Number.isFinite(e.donnees.difficulte) && typeof e.donnees.reussi === 'boolean';

const etatDe = (n, r, u, aEteAcquis, P) => {
  if (n < P.itemsDecouverte) return 'decouverte';
  if (r < P.seuilAcquisR) return 'en-cours';
  if (u <= P.seuilAcquisU) return 'acquis';
  return aEteAcquis ? 'a-consolider' : 'en-cours';
};

// Rejoue tous les événements `item` dans l'ordre des dates. Rejouable : on peut changer les paramètres.
export function classer(evenements, { maintenant = Date.now(), parametres } = {}) {
  const P = fusion(parametres);
  const items = (Array.isArray(evenements) ? evenements : []).filter(itemValide)
    .map((e, i) => ({ e, i, t: Date.parse(e.date) }))
    .sort((a, b) => a.t - b.t || a.i - b.i);

  const suivi = {};
  for (const { e, t } of items) {
    const d = e.donnees;
    const n = (suivi[e.notion] ||= {
      r: P.depart, u: P.incertitudeDepart, nbItems: 0, t: t, aEteAcquis: false, dernierItem: e.date, historique: [],
    });
    n.u = remonter(n.u, t - n.t, P);
    n.nbItems += 1;
    const diff = Math.min(5, Math.max(1, d.difficulte));
    const s = resultat(d);
    n.r += coefficient(n.nbItems, P) * (s - probabilite(n.r, difficulteItem(diff, P), P));
    const reprise = n.aEteAcquis && s > 0 && n.u > P.seuilAcquisU;
    n.u = Math.max(P.incertitudeMin, n.u * (reprise ? P.facteurReprise : P.facteurIncertitude));
    if (etatDe(n.nbItems, n.r, n.u, false, P) === 'acquis') n.aEteAcquis = true;
    else if (n.r < P.seuilAcquisR) n.aEteAcquis = false;
    n.t = t;
    n.dernierItem = e.date;
    n.historique.push({ date: e.date, r: n.r, u: n.u });
  }

  const sortie = {};
  for (const [notion, n] of Object.entries(suivi)) {
    const u = Number.isFinite(maintenant) ? remonter(n.u, maintenant - n.t, P) : n.u;
    sortie[notion] = {
      r: n.r, u, etat: etatDe(n.nbItems, n.r, u, n.aEteAcquis, P),
      nbItems: n.nbItems, dernierItem: n.dernierItem, historique: n.historique,
    };
  }
  return sortie;
}

// Difficulté (1 à 5) à proposer à un enfant de classement r.
// Une difficulté k vaut d = 900 + 100 k ; l'enfant y réussit avec la probabilité p(r, d).
// On prend la plus grande difficulté dont d ≤ r : k = floor(1 + (r − 1000) / 100), bornée à 1–5.
// Ainsi p est toujours au moins 50 % et vaut 50 à 64 % entre deux paliers ; en bas de l'échelle
// (r < 1000, difficulté 1 imposée) p monte au-dessus de 64 %, jusqu'à ~90 % pour r = 800 :
// la zone visée (60–80 %) n'est atteinte qu'au milieu de l'échelle. Elle ne peut pas l'être en haut :
// la difficulté 5 (d = 1400) donne 50 % à r = 1400 et plus au-delà.
// Monotone en r ; 1 pour r ≤ 1000, 5 pour r ≥ 1400.
export function difficulteCible(r, parametres) {
  const P = fusion(parametres);
  const k = Math.floor((r - P.difficulteBase) / P.difficultePas + 1e-9);
  return Math.min(5, Math.max(1, k));
}

const ORDRE = { 'a-consolider': 0, 'en-cours': 1, decouverte: 2, acquis: 3 };

// Notions à réviser, de la plus urgente à la moins urgente :
// a-consolider, puis en-cours par r croissant, puis decouverte, puis acquis (les plus anciennes d'abord).
// Le classement est déjà calculé « à maintenant » par `classer` ; `maintenant` n'est donc utile qu'à
// départager les notions à égalité : la moins pratiquée récemment passe avant.
export function notionsAReviser(classement, { maintenant = Date.now() } = {}) {
  const age = (n) => (Number.isFinite(Date.parse(n.dernierItem)) ? maintenant - Date.parse(n.dernierItem) : 0);
  return Object.entries(classement || {})
    .sort(([ia, a], [ib, b]) => (ORDRE[a.etat] ?? 9) - (ORDRE[b.etat] ?? 9)
      || (a.etat === 'en-cours' ? a.r - b.r : 0) || age(b) - age(a) || (ia < ib ? -1 : ia > ib ? 1 : 0))
    .map(([notion]) => notion);
}
