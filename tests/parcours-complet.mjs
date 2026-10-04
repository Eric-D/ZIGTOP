// Parcours complet pour chaque classe, en répondant volontairement à côté :
// on vérifie que l'enfant peut toujours avancer et qu'aucun mot négatif n'apparaît.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;
const CLASSES = ['cp', 'ce1', 'ce2'];
let echecs = 0;

for (const classe of CLASSES) {
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

  // Les modules ES restent en mémoire d'une itération à l'autre : on revient au profil à la main.
  if (!q('#prenom')) click(q('[data-aller="profil"]'));
  q('#prenom').value = 'Lina';
  click(q(`[data-classe="${classe}"]`));
  click(d.querySelectorAll('[data-avatar]')[1]);
  click(q('#commencer'));

  const nbLieux = d.querySelectorAll('.lieu').length;
  click(q('[data-jouer="melange"]'));

  let clics = 0;
  while (!q('.bilan') && clics++ < 80) {
    if (q('#suivant')) { click(q('#suivant')); continue; }
    const c = d.querySelector('[data-choix]');
    if (c) { click(c); continue; }
    click(q('[data-touche="7"]'));
    click(q('[data-touche="ok"]'));
  }
  const bilan = q('.bilan__phrase')?.textContent;
  click(q('[data-aller="progres"]'));

  const texte = d.body.textContent.toLowerCase();
  const negatifs = ['faux', 'erreur', 'mauvais', 'échec', 'raté', ' nul', 'perdu'].filter((m) => texte.includes(m));

  const ok = !!bilan && nbLieux >= 8 && negatifs.length === 0;
  if (!ok) echecs++;
  console.log(`${ok ? '✔' : '✘'} ${classe.toUpperCase()} : ${nbLieux} lieux sur la carte, bilan « ${bilan} »` +
    (negatifs.length ? ` — mots négatifs : ${negatifs}` : ' — aucun mot négatif'));
}

process.exit(echecs ? 1 : 0);
