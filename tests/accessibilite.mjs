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

const d = window.document;
const q = (s) => d.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const regler = (id, v) => click(q(`[data-reglage="${id}"][data-valeur="${v}"]`));
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

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
while (!q('.retour--astuce') && essais++ < 8) {
  const options = [...d.querySelectorAll('[data-choix]')];
  if (options.length) {
    const enonce = q('.question__texte').textContent;
    const mult = enonce.match(/^(\d+) × (\d+) = \?$/);
    click(options.find((b) => !mult || +b.dataset.choix !== +mult[1] * +mult[2]) || options[0]);
  } else if (q('#suivant')) click(q('#suivant'));
}
verifier(!!q('.retour--astuce'), 'une astuce s’affiche au lieu d’une sanction');
verifier(!!q('.retour__dessin svg.visuel'), 'un dessin d’aide accompagne l’explication');
verifier(d.querySelectorAll('.confetti').length === 0, 'écran calme : aucun confetti');

// On peut couper les dessins si l'enfant préfère le calme visuel.
click(q('[data-aller="accueil"]'));
click(q('[data-aller="reglages"]'));
regler('visuels', 'non');
click(q('[data-aller="accueil"]'));
click(q('[data-jouer="tables"]'));
// On tape à côté jusqu'à voir une astuce (au pire, on tombe juste plusieurs fois).
let vus = 0;
while (!q('.retour--astuce') && vus++ < 6) {
  const options = [...d.querySelectorAll('[data-choix]')];
  if (options.length) click(options[options.length - 1]);
  else if (q('#suivant')) click(q('#suivant'));
}
verifier(!!q('.retour--astuce'), 'une astuce finit par s’afficher');
verifier(!q('.retour__dessin'), 'dessins coupés : plus aucun dessin d’aide');

process.exit(echecs ? 1 : 0);
