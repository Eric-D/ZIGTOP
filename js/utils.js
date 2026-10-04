// Petites fonctions utilitaires partagées par les générateurs d'exercices.

// Source de hasard remplaçable : par défaut le hasard du navigateur, mais on peut
// y brancher un générateur à graine pour rejouer exactement la même fiche.
let sourceAlea = Math.random;
export const setAlea = (f) => { sourceAlea = f || Math.random; };
export const alea = () => sourceAlea();

// Générateur déterministe (mulberry32) : une graine, toujours la même suite.
export function generateurAleatoire(graine) {
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rnd = (min, max) => Math.floor(alea() * (max - min + 1)) + min;

export const pick = (arr) => arr[Math.floor(alea() * arr.length)];

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Espace fine insécable pour les milliers : 4 726
export const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function centaineEnLettres(n) {
  // 0 <= n < 1000
  if (n < 20) return UNITES[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 7 || d === 9) {
      const reste = UNITES[10 + u];
      return DIZAINES[d] + (u === 1 && d === 7 ? '-et-onze' : '-' + reste);
    }
    if (u === 0) return DIZAINES[d] + (d === 8 ? 's' : '');
    if (u === 1 && d !== 8) return DIZAINES[d] + '-et-un';
    return DIZAINES[d] + '-' + UNITES[u];
  }
  const c = Math.floor(n / 100);
  const reste = n % 100;
  let tete = c === 1 ? 'cent' : UNITES[c] + '-cent';
  if (reste === 0) return c === 1 ? 'cent' : tete + 's';
  return tete + '-' + centaineEnLettres(reste);
}

// 0 -> 9999 en toutes lettres (orthographe rectifiée, traits d'union).
export function enLettres(n) {
  if (n < 1000) return centaineEnLettres(n);
  const milliers = Math.floor(n / 1000);
  const reste = n % 1000;
  const tete = milliers === 1 ? 'mille' : centaineEnLettres(milliers) + '-mille';
  return reste === 0 ? tete : tete + '-' + centaineEnLettres(reste);
}

// Génère des propositions plausibles autour de la bonne réponse.
export function leurres(bonne, n = 3, ecart = 10, min = 0) {
  const set = new Set([bonne]);
  let garde = 0;
  while (set.size < n + 1 && garde++ < 200) {
    const delta = rnd(1, ecart) * (alea() < 0.5 ? -1 : 1);
    const v = bonne + delta;
    if (v >= min) set.add(v);
  }
  return shuffle([...set]);
}
