// Écran des fiches : regroupement par domaine, liens vers les leçons, ordre figé de FICHES.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, DOMAINES, tirer, rendre } from '../js/fiches.js';
import { composer, rendrePanache } from '../js/panache.js';

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
  const ok = a && a.textContent.trim() === 'voir la leçon' && href.startsWith(base)
    && a.target === '_blank' && a.rel.includes('noopener')
    && fs.existsSync(path.join(RACINE, href.slice(base.length)));
  if (!ok) { liensOk = false; console.log('  lien invalide :', href); }
}
verifier(liensOk, 'chaque ligne a un lien « voir la leçon » vers un fichier existant');

// Balayage : ni « page », ni « p. », ni « livret » dans l'écran ni sur les feuilles.
const INTERDIT = { test: (t) => /\b(pages?|livret)\b/i.test(t) || /(^|\s)p\.\s/.test(t) };   // « p. » en minuscule : « centre P. » est un point
const visible = (html) => { const t = new JSDOM(`<body>${html}</body>`).window.document; let s = t.body.textContent; t.querySelectorAll('[alt],[aria-label],[title]').forEach((e) => { s += ' ' + (e.getAttribute('alt') || '') + (e.getAttribute('aria-label') || '') + (e.getAttribute('title') || ''); }); return s; };
const texteEcran = d.querySelector('.tunnel').textContent + [...d.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
verifier(!INTERDIT.test(texteEcran), 'pas 1 : aucun mot « page », « p. » ou « livret »');
verifier(!d.querySelector('.fiche__pages'), 'pas 1 : plus de numéros de page sur les lignes');
const mauvais = [];
for (const f of FICHES) {
  const options = {}; (f.options || []).forEach((o) => { options[o.id] = o.valeurs[0].v; });
  for (const methode of [true, false]) {
    const t = visible(rendre(f, tirer(f, options, 424242), { methode, corrige: true, base: 'http://x/' }));
    if (INTERDIT.test(t)) mauvais.push(`${f.id}${methode ? '' : ' (sans méthode)'}`);
  }
}
verifier(mauvais.length === 0, `les ${FICHES.length} fiches, élève et corrigé : aucun mot interdit${mauvais.length ? ' : ' + mauvais.join(', ') : ''}`);
const panaches = [true, false].every((mini) => !INTERDIT.test(visible(rendrePanache(
  composer({ notions: FICHES.map((f) => ({ id: f.id })), graine: 424242, miniRappel: mini }), { corrige: true, base: 'http://x/' }))));
verifier(panaches, 'feuilles panachées (17 notions, avec et sans mini-rappel), élève et corrigé : aucun mot interdit')

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
