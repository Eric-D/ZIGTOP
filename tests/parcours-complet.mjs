// Parcours complet, en répondant volontairement à côté :
// on vérifie que l'enfant peut toujours avancer et qu'aucun mot négatif n'apparaît.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;

const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost:8765/', pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {} }));
globalThis.matchMedia = window.matchMedia.bind(window);
globalThis.confirm = () => true;
globalThis.setTimeout = setTimeout;

await import(new URL('../js/app.js', import.meta.url).href);

const d = window.document;
const q = (s) => d.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('1. écran profil :', !!q('#commencer'));
q('#prenom').value = 'Lina';
console.log("avatars:", d.querySelectorAll("[data-avatar]").length); click(d.querySelectorAll("[data-avatar]")[1]);
click(q('#commencer'));
console.log('2. accueil, modules :', d.querySelectorAll('.module').length, '| salut :', q('.entete__bonjour').textContent);

click(q('[data-jouer="melange"]'));
console.log('3. 1re question :', q('.question__texte').textContent.slice(0, 70));

let boucles = 0;
while (!q('.bilan') && boucles++ < 60) {
  if (q('#suivant')) { click(q('#suivant')); continue; }
  const c = d.querySelector('[data-choix]');
  if (c) { click(c); continue; }
  click(q('[data-touche="7"]')); click(q('[data-touche="ok"]'));
}
console.log('4. bilan atteint en', boucles, 'clics :', q('.bilan__phrase')?.textContent);
console.log('5. sauvegarde :', window.localStorage.getItem('mathoo.v1').slice(0, 120));

// Deuxième série, en répondant juste cette fois (on triche en lisant la bonne réponse via le DOM impossible :
// on vérifie au moins qu'un thème seul démarre bien)
click(q('[data-aller="accueil"]'));
click(d.querySelector('[data-jouer="tables"]'));
console.log('6. thème seul :', q('.question__module').textContent.trim());
click(q('[data-aller="accueil"]'));
click(q('[data-aller="progres"]'));
console.log('7. progrès, badges affichés :', d.querySelectorAll('.badge').length);

const texte = d.body.textContent.toLowerCase();
const negatifs = ['faux', 'erreur', 'mauvais', 'échec', 'raté', 'nul', 'perdu'].filter((m) => texte.includes(m));
console.log('8. mots négatifs :', negatifs.length ? negatifs : 'aucun ✔');
