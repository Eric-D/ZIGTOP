// Les réglages d'accessibilité doivent vraiment changer l'application :
// lecture facilitée, écran calme, séries courtes, réponses à choisir, dessins d'aide.
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
window.matchMedia = () => ({ matches: false });
globalThis.matchMedia = window.matchMedia;

await import(new URL('../js/app.js', import.meta.url).href);
const { setAlea, generateurAleatoire } = await import(new URL('../js/utils.js', import.meta.url).href);

const d = window.document;
const q = (s) => d.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const regler = (id, v) => click(q(`[data-reglage="${id}"][data-valeur="${v}"]`));
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

// La bonne réponse d'une question de tables ou d'additions répétées, lue dans l'énoncé (null si on ne sait pas).
function reponseAttendue(enonce) {
  let m = enonce.match(/^(\d+) × (\d+) = \?/);
  if (m) return +m[1] * +m[2];
  m = enonce.match(/^(\d+) × \? = (\d+)/);
  if (m) return +m[2] / +m[1];
  m = enonce.match(/^\? × (\d+) = (\d+)/);
  if (m) return +m[2] / +m[1];
  m = enonce.match(/^(\d+(?: \+ \d+)+) = \?/);
  if (m) return m[1].split(' + ').reduce((a, b) => a + +b, 0);
  return null;
}
// Un bouton de réponse qui n'est sûrement pas la bonne (sinon, le dernier : mieux que rien).
function mauvaisChoix(options) {
  const bon = reponseAttendue(q('.question__texte').textContent);
  return options.find((b) => bon === null || +b.dataset.choix !== bon) || options[options.length - 1];
}

q('#prenom').value = 'Sami';
click(q('[data-classe="ce1"]'));
click(q('#commencer'));

click(q('[data-aller="reglages"]'));
verifier(d.querySelectorAll('.reglage').length >= 8, `${d.querySelectorAll('.reglage').length} réglages proposés`);

regler('lecture', 'facile');
regler('taille', 'tres-grand');
regler('fond', 'bleu');
regler('animations', 'non');
regler('serie', '5');
regler('saisie', 'choix');
const racine = d.documentElement;
verifier(racine.dataset.lecture === 'facile' && racine.dataset.taille === 'tres-grand'
  && racine.dataset.fond === 'bleu' && racine.dataset.animations === 'non',
  `<html> porte les réglages : ${JSON.stringify({ ...racine.dataset })}`);
verifier(JSON.parse(window.localStorage.getItem('mathoo.v1')).reglages.serie === '5', 'les réglages sont sauvegardés');

click(q('[data-aller="accueil"]'));
setAlea(generateurAleatoire(2024));   // tirage fixé : le test ne dépend plus de la chance
click(q('[data-jouer="tables"]'));
verifier(d.querySelectorAll('.barre-progres i').length === 5, 'la série ne fait plus que 5 questions');
verifier(!!q('[data-choix]') && !q('[data-touche]'), 'on répond en choisissant, sans clavier');

// La bonne réponse doit être proposée, même sur une question à saisie transformée.
const t = q('.question__texte').textContent;
const m = t.match(/^(\d+) × (\d+) = \?$/);
if (m) {
  const bon = +m[1] * +m[2];
  verifier([...d.querySelectorAll('[data-choix]')].some((b) => +b.dataset.choix === bon),
    `« ${t} » : la bonne réponse (${bon}) est bien proposée`);
}

// Réponse à côté : Zigo explique, et le dessin d'aide accompagne l'explication.
// (Si on tombe juste par hasard, on passe à la question suivante et on recommence.)
let essais = 0;
while (!q('.retour--astuce') && essais++ < 12) {
  const options = [...d.querySelectorAll('[data-choix]')];
  if (options.length) click(mauvaisChoix(options));
  else if (q('#suivant')) click(q('#suivant'));
}
verifier(!!q('.retour--astuce'), 'une astuce s’affiche au lieu d’une sanction');
verifier(!!q('.retour__dessin svg.visuel'), 'un dessin d’aide accompagne l’explication');
verifier(d.querySelectorAll('.confetti').length === 0, 'écran calme : aucun confetti');

// On peut couper les dessins si l'enfant préfère le calme visuel.
click(q('[data-aller="accueil"]'));
click(q('[data-aller="reglages"]'));
regler('visuels', 'non');
click(q('[data-aller="accueil"]'));

// On répond à côté jusqu'à voir une astuce. Les graines 20, 32 et 75 sont celles où, avec « toujours le dernier
// bouton », les trois premières questions tombaient justes : la série s'épuisait sans jamais montrer d'astuce.
for (const graine of [2024, 20, 32, 75]) {
  setAlea(generateurAleatoire(graine));
  click(q('[data-jouer="tables"]'));
  let vus = 0;
  while (!q('.retour--astuce') && vus++ < 12) {
    const options = [...d.querySelectorAll('[data-choix]')];
    if (options.length) click(mauvaisChoix(options));
    else if (q('#suivant')) click(q('#suivant'));
  }
  verifier(!!q('.retour--astuce'), `graine ${graine} : une astuce finit par s’afficher`);
  verifier(!q('.retour__dessin'), `graine ${graine} : dessins coupés, plus aucun dessin d’aide`);
  click(q('[data-aller="accueil"]'));
}
setAlea(null);

process.exit(echecs ? 1 : 0);
