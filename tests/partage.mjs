// Partage par lien : un corrigé doit s'ouvrir sans compte, sans profil, sans réseau.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

// Ouvre l'application à une adresse donnée, avec ou sans profil enregistré.
async function ouvrir(recherche, profil) {
  const dom = new JSDOM(HTML, { url: `http://localhost/index.html${recherche}` });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  if (profil) window.localStorage.setItem('mathoo.v1', JSON.stringify(profil));
  await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  return window.document;
}

const profil = {
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {},
};

/* 1. On fabrique une fiche et on récupère ses liens ---------------- */

let d = await ouvrir('', profil);
d.querySelector('[data-aller="fiches"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const codes = [...d.querySelectorAll('.feuille__code')].map((e) => e.textContent.trim());
const code = codes[0];
const lienCorrige = d.querySelector('#lien-corrige').value;
const lienComplet = d.querySelector('#lien-fiche').value;
verifier(lienCorrige.includes(`fiche=${code}`) && lienCorrige.includes('vue=corrige'),
  `lien du corrigé : ${lienCorrige.replace('http://localhost/', '…/')}`);
verifier(!lienComplet.includes('vue='), 'le lien de la fiche complète n’impose pas de vue');
verifier(!lienCorrige.includes('Lina') && !/prenom|nom=[A-Za-z]/.test(lienCorrige),
  'aucun prénom ni donnée personnelle dans le lien');

/* 2. Le lien du corrigé s'ouvre sans profil ----------------------- */

d = await ouvrir(`?fiche=${code}&vue=corrige`, null);
const feuilles = d.querySelectorAll('.feuille');
verifier(feuilles.length === 1 && feuilles[0].classList.contains('feuille--corrige'),
  'sans aucun profil, le lien ouvre le corrigé seul');
verifier(!d.querySelector('#commencer'), 'on n’est pas renvoyé vers la création de profil');
verifier(d.querySelector('.feuille__code').textContent.trim() === code, 'c’est bien la même fiche');
verifier(d.querySelectorAll('.pose__resultat .reponse').length > 0, 'les réponses sont visibles');
verifier(!d.body.textContent.includes('Nom :'), 'le corrigé partagé n’a pas de ligne Nom / Date');

/* 2 bis. Le QR imprimé sur la feuille de l'enfant ne donne pas les réponses --- */

d = await ouvrir(`?fiche=${code}&vue=eleve`, null);
verifier(d.querySelectorAll('.feuille').length === 1 && !d.querySelector('.feuille--corrige'),
  'le QR de la feuille élève ouvre les exercices seuls');
verifier(d.querySelectorAll('.operations .pose__resultat .reponse').length === 0,
  'aucune réponse n’y est visible');

/* 3. Plusieurs feuilles, et les options d'affichage voyagent ------- */

d = await ouvrir('', profil);
d.querySelector('[data-aller="fiches"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
d.querySelector('[data-nb-feuilles="2"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
d.querySelector('[data-affichage="methode"][data-valeur="non"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const lienDeux = d.querySelector('#lien-corrige').value;
const deuxCodes = [...new Set([...d.querySelectorAll('.feuille__code')].map((e) => e.textContent.trim()))];
verifier(lienDeux.includes('fiches=') && lienDeux.includes(deuxCodes.join(',')), 'les deux codes sont dans le lien');
verifier(lienDeux.includes('methode=0'), 'l’absence de rappel de méthode voyage dans le lien');

d = await ouvrir(lienDeux.replace('http://localhost/index.html', ''), null);
verifier(d.querySelectorAll('.feuille').length === 2, 'le lien rouvre bien deux corrigés');
verifier(d.querySelectorAll('.feuille:first-child .operations .op').length === 12,
  'et avec le même nombre d’exercices que la feuille imprimée');

/* 4. Un lien abîmé ne casse rien ---------------------------------- */

// (Les modules restent chargés d'un cas à l'autre : le profil de l'étape 3 est encore
// en mémoire, on vérifie donc simplement qu'aucune fiche n'est ouverte.)
d = await ouvrir('?fiche=NIMPORTEQUOI', null);
verifier(!d.querySelector('.feuille'), 'un code invalide n’ouvre aucune fiche');
verifier(!!d.querySelector('[data-jouer="melange"]') || !!d.querySelector('#commencer'),
  'et l’application démarre normalement');

process.exit(echecs ? 1 : 0);
