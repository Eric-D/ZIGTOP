// Le tunnel de génération : 1 Que réviser → 2 Composer → 3 Imprimer et partager.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES } from '../js/fiches.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

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
  return window;
}
const profil = {
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {},
};

let w = await ouvrir('', profil);
let d = w.document;
const clic = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const etape = () => d.querySelector('.tunnel').dataset.etape;
const coches = () => [...d.querySelectorAll('[data-fiche]:checked')].map((e) => e.dataset.fiche);
const continuer = () => clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
const ids = [FICHES[0].id, FICHES[2].id, FICHES[9].id];

/* (a) trois notions → composer → imprimer → le code rouvre la même feuille */
clic(d.querySelector('[data-aller="fiches"]'));
verifier(etape() === '1' && w.location.search === '?pas=1', 'l’écran des fiches s’ouvre au pas 1 (?pas=1)');
verifier(d.querySelector('.barre-pas [data-pas="2"]').disabled, 'Continuer attend une notion cochée');
ids.forEach((id) => clic(d.querySelector(`[data-fiche="${id}"]`)));
verifier(coches().length === 3 && /3 notions choisies/.test(d.querySelector('#compte-notions').textContent), 'trois cases cochées, « 3 notions choisies »');
verifier(d.querySelectorAll('.fiche__options .option').length >= 1, 'les options de la notion cochée apparaissent sous sa ligne');
continuer();
verifier(etape() === '2' && w.location.search === '?pas=2', 'Continuer mène au pas 2');
const codeZ = d.querySelector('#code-composition').textContent.trim();
verifier(/^Z/.test(codeZ), `le pas 2 affiche un code Z (${codeZ})`);
verifier(!!d.querySelector('[data-compo="mini"]') && !!d.querySelector('[data-nb-feuilles="4"]') && !d.querySelector('[data-compo="rotation"]'),
  'mini-rappel et nombre de feuilles ; le choix « tournent » attend plus d’une feuille');
continuer();
verifier(etape() === '3' && w.location.search === '?pas=3', 'Continuer mène au pas 3');
const titres = [...d.querySelectorAll('#impression .feuille:not(.feuille--corrige) h2')].map((h) => h.textContent.trim().split(' ')[0] + ' ' + h.textContent.trim().split(' ')[1]);
verifier(['Exercice 1', 'Exercice 2', 'Exercice 3'].every((t) => titres.includes(t)) && titres.length === 3, `l’aperçu a trois exercices (${titres.join(', ')})`);
verifier(d.querySelectorAll('#impression .feuille--corrige').length === 1, 'et un corrigé');
const html1 = d.querySelector('#impression').innerHTML;

/* aperçu à l'échelle : #impression reçoit un zoom ≤ 1, recalculé au redimensionnement */
const imp = d.querySelector('#impression');
verifier(imp.style.zoom !== '' && Number(imp.style.zoom) <= 1, `au pas 3, #impression a un zoom ≤ 1 (${imp.style.zoom})`);
Object.defineProperty(imp.parentElement, 'clientWidth', { value: 400, configurable: true });
w.dispatchEvent(new w.Event('resize'));
await new Promise((r) => setTimeout(r, 250));
verifier(Math.abs(Number(imp.style.zoom) - 400 / 673) < 0.01, `avec 400 px disponibles, le zoom vaut ≈ 400/673 (${imp.style.zoom})`);
Object.defineProperty(imp.parentElement, 'clientWidth', { value: 900, configurable: true });
w.dispatchEvent(new w.Event('resize'));
await new Promise((r) => setTimeout(r, 250));
verifier(Number(imp.style.zoom) === 1, 'et jamais au-delà de 1 sur un grand écran');
const champ = d.querySelector('#code-fiche');
champ.value = codeZ;
clic(d.querySelector('#retrouver'));
verifier(d.querySelector('#impression').innerHTML === html1, 'le code saisi rouvre exactement la même feuille');

// plusieurs feuilles qui tournent
clic(d.querySelector('[data-pas="1"]'));
verifier(etape() === '1' && coches().length === 3, 'le fil d’Ariane ramène au pas 1, sélection conservée');
continuer();
clic(d.querySelector('[data-nb-feuilles="2"]'));
verifier(!!d.querySelector('[data-compo="rotation"]'), 'avec deux feuilles, le choix mêmes notions / tournent apparaît');
const memes = d.querySelectorAll('#code-composition span').length;
clic(d.querySelector('[data-compo="rotation"][data-valeur="tournent"]'));
const spans = [...d.querySelectorAll('#code-composition span')].map((e) => e.textContent);
verifier(memes === 2 && spans.length === 2 && spans[0] !== spans[1], 'chaque feuille a son code ; si elles tournent, leurs notions diffèrent');
continuer();
const fe = d.querySelectorAll('#impression .feuille:not(.feuille--corrige)').length;
verifier(fe === 2, 'l’aperçu montre deux feuilles');

/* (b) une seule notion = la fiche complète */
w = await ouvrir('', profil); d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
clic(d.querySelector(`[data-fiche="${FICHES[3].id}"]`));
continuer();
const codeSimple = d.querySelector('#code-composition').textContent.trim();
verifier(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(codeSimple) && codeSimple[0] === '3', `une notion : code de fiche court (${codeSimple})`);
verifier(!!d.querySelector('[data-affichage="methode"]') && !d.querySelector('[data-compo="mini"]'), 'rappel de méthode avec / sans');
continuer();
verifier(d.querySelectorAll('#impression .feuille:not(.feuille--corrige) .operations .op, #impression .feuille:not(.feuille--corrige) .bloc').length > 3
  && d.querySelector('.feuille__code').textContent.trim() === codeSimple, 'la fiche complète, avec le même code');

/* (c) un lien Z… sans profil arrive au pas 3, sur le corrigé */
w = await ouvrir(`?fiche=${codeZ}&vue=corrige`, null); d = w.document;
verifier(etape() === '3' && w.location.search === '?pas=3', 'le lien ouvre le pas 3');
verifier(d.querySelectorAll('#impression .feuille').length === 1 && !!d.querySelector('#impression .feuille--corrige'), 'sur le corrigé seul');
verifier(!d.querySelector('#commencer'), 'sans créer de profil');

/* (d) « ← Retour » depuis un lien remonte au pas 1, notions cochées */
clic(d.querySelector('.retour'));
verifier(etape() === '1' && coches().sort().join() === [...ids].sort().join(), `Retour : pas 1, les ${coches().length} notions du code sont cochées`);
w.history.back();   // jsdom : popstate asynchrone
await new Promise((r) => setTimeout(r, 50));
verifier(['1', '2', '3'].includes(etape()), 'le bouton retour du navigateur remet un pas valide (' + etape() + ')');

/* (d bis) une seule notion venue d'un code simple */
w = await ouvrir(`?fiche=${codeSimple}`, null); d = w.document;
clic(d.querySelector('.retour'));
verifier(coches().join() === FICHES[3].id, 'un code simple recoche sa notion');

/* (e) ?pas=2 sans sélection ramène au pas 1 */
w = await ouvrir('?pas=2', profil); d = w.document;
verifier(etape() === '1' && w.location.search === '?pas=1', '?pas=2 sans sélection ramène au pas 1');
w = await ouvrir('?pas=3', null); d = w.document;
verifier(etape() === '1', '?pas=3 sans sélection ramène au pas 1');

process.exit(echecs ? 1 : 0);
