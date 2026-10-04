// Le jardin : on gagne des étoiles, on les dépense en décors, et rien ne casse
// quand il en manque (Zigo encourage au lieu de bloquer).
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;
const dom = new JSDOM(fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'), { url: 'http://localhost/' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: true });
globalThis.matchMedia = window.matchMedia;

// On démarre avec des étoiles déjà gagnées, pour tester la boutique directement.
window.localStorage.setItem('mathoo.v1', JSON.stringify({
  prenom: 'Lina', avatar: '🐼', classe: 'ce1', etoiles: 12,
  modules: {}, jours: [], serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true,
}));

await import(new URL('../js/app.js', import.meta.url).href);

const d = window.document;
const q = (s) => d.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

click(q('[data-aller="jardin"]'));
verifier(!!q('.scene-jardin'), 'le jardin s’affiche');
verifier(d.querySelectorAll('.graine').length >= 10, `${d.querySelectorAll('.graine').length} graines en boutique`);

click(q('[data-decor="fleur"]'));      // 3 étoiles
click(q('[data-decor="tournesol"]'));  // 5 étoiles
let e = JSON.parse(window.localStorage.getItem('mathoo.v1'));
verifier(e.jardin.join(',') === 'fleur,tournesol', `plantés : ${e.jardin.join(', ')}`);
verifier(e.etoilesDepensees === 8, `8 étoiles dépensées (${e.etoilesDepensees}), il en reste 4`);
verifier(d.querySelectorAll('.pousse').length === 2, 'les deux pousses sont dessinées');

// Trop cher : on doit être encouragé, pas bloqué ni débité.
click(q('[data-decor="fusee"]'));      // 80 étoiles
e = JSON.parse(window.localStorage.getItem('mathoo.v1'));
verifier(e.jardin.length === 2 && e.etoilesDepensees === 8, 'un décor trop cher ne débite rien');
verifier(/manque encore 76 étoiles/.test(q('.bulle').textContent), `Zigo dit : « ${q('.bulle').textContent} »`);

const texte = d.body.textContent.toLowerCase();
verifier(!['faux', 'erreur', 'impossible', 'interdit'].some((m) => texte.includes(m)), 'aucun mot négatif dans le jardin');

process.exit(echecs ? 1 : 0);
