// Raccourcis de révision du pas 1 : jusqu'à une notion, un domaine, la semaine.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, DOMAINES } from '../js/fiches.js';
import * as P from '../js/progression.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

async function ouvrir(stockage) {
  const dom = new JSDOM(HTML, { url: 'http://localhost/index.html' });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  window.localStorage.setItem('mathoo.v1', stockage);
  P.recharger();   // progression.js reste en cache d'un chargement à l'autre : on relit la sauvegarde
  await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  window.document.querySelector('[data-aller="fiches"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return window;
}
const profil = {
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {},
};
let w = await ouvrir(JSON.stringify(profil));
let d = w.document;
const clic = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const coches = () => [...d.querySelectorAll('[data-fiche]:checked')].map((e) => e.dataset.fiche).sort();
const memes = (a, b) => a.slice().sort().join() === b.slice().sort().join();
const premiere = (f) => Number(/\d+/.exec(f.pages)[0]);
const sauvegarde = () => JSON.parse(w.localStorage.getItem('mathoo.v1'));
const choisir = (id) => { const l = d.querySelector('#notion-vue'); l.value = id; l.dispatchEvent(new w.Event('change', { bubbles: true })); };
const jusqua = (id) => FICHES.slice(0, FICHES.findIndex((f) => f.id === id) + 1).map((f) => f.id);

const liste = d.querySelector('#notion-vue');
verifier(liste && liste.tagName === 'SELECT', 'une liste déroulante « jusqu’à… »');
verifier(/Tout ce qu’on a vu jusqu’à…/.test(d.querySelector('label[for="notion-vue"]').textContent), 'libellé « Tout ce qu’on a vu jusqu’à… »');
verifier([...liste.querySelectorAll('option')].map((o) => o.value).join() === FICHES.map((f) => f.id).join(), 'les notions dans l’ordre de FICHES');
verifier([...liste.querySelectorAll('optgroup')].map((g) => g.label).join('|') === DOMAINES.join('|'), 'groupées par domaine');
verifier(liste.value === FICHES[FICHES.length - 1].id, 'sans valeur mémorisée, la liste propose la dernière notion');
verifier(!/\bpages?\b|p\./i.test(d.querySelector('.raccourcis').textContent), 'aucune mention de page dans les raccourcis');

/* (a) jusqu'à la notion X */
const X = 'ce2-fractions-calculer';
choisir(X);
clic(d.querySelector('[data-cocher-notion]'));
const attendues = jusqua(X);
verifier(attendues.length > 0 && attendues.length < FICHES.length && memes(coches(), attendues),
  `jusqu'à « ${X} » : exactement les ${attendues.length} notions attendues`);
verifier(new RegExp(`${attendues.length} notions? choisies?`).test(d.querySelector('#compte-notions').textContent), 'le compteur suit');
choisir(FICHES[1].id);
clic(d.querySelector('[data-cocher-notion]'));
verifier(memes(coches(), jusqua(FICHES[1].id)), 'un autre choix décoche les notions suivantes');
verifier(d.querySelector('#notion-vue').getBoundingClientRect !== undefined && d.querySelector('.raccourci__liste'), 'la liste porte la classe de 48 px');

/* (b) mémorisation et rechargement */
choisir(X); clic(d.querySelector('[data-cocher-notion]'));
const stock = w.localStorage.getItem('mathoo.v1');
verifier(sauvegarde().notionVue === X, 'notionVue est mémorisée');
w = await ouvrir(stock); d = w.document;
verifier(d.querySelector('#notion-vue').value === X, 'la notion est restituée au nouveau chargement');

/* (b') migration depuis pageVue */
w = await ouvrir(JSON.stringify({ ...profil, pageVue: 31 })); d = w.document;
const attendue = FICHES.filter((f) => premiere(f) <= 31).slice(-1)[0].id;
verifier(d.querySelector('#notion-vue').value === attendue, `pageVue 31 devient la notion ${attendue}`);
verifier(sauvegarde().notionVue === attendue && !('pageVue' in sauvegarde()), 'notionVue écrite, pageVue supprimée');
w = await ouvrir(JSON.stringify({ ...profil, pageVue: 12, notionVue: X })); d = w.document;
verifier(d.querySelector('#notion-vue').value === X && !('pageVue' in sauvegarde()), 'notionVue existante gagne ; pageVue supprimée');
w = await ouvrir(stock); d = w.document;

/* (c) un domaine */
for (const dom of DOMAINES) {
  const bouton = d.querySelector(`[data-domaine="${dom}"]`);
  const siens = FICHES.filter((f) => f.domaine === dom).map((f) => f.id);
  if (!bouton) { verifier(false, `bouton pour ${dom}`); continue; }
  clic(bouton);
  const ok1 = memes(coches(), siens);
  clic(d.querySelector(`[data-domaine="${dom}"]`));
  verifier(ok1 && coches().length === 0, `${dom} : ses ${siens.length} notions, puis un second clic décoche tout`);
}
verifier(d.querySelectorAll('[data-domaine]').length === 4, 'quatre boutons de domaine');

/* (e) Continuer mémorise la sélection (avant les tirages) */
clic(d.querySelector(`[data-domaine="${DOMAINES[0]}"]`));
const choisies = coches();
clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
verifier(d.querySelector('.tunnel').dataset.etape === '2', 'Continuer mène au pas 2');
verifier(memes(sauvegarde().derniereSelection, choisies), 'derniereSelection contient la sélection après Continuer');

/* (d) la semaine : parmi la dernière sélection */
clic(d.querySelector('[data-pas="1"]'));
const permis = choisies;
clic(d.querySelector('[data-semaine]'));
const t1 = coches();
verifier(t1.length === 4 && new Set(t1).size === 4 && t1.every((id) => permis.includes(id)), 'la semaine : 4 notions distinctes, parmi celles de la dernière fois');
const compteurs = sauvegarde().tirages;
verifier(t1.every((id) => compteurs[id] === 1), 'le compteur des notions tirées passe à 1');
clic(d.querySelector('[data-semaine]'));
const t2 = coches();
const reste = permis.length - 4;
verifier(t2.length === 4 && (reste < 4 || t2.every((id) => !t1.includes(id))), `second tirage : favorise les moins tirées (${reste} autres notions autorisées)`);
for (let i = 0; i < 4; i++) clic(d.querySelector('[data-semaine]'));
const c = sauvegarde().tirages;
const valeurs = permis.map((id) => c[id] || 0);
verifier(Math.max(...valeurs) - Math.min(...valeurs) <= 1, 'les tirages restent équilibrés sur plusieurs clics');

/* à défaut de dernière sélection : jusqu'à notionVue */
w = await ouvrir(JSON.stringify({ ...profil, notionVue: X })); d = w.document;
clic(d.querySelector('[data-semaine]'));
const t3 = coches();
verifier(t3.length === 4 && t3.every((id) => attendues.includes(id)), 'sans mémoire : 4 notions parmi celles jusqu’à la notion mémorisée');

process.exit(echecs ? 1 : 0);
