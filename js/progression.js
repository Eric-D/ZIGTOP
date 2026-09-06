// Sauvegarde locale des progrès (aucune donnée ne quitte l'appareil).

const CLE = 'mathoo.v1';

const vide = () => ({
  prenom: '',
  avatar: '🦊',
  classe: '',           // 'cp', 'ce1', 'ce2'…
  etoiles: 0,
  modules: {},          // « classe:module » -> { reussites, essais, etoiles, niveau }
  jours: [],            // dates ISO (AAAA-MM-JJ) des jours d'entraînement
  serieJours: 0,
  badges: [],
  jardin: [],           // identifiants des décors achetés, dans l'ordre de plantation
  etoilesDepensees: 0,
  son: true,
});

let etat = charger();

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return vide();
    return { ...vide(), ...JSON.parse(brut) };
  } catch {
    return vide();
  }
}

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch { /* mode privé : on continue sans sauvegarde */ }
}

export const get = () => etat;

export function setProfil({ prenom, avatar, classe }) {
  if (prenom !== undefined) etat.prenom = prenom;
  if (avatar !== undefined) etat.avatar = avatar;
  if (classe !== undefined) etat.classe = classe;
  sauver();
}

// `cle` vaut « classe:module », par exemple « ce1:tables ».
// Étoiles encore disponibles pour décorer le jardin.
export const etoilesDisponibles = () => Math.max(0, etat.etoiles - (etat.etoilesDepensees || 0));

export function acheterDecor(id, prix) {
  if (etoilesDisponibles() < prix) return false;
  etat.etoilesDepensees = (etat.etoilesDepensees || 0) + prix;
  etat.jardin.push(id);
  sauver();
  return true;
}

export function basculerSon() {
  etat.son = !etat.son;
  sauver();
  return etat.son;
}

export function statsModule(cle) {
  return etat.modules[cle] || { reussites: 0, essais: 0, etoiles: 0, niveau: 1 };
}

// Étoiles cumulées sur une classe entière.
export function etoilesClasse(classeId) {
  return Object.entries(etat.modules)
    .filter(([k]) => k.startsWith(classeId + ':'))
    .reduce((n, [, m]) => n + m.etoiles, 0);
}

// Difficulté adaptative : on monte quand l'enfant réussit bien, on redescend en douceur.
export function difficulte(cle) {
  const s = statsModule(cle);
  return Math.min(3, Math.max(1, s.niveau));
}

export function enregistrerReponse(cle, juste) {
  const s = statsModule(cle);
  s.essais += 1;
  if (juste) {
    s.reussites += 1;
    s.etoiles += 1;
    etat.etoiles += 1;
  }
  // Ajustement du niveau sur les 8 derniers résultats environ.
  const taux = s.reussites / Math.max(1, s.essais);
  if (s.essais >= 8) {
    if (taux > 0.85 && s.niveau < 3) { s.niveau += 1; s.essais = 0; s.reussites = 0; }
    else if (taux < 0.45 && s.niveau > 1) { s.niveau -= 1; s.essais = 0; s.reussites = 0; }
  }
  etat.modules[cle] = s;
  sauver();
}

export function marquerJour() {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (etat.jours.includes(aujourdhui)) return;
  etat.jours.push(aujourdhui);
  etat.jours = etat.jours.slice(-400);
  // Série de jours consécutifs
  const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  etat.serieJours = etat.jours.includes(hier) ? (etat.serieJours || 0) + 1 : 1;
  sauver();
}

const BADGES = [
  { id: 'premier', emoji: '🌱', titre: 'Premier pas', test: (e) => e.etoiles >= 1 },
  { id: 'dix', emoji: '⭐', titre: '10 étoiles', test: (e) => e.etoiles >= 10 },
  { id: 'cinquante', emoji: '🌟', titre: '50 étoiles', test: (e) => e.etoiles >= 50 },
  { id: 'cent', emoji: '🏆', titre: '100 étoiles', test: (e) => e.etoiles >= 100 },
  { id: 'serie3', emoji: '🔥', titre: '3 jours de suite', test: (e) => e.serieJours >= 3 },
  { id: 'serie7', emoji: '🚀', titre: '7 jours de suite', test: (e) => e.serieJours >= 7 },
  { id: 'explorateur', emoji: '🧭', titre: 'Explorateur', test: (e) => Object.keys(e.modules).length >= 5 },
  { id: 'expert', emoji: '🎓', titre: 'Niveau costaud', test: (e) => Object.values(e.modules).some((m) => m.niveau >= 3) },
  { id: 'jardinier', emoji: '🌻', titre: 'Jardinier', test: (e) => e.jardin.length >= 5 },
  { id: 'paysagiste', emoji: '🌈', titre: 'Paysagiste', test: (e) => e.jardin.length >= 12 },
];

export function badgesGagnes() {
  return BADGES.filter((b) => etat.badges.includes(b.id));
}

export function tousLesBadges() {
  return BADGES.map((b) => ({ ...b, gagne: etat.badges.includes(b.id) }));
}

// Renvoie les badges tout juste débloqués (pour les fêter).
export function verifierBadges() {
  const nouveaux = BADGES.filter((b) => !etat.badges.includes(b.id) && b.test(etat));
  if (nouveaux.length) {
    etat.badges.push(...nouveaux.map((b) => b.id));
    sauver();
  }
  return nouveaux;
}

export function reinitialiser() {
  etat = vide();
  sauver();
}
