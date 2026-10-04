// Une seule formulation, la commune : formulation() la renvoie toujours, l'interface ne propose plus de
// choix de méthode (ni dans les réglages, ni au pas 2), un ancien réglage enregistré est ignoré, et aucun
// rendu ne cite de support.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, tirer, rendre, formulation, optionsParDefaut } from '../js/fiches.js';
import { composer, rendrePanache } from '../js/panache.js';
import { items } from '../js/items.js';
import { recharger } from '../js/progression.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const MOT = new RegExp(['liv', 'ret'].join(''), 'i');   // le mot retiré, sans l'écrire en clair
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

/* 1. formulation() renvoie toujours commune ------------------------------------------------- */
verifier(FICHES.every((f) => ['commune', 'inconnue', undefined, null, '', ['liv', 'ret'].join('')].every((nom) => formulation(f, nom) === f.formulations.commune)),
  'formulation(fiche, nom) renvoie toujours commune, quel que soit le nom demandé');
verifier(formulation({ id: 'x' }, 'commune') === null && formulation(null) === null, 'une fiche sans formulations renvoie null');

/* 2. Réglages : plus de bloc « Formulation des méthodes » ------------------------------------ */
w = await ouvrir('');
d = w.document;
clic(d.querySelector('[data-aller="reglages"]'));
const titres = [...d.querySelectorAll('.section-titre')].map((t) => t.textContent.trim());
verifier(titres.length > 0 && !titres.some((t) => /formulation|méthode/i.test(t)), 'Réglages : plus de bloc « Formulation des méthodes »');
verifier(!d.querySelector('[data-reglage="formulation"]') && !MOT.test(d.body.textContent), 'Réglages : aucun bouton de formulation, aucun mot retiré');

/* 3. Tunnel : plus de choix de méthode au pas 2 ---------------------------------------------- */
for (const id of ['ce2-donnees', 'ce2-masses-contenances', soustraction.id]) {
  w = await ouvrir('');
  d = w.document;
  clic(d.querySelector('[data-aller="fiches"]'));
  clic(d.querySelector(`[data-fiche="${id}"]`));
  continuer();
  verifier(etape() === '2' && !d.querySelector('#choix-formulation') && !d.querySelector('[data-reglage="formulation"]') && !/Méthode :/.test(d.body.textContent),
    `pas 2 : plus de choix de méthode (${id})`);
  verifier(!!d.querySelector('#code-composition'), `pas 2 : le code est toujours affiché (${id})`);
}
w = await ouvrir('');
d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
clic(d.querySelector(`[data-fiche="${soustraction.id}"]`));
continuer();
const codeSous = codeAffiche();
continuer();
verifier(etape() === '3' && /^Je sais poser et effectuer/.test(d.querySelector('#impression .objectif').textContent.trim()), 'pas 3 : l’objectif est celui de la formulation commune');
verifier(!d.querySelector('#impression .barre') && !!d.querySelector('#impression .ret-petite'), 'pas 3 : retenues de la méthode commune (rien de barré)');
verifier(!MOT.test(d.querySelector('#impression').textContent), 'pas 3 : aucun mot retiré sur la feuille');
verifier(codeSous === d.querySelector('.feuille__code').textContent.trim(), 'le code affiché au pas 2 est celui de la feuille');

/* 4. Un ancien réglage enregistré est ignoré ------------------------------------------------- */
const ANCIEN = ['liv', 'ret'].join('');
const code = tirer(addition, {}, 123456).code;
const rendus = [];
for (const reglages of [{}, { formulation: 'commune' }, { formulation: ANCIEN }]) {
  w = await ouvrir(`?fiche=${code}`, reglages);
  d = w.document;
  const t = d.querySelector('.objectif').textContent;
  verifier(d.querySelector('.feuille__code').textContent.trim() === code && /effectuer/.test(t) && !MOT.test(d.body.textContent), `lien ?fiche=${code} avec le réglage ${JSON.stringify(reglages).replace(MOT, '…')} : formulation commune, sans erreur`);
  rendus.push(d.querySelector('.feuille').innerHTML);
}
verifier(rendus[0] === rendus[1] && rendus[1] === rendus[2], 'un ancien réglage enregistré ne change rien au rendu');
w = await ouvrir('', { formulation: ANCIEN });
d = w.document;
clic(d.querySelector('[data-aller="reglages"]'));
verifier(!d.querySelector('[data-reglage="formulation"]'), 'Réglages : un ancien réglage enregistré ne fait rien apparaître');

/* 5. Aucun rendu ne contient le mot retiré --------------------------------------------------- */
let trouve = [];
for (const f of FICHES) {
  for (const methode of [true, false]) {
    const c = tirer(f, optionsParDefaut(f), 7);
    const h = rendre(f, c, { corrige: true, methode, base: 'http://x/', formulation: ANCIEN });
    if (MOT.test(h)) trouve.push(f.id);
    if (h !== rendre(f, c, { corrige: true, methode, base: 'http://x/' })) trouve.push(`${f.id} (formulation demandée)`);
  }
}
verifier(trouve.length === 0, `fiches : aucun rendu ne contient le mot retiré, et une formulation inconnue donne la commune${trouve.length ? ' — ' + trouve.join(', ') : ''}`);
const compo = composer({ notions: [{ id: addition.id, options: {} }, { id: soustraction.id, options: {} }, { id: FICHES[11].id, options: {} }], graine: 5, miniRappel: true });
verifier(!MOT.test(rendrePanache(compo.feuilles)) && !MOT.test(rendrePanache(compo.feuilles, { formulation: ANCIEN })), 'feuille panachée : aucun mot retiré');
let aides = 0, nbItems = 0;
for (const f of FICHES) for (const it of items(f.id, { graine: 3, formulation: ANCIEN })) { nbItems++; if (MOT.test(JSON.stringify(it))) aides++; }
verifier(nbItems > 100 && aides === 0, `items et aides : aucun mot retiré (${nbItems} items)`);

/* 6. Feuille panachée à l'écran : le mini-rappel est celui de la formulation commune --------- */
w = await ouvrir('');
d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
for (const f of [addition, soustraction, FICHES[11]]) clic(d.querySelector(`[data-fiche="${f.id}"]`));
continuer();
clic(d.querySelector('[data-compo="mini"][data-valeur="oui"]'));
verifier(!d.querySelector('#choix-formulation'), 'pas 2 (feuille panachée) : plus de choix de méthode');
continuer();
const rappels = [...d.querySelectorAll('#impression .rappels li')].map((li) => li.textContent.replace(/^Exercice \d+\.\s*/, '').trim());
verifier(rappels.length === 3 && rappels[0] === 'Je sais poser et effectuer des additions avec des nombres inférieurs à 10 000.'
  && rappels[2] === 'Je connais les relations entre unités de masse et de contenance, et je sais les convertir.', `mini-rappel panaché en commune (${rappels[0]} / ${rappels[2]})`);
verifier(!MOT.test(d.querySelector('#impression').textContent), 'feuille panachée à l’écran : aucun mot retiré');

process.exit(echecs ? 1 : 0);
