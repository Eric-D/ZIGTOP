// Écran des fiches : regroupement par domaine, liens vers les leçons, ordre figé de FICHES.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, DOMAINES } from '../js/fiches.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

// Le code imprimé encode l'index : cet ordre ne change jamais, on n'ajoute qu'à la fin.
const ORDRE = [
  'ce2-addition-posee', 'ce2-soustraction-posee', 'ce2-multiplication', 'ce2-nombres-lire-ecrire',
  'ce2-nombres-comparer', 'ce2-fractions-lire', 'ce2-fractions-comparer', 'ce2-fractions-calculer',
  'ce2-monnaie', 'ce2-longueurs', 'ce2-heures', 'ce2-masses-contenances', 'ce2-durees',
  'ce2-solides', 'ce2-polygones', 'ce2-symetrie', 'ce2-donnees',
];
verifier(ORDRE.every((id, i) => FICHES[i] && FICHES[i].id === id),
  'l’ordre des 17 premières fiches est figé (on ajoute seulement à la fin)');
verifier(DOMAINES.join('|') === 'Nombres et calculs|Grandeurs et mesures|Géométrie|Gestion de données', 'DOMAINES dans l’ordre du livret');
verifier(FICHES.every((f) => DOMAINES.includes(f.domaine) && f.lecon && f.pages && /^Je /.test(f.objectif)),
  'chaque fiche a domaine, lecon, pages et objectif');

const dom = new JSDOM(HTML, { url: 'http://localhost/index.html' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: true });
globalThis.matchMedia = window.matchMedia;
window.localStorage.setItem('mathoo.v1', JSON.stringify({
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {},
}));
await import(new URL('../js/app.js', import.meta.url).href);
const d = window.document;
const clic = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
clic(d.querySelector('[data-aller="fiches"]'));

const titres = [...d.querySelectorAll('.no-print > .section-titre')].map((e) => e.textContent.trim()).slice(0, 4);
verifier(titres.join('|') === DOMAINES.join('|'), `4 titres de domaine dans l’ordre : ${titres.join(' / ')}`);
const lignes = [...d.querySelectorAll('.liste-fiches .fiche')];
verifier(lignes.length === 17, `${lignes.length} lignes de fiche`);

const base = 'https://github.com/Eric-D/ZIGTOP/blob/main/';
let liensOk = true;
for (const l of lignes) {
  const a = l.querySelector('a.fiche__lecon');
  const href = a && a.getAttribute('href');
  const ok = a && a.textContent.trim() === 'leçon' && href.startsWith(base)
    && a.target === '_blank' && a.rel.includes('noopener')
    && fs.existsSync(path.join(RACINE, href.slice(base.length)));
  if (!ok) { liensOk = false; console.log('  lien invalide :', href); }
}
verifier(liensOk, 'chaque ligne a un lien « leçon » vers un fichier existant');

// Une case cochée = une notion choisie ; Continuer ×2 mène à la fiche, au pas 3.
const cocher = (id) => clic(d.querySelector(`[data-fiche="${id}"]`));
const continuer = () => clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
verifier(d.querySelectorAll('.liste-fiches input[type="checkbox"]').length === 17, 'une case à cocher par ligne');
verifier(d.querySelector('.barre-pas [data-pas="2"]').disabled, 'Continuer attend qu’on coche une notion');
cocher(FICHES[10].id);
const actives = d.querySelectorAll('.fiche--active');
verifier(actives.length === 1 && actives[0].querySelector('[data-fiche]').dataset.fiche === FICHES[10].id,
  'la ligne cochée devient la seule ligne active');
continuer(); continuer();
const code = d.querySelector('.feuille__code').textContent.trim();
verifier(code[0] === (10).toString(36).toUpperCase(), `une seule case : la fiche complète (${code})`);

process.exit(echecs ? 1 : 0);
