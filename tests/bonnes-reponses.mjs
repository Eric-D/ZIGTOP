// Chemin « bonne réponse » : étoiles comptées, progression enregistrée, niveau qui monte.
// On répond juste en recalculant la réponse depuis l'énoncé (multiplications uniquement).
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;
const CAS = [{ classe: 'ce1', theme: 'tables' }, { classe: 'ce2', theme: 'tables' }];
let echecs = 0;

for (const { classe, theme } of CAS) {
  const dom = new JSDOM(fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'), { url: 'http://localhost/' });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;

  await import(new URL('../js/app.js', import.meta.url).href + '?c=' + classe);

  const d = window.document;
  const q = (s) => d.querySelector(s);
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const taper = (n) => {
    for (const ch of String(n)) click(q(`[data-touche="${ch}"]`));
    click(q('[data-touche="ok"]'));
  };

  if (!q('#prenom')) click(q('[data-aller="profil"]'));
  q('#prenom').value = 'Lina';
  click(q(`[data-classe="${classe}"]`));
  click(q('#commencer'));

  const etoilesAvant = JSON.parse(window.localStorage.getItem('mathoo.v1') || '{}').etoiles || 0;

  for (let s = 0; s < 3; s++) {
    click(q(`[data-jouer="${theme}"]`));
    for (let i = 0; i < 10; i++) {
      const t = q('.question__texte').textContent;
      const facteurManquant = t.match(/^(\d+) × \? = (\d+)$/);
      if (facteurManquant) {
        taper(+facteurManquant[2] / +facteurManquant[1]);
      } else {
        const attendu = eval(t.replace(/ \(écris le résultat\)/, '').replace(/×/g, '*').replace(/ = \?$/, ''));
        const bouton = [...d.querySelectorAll('[data-choix]')].find((b) => +b.dataset.choix === attendu);
        if (bouton) click(bouton); else taper(attendu);
      }
      if (!q('.retour--bravo')) {
        console.log(`✘ ${classe} : réponse juste non reconnue → ${t}`);
        echecs++;
        break;
      }
      click(q('#suivant'));
    }
  }
  const e = JSON.parse(window.localStorage.getItem('mathoo.v1'));
  const stats = e.modules[`${classe}:${theme}`];
  const ok = e.etoiles - etoilesAvant === 30 && stats.niveau === 3;
  if (!ok) echecs++;
  console.log(`${ok ? '✔' : '✘'} ${classe.toUpperCase()} / ${theme} : ${e.etoiles - etoilesAvant} étoiles sur 30, niveau ${stats.niveau}, badges : ${e.badges.join(', ')}`);
}

process.exit(echecs ? 1 : 0);
