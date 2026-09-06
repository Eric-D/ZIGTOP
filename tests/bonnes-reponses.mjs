// Vérifie le chemin « bonne réponse » : étoiles, confettis, progression, montée de niveau.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;
const dom = new JSDOM(fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'), { url: 'http://localhost:8765/' });
const { window } = dom;
globalThis.window = window; globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
window.matchMedia = () => ({ matches: true });
globalThis.matchMedia = window.matchMedia;
window.scrollTo = () => {};
await import(new URL('../js/app.js', import.meta.url).href);
const d = window.document, q = (s) => d.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const taper = (n) => { for (const ch of String(n)) click(q(`[data-touche="${ch}"]`)); click(q('[data-touche="ok"]')); };

q('#prenom').value = 'Lina'; click(q('#commencer'));
for (let serie = 0; serie < 3; serie++) {
  click(d.querySelector('[data-jouer="tables"]'));
  for (let i = 0; i < 10; i++) {
    const t = q('.question__texte').textContent;
    let m;
    if (d.querySelector('[data-choix]')) {
      const attendu = eval(t.replace(/×/g, '*').replace(' = ?', ''));
      click([...d.querySelectorAll('[data-choix]')].find((b) => +b.dataset.choix === attendu));
    }
    else if ((m = t.match(/^(\d+) × (\d+) = \?$/))) taper(+m[1] * +m[2]);
    else if ((m = t.match(/^(\d+) × \? = (\d+)$/))) taper(+m[2] / +m[1]);
    if (!q('#suivant')) throw new Error('pas de retour après validation : ' + t);
    if (!q('.retour--bravo')) throw new Error('réponse juste non reconnue : ' + t + ' → ' + q('.retour__aide').textContent);
    click(q('#suivant'));
  }
  console.log(`série ${serie + 1} :`, q('.bilan__detail').textContent.trim(), '|', q('.bilan__phrase').textContent);
  click(q('[data-aller="accueil"]'));
}
const e = JSON.parse(window.localStorage.getItem('mathoo.v1'));
console.log('étoiles totales :', e.etoiles, '| niveau tables :', e.modules.tables.niveau, '| badges :', e.badges.join(', '));
