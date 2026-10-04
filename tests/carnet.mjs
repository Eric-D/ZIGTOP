// Le carnet local : séries, fiches imprimées, appréciations, pastilles, semaine, export / import.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES } from '../js/fiches.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

const profil = {
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {},
};
async function ouvrir(stockage = profil) {
  const dom = new JSDOM(HTML, { url: 'http://localhost/index.html' });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  window.localStorage.setItem('mathoo.v1', JSON.stringify(stockage));
  (await import(new URL('../js/progression.js', import.meta.url).href)).recharger();
  const app = await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  const Carnet = await import(new URL('../js/carnet.js', import.meta.url).href);
  return { window, Carnet, app };
}
let { window: w, Carnet } = await ouvrir();
let d = w.document;
const clic = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const sauvegarde = () => JSON.parse(w.localStorage.getItem('mathoo.v1'));
const coches = () => [...d.querySelectorAll('[data-fiche]:checked')].map((e) => e.dataset.fiche);
const MOTS = /\b(faux|raté|ratée|échec|erreur|nul)\b/i;

/* (a) une série terminée ajoute un événement « serie » */
clic(d.querySelector('[data-jouer="tables"]'));
// On joue jusqu'au bilan quoi qu'il arrive : réponses quelconques, puis « continuer ».
for (let i = 0; i < 200 && !d.querySelector('.bilan'); i++) {
  const bouton = d.querySelector('#suivant');
  if (bouton) clic(bouton);
  else if (d.querySelector('[data-choix]')) clic(d.querySelector('[data-choix]'));
  else if (d.querySelector('[data-touche="1"]')) { clic(d.querySelector('[data-touche="1"]')); clic(d.querySelector('[data-touche="ok"]')); }
}
verifier(!!d.querySelector('.bilan'), 'la série arrive au bilan');
const series = sauvegarde().carnet.filter((e) => e.type === 'serie');
verifier(series.length === 1 && series[0].notion === 'ce2:tables' && Number.isInteger(series[0].donnees.etoiles) && series[0].donnees.questions > 0
  && !!series[0].id && !Number.isNaN(Date.parse(series[0].date)), 'finir une série ajoute un événement serie (ce2:tables, étoiles, questions)');
verifier(Carnet.resume()['ce2-multiplication']?.nbSeries === 1, 'le résumé rattache les tables à la multiplication');
verifier(!MOTS.test(d.body.textContent), 'bilan : aucun mot négatif');

/* (b) Imprimer au pas 3 ajoute un événement « fiche » */
let imprime = 0;
w.print = () => { imprime++; };
clic(d.querySelector('[data-aller="accueil"]'));
clic(d.querySelector('[data-aller="fiches"]'));
const ids = [FICHES[0].id, FICHES[2].id];
ids.forEach((id) => clic(d.querySelector(`[data-fiche="${id}"]`)));
clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
const codeZ = d.querySelector('#code-composition').textContent.trim();
clic(d.querySelector('.barre-pas [data-pas="3"]'));
clic(d.querySelector('#imprimer'));
const fiches = sauvegarde().carnet.filter((e) => e.type === 'fiche');
verifier(imprime === 1 && fiches.length === 1 && fiches[0].donnees.code === codeZ
  && fiches[0].donnees.notions.slice().sort().join() === ids.slice().sort().join(),
  `Imprimer ajoute un événement fiche (${codeZ}, ${ids.join(' + ')})`);

/* (c) « à revoir » : pastille au pas 1 et priorité dans la semaine */
clic(d.querySelector('[data-aller="accueil"]'));
clic(d.querySelector('[data-aller="progres"]'));
verifier(d.querySelector('#carnet') && d.querySelector(`[data-corrige="${codeZ}"]`), 'Mes progrès : la fiche imprimée figure dans le carnet, son code est cliquable');
clic(d.querySelector(`[data-appreciation="a revoir"][data-code="${codeZ}"]`));
const apprec = sauvegarde().carnet.filter((e) => e.type === 'appreciation');
verifier(apprec.length === 2 && apprec.every((e) => e.donnees.valeur === 'a revoir' && e.donnees.code === codeZ) && apprec.map((e) => e.notion).sort().join() === ids.slice().sort().join(),
  'une appréciation par notion de la feuille');
verifier(d.querySelector(`[data-appreciation="a revoir"][data-code="${codeZ}"]`).getAttribute('aria-pressed') === 'true'
  && /noté/.test(d.querySelector('#message-appreciation').textContent), 'confirmation visuelle, sans quitter l’écran');
verifier(!MOTS.test(d.body.textContent), 'Mes progrès : aucun mot négatif');
// le corrigé s'ouvre au pas 3
clic(d.querySelector(`[data-corrige="${codeZ}"]`));
verifier(d.querySelector('.tunnel').dataset.etape === '3' && !!d.querySelector('#impression .feuille--corrige') && !d.querySelector('#impression .feuille:not(.feuille--corrige)'),
  'le code ouvre le corrigé seul, au pas 3');
clic(d.querySelector('[data-pas="1"].ariane__pas'));
verifier(d.querySelector('.tunnel').dataset.etape === '1', 'retour au pas 1');
const pastilles = [...d.querySelectorAll('.pastille-carnet--a-revoir')];
verifier(pastilles.length === 2, `pastille « à revoir » sous les 2 notions (${pastilles.length})`);
verifier(/vu le \d{1,2} /.test(d.querySelector(`[data-fiche="${ids[0]}"]`).closest('.fiche').textContent), 'et « vu le … »');
verifier(!MOTS.test(d.body.textContent), 'pas 1 : aucun mot négatif');
// la semaine : les deux notions à revoir sont toujours tirées, même parmi toutes
w.localStorage.setItem('mathoo.v1', JSON.stringify({ ...sauvegarde(), derniereSelection: [], notionVue: null, tirages: {} }));
let tousPris = true;
for (let k = 0; k < 6; k++) {
  ({ window: w, Carnet } = await ouvrir(JSON.parse(w.localStorage.getItem('mathoo.v1'))));
  d = w.document;
  clic(d.querySelector('[data-aller="fiches"]'));
  clic(d.querySelector('[data-semaine]'));
  const t = coches();
  if (!(t.length === 4 && ids.every((id) => t.includes(id)))) tousPris = false;
  w.localStorage.setItem('mathoo.v1', JSON.stringify({ ...JSON.parse(w.localStorage.getItem('mathoo.v1')), tirages: {} }));
}
verifier(tousPris, 'la semaine : les notions à revoir passent toujours en premier');

/* (d) export puis import dans un localStorage vierge */
const avant = Carnet.evenements();
const json = Carnet.exporter();
const doc = JSON.parse(json);
verifier(doc.version === 1 && Array.isArray(doc.carnet) && doc.progression && 'modules' in doc.progression, 'l’export contient version, carnet, progression');
({ window: w, Carnet } = await ouvrir({ ...profil, prenom: 'Autre', reglages: { police: 'dys' } }));
const n1 = Carnet.importer(json);
verifier(n1 === avant.length && JSON.stringify(Carnet.evenements()) === JSON.stringify(avant), `l’import redonne le même carnet (${n1} événements)`);
verifier(Carnet.importer(json) === 0 && Carnet.evenements().length === avant.length, 'un second import n’ajoute rien');
const apres = JSON.parse(w.localStorage.getItem('mathoo.v1'));
verifier(apres.prenom === 'Autre' && apres.reglages.police === 'dys', 'les réglages locaux ne sont pas écrasés');
verifier(Carnet.importer('pas du json') === -1 && Carnet.importer('{"a":1}') === -1, 'un fichier invalide est refusé');
// fusion de la progression : max des étoiles
({ window: w, Carnet } = await ouvrir({ ...profil, etoiles: 9, modules: { 'ce2:tables': { reussites: 1, essais: 1, etoiles: 9, niveau: 2 } }, jours: ['2026-10-01'] }));
Carnet.importer(JSON.stringify({ version: 1, carnet: [], progression: { etoiles: 5, modules: { 'ce2:tables': { etoiles: 5, niveau: 1 }, 'ce2:addition': { etoiles: 3, niveau: 1 } }, jours: ['2026-10-02'] } }));
const prog = JSON.parse(w.localStorage.getItem('mathoo.v1'));
verifier(prog.modules['ce2:tables'].etoiles === 9 && prog.modules['ce2:addition'].etoiles === 3 && prog.jours.join() === '2026-10-01,2026-10-02' && prog.etoiles === 9,
  'la progression garde le max des étoiles par module et réunit les jours');

/* export depuis l'écran : lien blob: et nom du fichier */
d = w.document;
let lien = null;
w.HTMLAnchorElement.prototype.click = function () { lien = { href: this.href, download: this.download }; };
clic(d.querySelector('[data-aller="progres"]'));
clic(d.querySelector('#exporter-carnet'));
verifier(lien && /^blob:/.test(lien.href) && /^mathoo-carnet-\d{4}-\d{2}-\d{2}\.json$/.test(lien.download), `« Exporter mon carnet » télécharge ${lien && lien.download}`);

/* (e) aucun mot négatif, dans tous les écrans visités */
verifier(!MOTS.test(d.body.textContent), 'aucun mot de la liste (faux, raté, échec, erreur, nul) à l’écran');

process.exit(echecs ? 1 : 0);
