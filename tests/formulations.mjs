// La formulation (« Comme dans la leçon » / « Formulation commune ») est un choix d'affichage :
// elle change les mots et les retenues dessinées, jamais les exercices ni les codes.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, tirer } from '../js/fiches.js';
import { recharger } from '../js/progression.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

async function ouvrir(recherche, reglages = {}) {
  const dom = new JSDOM(HTML, { url: `http://localhost/index.html${recherche}` });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  window.localStorage.setItem('mathoo.v1', JSON.stringify({
    prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [], serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages,
  }));
  recharger();   // l'état du module de progression survit d'une ouverture à l'autre : on le relit
  await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  return window;
}

const par = (id) => FICHES.find((f) => f.id === id);
const addition = par('ce2-addition-posee'), soustraction = par('ce2-soustraction-posee');
let w, d;
const clic = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const continuer = () => clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
const etape = () => d.querySelector('.tunnel').dataset.etape;
const nombresExercices = () => {
  const e = d.querySelector('#impression .feuille:not(.feuille--corrige)').cloneNode(true);
  e.querySelectorAll('.bloc--methode, .objectif, .rappels').forEach((n) => n.remove());
  return (e.textContent.match(/\d+/g) || []).join(' ');
};
const codeAffiche = () => d.querySelector('#code-composition').textContent.trim();

/* 1. Réglages : un bloc « Formulation des méthodes », commune par défaut -------------------- */
w = await ouvrir('');
d = w.document;
clic(d.querySelector('[data-aller="reglages"]'));
const titres = [...d.querySelectorAll('.section-titre')].map((t) => t.textContent.trim());
verifier(titres.includes('Formulation des méthodes'), 'Réglages : un bloc « Formulation des méthodes »');
const boutons = [...d.querySelectorAll('[data-reglage="formulation"]')];
verifier(boutons.map((b) => b.textContent.trim()).join('|') === 'Comme dans la leçon de la classe|Formulation commune', 'Réglages : « Comme dans la leçon de la classe » / « Formulation commune »');
verifier(boutons.find((b) => b.dataset.valeur === 'commune').getAttribute('aria-pressed') === 'true', 'Réglages : la formulation commune est choisie par défaut');
clic(boutons.find((b) => b.dataset.valeur === 'livret'));
verifier(JSON.parse(w.localStorage.getItem('mathoo.v1')).reglages.formulation === 'livret'
  && d.querySelector('[data-reglage="formulation"][data-valeur="livret"]').getAttribute('aria-pressed') === 'true', 'Réglages : le choix est enregistré et affiché');
clic(d.querySelector('[data-reglage="formulation"][data-valeur="commune"]'));

/* 2. Tunnel : le pas 2 propose le même choix, le pas 3 change de rendu ---------------------- */
w = await ouvrir('');
d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
clic(d.querySelector(`[data-fiche="${soustraction.id}"]`));
continuer();
verifier(etape() === '2' && !!d.querySelector('#choix-formulation'), 'pas 2 : le choix de la méthode est proposé');
verifier(/^Méthode : Formulation commune/.test(d.querySelector('#choix-formulation .reglage__libelle').textContent.trim()), 'pas 2 : « Méthode : Formulation commune » par défaut');
const codeCommune = codeAffiche();
continuer();
const commune = d.querySelector('#impression').innerHTML;
const objectifCommune = d.querySelector('#impression .objectif').textContent.trim();
const nombresCommune = nombresExercices();
verifier(/^Je sais poser et effectuer/.test(objectifCommune), `pas 3 : l’objectif est celui de la formulation commune (${objectifCommune})`);
verifier(!d.querySelector('#impression .barre') && !!d.querySelector('#impression .ret-petite'), 'pas 3 : retenues de la méthode commune (rien de barré)');

clic(d.querySelector('[data-pas="2"]'));
clic(d.querySelector('[data-reglage="formulation"][data-valeur="livret"]'));
verifier(etape() === '2' && /^Méthode : Comme dans la leçon/.test(d.querySelector('#choix-formulation .reglage__libelle').textContent.trim()), 'pas 2 : le choix change la formulation sans quitter le pas');
verifier(codeAffiche() === codeCommune, 'pas 2 : le code est le même dans les deux formulations');
continuer();
const livret = d.querySelector('#impression').innerHTML;
verifier(livret !== commune && /calculer/.test(d.querySelector('#impression .objectif').textContent) && /Je casse 1 millier/.test(d.querySelector('#impression').textContent),
  'pas 3 : le réglage « leçon de la classe » change le rendu (« Je casse 1 millier »)');
verifier(nombresExercices() === nombresCommune, 'pas 3 : les mêmes nombres dans les exercices, quelle que soit la formulation');
verifier(!!d.querySelector('#impression .barre'), 'pas 3 : en formulation du livret, le chiffre qui prête est barré');

/* 3. Un code imprimé rouvre les mêmes nombres dans les deux formulations -------------------- */
const code = tirer(addition, {}, 123456).code;
const memesNombres = [];
for (const [reglages, motCle] of [[{ formulation: 'commune' }, /effectuer/], [{ formulation: 'livret' }, /calculer/]]) {
  w = await ouvrir(`?fiche=${code}`, reglages);
  d = w.document;
  const nombres = [...d.querySelectorAll('.feuille:not(.feuille--corrige)')].map((f) => { const e = f.cloneNode(true); e.querySelectorAll('.bloc--methode, .objectif').forEach((n) => n.remove()); return (e.textContent.match(/\d+/g) || []).join(' '); }).join('|');
  verifier(d.querySelector('.feuille__code').textContent.trim() === code && motCle.test(d.querySelector('.objectif').textContent), `lien ?fiche=${code} avec le réglage ${reglages.formulation} : bonne formulation`);
  memesNombres.push(nombres);
}
verifier(memesNombres[0] === memesNombres[1], 'un même code rouvre les mêmes nombres dans les deux formulations');

/* 4. Feuille panachée : le mini-rappel suit la formulation ----------------------------------- */
w = await ouvrir('');
d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
for (const f of [addition, soustraction, FICHES[3]]) clic(d.querySelector(`[data-fiche="${f.id}"]`));
continuer();
clic(d.querySelector('[data-compo="mini"][data-valeur="oui"]'));
verifier(!!d.querySelector('#choix-formulation'), 'pas 2 (feuille panachée) : le choix de la méthode est proposé');
const codeZ = codeAffiche();
continuer();
const rappels = () => [...d.querySelectorAll('#impression .rappels li')].map((li) => li.textContent.replace(/^Exercice \d+\.\s*/, '').trim());
const rappelsCommune = rappels();
verifier(rappelsCommune.length === 3 && rappelsCommune[0] === 'Je sais poser et effectuer des additions avec des nombres inférieurs à 10 000.', `mini-rappel panaché en commune (${rappelsCommune[0]})`);
const nombresZ = nombresExercices();
clic(d.querySelector('[data-pas="2"]'));
clic(d.querySelector('[data-reglage="formulation"][data-valeur="livret"]'));
verifier(codeAffiche() === codeZ, 'feuille panachée : même code dans les deux formulations');
continuer();
const rappelsLivret = rappels();
verifier(rappelsLivret[0] === 'Je sais poser et calculer des additions avec des nombres inférieurs à 10 000.' && rappelsLivret[2] === rappelsCommune[2],
  `mini-rappel panaché en livret (${rappelsLivret[0]}), notion non convertie inchangée`);
verifier(nombresExercices() === nombresZ, 'feuille panachée : les mêmes nombres dans les deux formulations');

process.exit(echecs ? 1 : 0);
