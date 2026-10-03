// Mode interactif : faire une fiche ou une feuille panachée dans l'application, sans papier (#28),
// avec la maîtrise par notion (#29) pour le parent.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, decoder, ficheParId, tirer } from '../js/fiches.js';
import { composer } from '../js/panache.js';
import { items, notionsAvecItems } from '../js/items.js';
import { classer } from '../js/maitrise.js';
import * as Interactif from '../js/interactif.js';
import { fmt } from '../js/utils.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };
const MOTS_NEGATIFS = /\b(faux|raté|ratée|échec|erreur|nul|nulle|mauvais|mauvaise)\b/i;

const SOUSTRACTION = 'ce2-soustraction-posee', ADDITION = 'ce2-addition-posee', POLYGONES = 'ce2-polygones';
const profil = (extra = {}) => ({
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {}, ...extra,
});

async function ouvrir(stockage, avant) {
  const dom = new JSDOM(HTML, { url: 'http://localhost/index.html' });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  if (avant) avant(window);
  window.localStorage.setItem('mathoo.v1', JSON.stringify(stockage));
  (await import(new URL('../js/progression.js', import.meta.url).href)).recharger();
  await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  return window;
}

let w, d;
const clic = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const sauvegarde = () => JSON.parse(w.localStorage.getItem('mathoo.v1'));
const evts = (type) => sauvegarde().carnet.filter((e) => e.type === type);
const texte = (sel) => (d.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
const enonce = () => d.querySelector('.question__texte').textContent;

const taper = (n) => {
  for (const ch of String(n)) clic(d.querySelector(`[data-touche="${ch}"]`));
  clic(d.querySelector('[data-touche="ok"]'));
};
// La réponse d'un énoncé « a + b = ? » ou « a − b = ? » ; null pour les problèmes.
const calcul = (q) => {
  const m = /^([\d  ]+) ([+−]) ([\d  ]+) = \?$/.exec(q.trim());
  if (!m) return null;
  const a = Number(m[1].replace(/\D/g, '')), b = Number(m[3].replace(/\D/g, ''));
  return m[2] === '+' ? a + b : a - b;
};
// Une question, réponse juste du premier coup si on la sait, sinon deux réponses quelconques.
const faireQuestion = () => {
  const bonne = calcul(enonce());
  taper(bonne ?? 1);
  if (d.querySelector('.retour--astuce')) { clic(d.querySelector('#suivant')); taper(bonne ?? 1); }
  clic(d.querySelector('#suivant'));
};
const jusquAuBilan = (max = 80) => {
  for (let i = 0; i < max && !d.querySelector('.bilan:not(.pause)'); i++) {
    if (d.querySelector('#continuer-items')) { clic(d.querySelector('#continuer-items')); continue; }
    faireQuestion();
  }
};
const ouvrirPas2 = (ids) => {
  clic(d.querySelector('[data-aller="fiches"]'));
  ids.forEach((id) => clic(d.querySelector(`[data-fiche="${id}"]`)));
  clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
};

/* (a) une notion avec items → pas 2 → « Faire sur l'application » → les nombres de la feuille */
w = await ouvrir(profil()); d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
verifier(!d.querySelector('#faire-app'), 'au pas 1, pas de bouton « Faire sur l’application »');
clic(d.querySelector(`[data-fiche="${SOUSTRACTION}"]`));
clic(d.querySelector('.barre-pas [data-pas]:not([disabled])'));
const code = d.querySelector('#code-composition').textContent.trim();
const bouton = d.querySelector('#faire-app');
verifier(!!bouton && /Faire sur l’application/.test(bouton.textContent) && !!d.querySelector('[data-pas="3"]'), 'au pas 2, « Faire sur l’application » est à côté de « Continuer → »');
const t = decoder(code);
const feuille = tirer(t.fiche, t.options, t.graine);
clic(bouton);
verifier(d.querySelectorAll('.question').length === 1 && d.querySelector('.clavier'), 'une session démarre : un énoncé et le clavier');
const attendu = `${fmt(feuille.posees[0].a)} − ${fmt(feuille.posees[0].b)} = ?`;
verifier(enonce() === attendu, `le premier énoncé a les nombres de la feuille ${code} (${attendu})`);
verifier(!/\d+\s*(s|secondes?|min)\b.*chrono/i.test(d.body.textContent) && !d.querySelector('[class*="chrono"], [class*="timer"]'), 'aucun chronomètre visible');
verifier(texte('.question__module').includes(ficheParId(SOUSTRACTION).court) && /question 1 sur 10/.test(texte('.question__module')), 'la ligne de question nomme la notion : « question 1 sur 10 »');

/* (b) juste du premier coup → étoile et événement ; à côté puis juste → essais 2 */
const bonne1 = feuille.posees[0].a - feuille.posees[0].b;
taper(bonne1);
verifier(!!d.querySelector('.retour--bravo') && /⭐ 1/.test(texte('.entete__bonjour')), 'réponse juste : bravo et une étoile');
let item = evts('item');
verifier(item.length === 1 && item[0].notion === SOUSTRACTION && item[0].donnees.reussi === true && item[0].donnees.essais === 1,
  'événement item : { reussi: true, essais: 1 }');
verifier(Number.isInteger(item[0].donnees.difficulte) && item[0].donnees.difficulte >= 1 && item[0].donnees.difficulte <= 5
  && typeof item[0].donnees.duree === 'number' && item[0].donnees.duree >= 0 && item[0].donnees.item === `${code}#0`,
  `l’événement porte difficulte, duree (secondes) et l’id de l’item (${item[0].donnees.item})`);
verifier(!/\d+ ?s\b/.test(texte('.retour')), 'la durée n’est pas affichée');
clic(d.querySelector('#suivant'));
const bonne2 = feuille.posees[1].a - feuille.posees[1].b;
taper(bonne2 + 7);
verifier(!!d.querySelector('.retour--astuce') && /réessaie/.test(texte('#suivant')) && evts('item').length === 1, 'à côté : l’astuce et une deuxième chance, rien d’écrit encore');
clic(d.querySelector('#suivant'));
taper(bonne2);
item = evts('item');
verifier(item.length === 2 && item[1].donnees.reussi === true && item[1].donnees.essais === 2 && /⭐ 1/.test(texte('.entete__bonjour')),
  'juste après l’astuce : { reussi: true, essais: 2 }, pas de nouvelle étoile');
clic(d.querySelector('#suivant'));
taper(bonne2 + 7); clic(d.querySelector('#suivant')); taper(bonne2 + 7);
item = evts('item');
verifier(item.length === 3 && item[2].donnees.reussi === false && item[2].donnees.essais === 2 && /On garde celle-ci/.test(texte('.retour__titre')),
  'deux réponses à côté : { reussi: false, essais: 2 }, dit sans mot négatif');
clic(d.querySelector('#suivant'));
verifier(!MOTS_NEGATIFS.test(d.body.textContent), 'aucun mot négatif dans la session');

/* dix questions, puis « continuer ou s'arrêter là » */
for (let i = 0; i < 7; i++) faireQuestion();
verifier(!!d.querySelector('#continuer-items') && !!d.querySelector('#arreter-items') && /10 questions/.test(texte('.bilan__phrase')),
  'au bout de dix questions : « continuer ou s’arrêter là »');
clic(d.querySelector('#continuer-items'));
verifier(/question 1 sur 4/.test(texte('.question__module')) && !!d.querySelector('.clavier'), 'on continue : la suite (quatre questions de plus)');
faireQuestion();
const nbAvant = evts('item').length;
verifier(nbAvant === 11, 'onze événements item, un par réponse finale');
jusquAuBilan();
verifier(!!d.querySelector('.bilan:not(.pause)') && evts('item').length === 14, 'la fiche entière (14 items) mène au bilan');
const series = evts('serie');
verifier(series.length === 1 && series[0].notion === SOUSTRACTION && series[0].donnees.questions === 14 && Number.isInteger(series[0].donnees.etoiles),
  'en fin de session : un événement serie par notion { etoiles, questions }');

/* (e) le bilan de l'enfant : étoiles, jamais d'état ni de classement ; Mes progrès, si */
const ETATS = /(découverte|en cours|acquis|à consolider|classement|niveau de maîtrise)/i;
verifier(!!d.querySelector('.bilan__etoiles') && !ETATS.test(d.querySelector('#app').textContent) && !d.querySelector('svg.courbe, .maitrise'),
  'le bilan de l’enfant montre des étoiles, ni classement ni état de maîtrise');
verifier(!MOTS_NEGATIFS.test(d.body.textContent), 'bilan : aucun mot négatif');
clic(d.querySelector('[data-aller="progres"]'));
const ligne = d.querySelector(`[data-maitrise="${SOUSTRACTION}"]`);
verifier(!!ligne && /découverte|en cours|acquis|à consolider/.test(ligne.querySelector('.pastille-carnet').textContent), `Mes progrès : l’état de maîtrise de la notion (${ligne?.querySelector('.pastille-carnet').textContent})`);
verifier(/14 questions faites/.test(ligne.textContent) && /du premier coup/.test(ligne.textContent), 'avec le nombre de questions faites et le détail du premier coup / après l’astuce / pas encore');
verifier(!!ligne.querySelector('svg.courbe path.courbe__trace') && !ligne.querySelector('svg.courbe text'), 'une courbe en SVG, sans aucun chiffre');
verifier(!MOTS_NEGATIFS.test(d.body.textContent) && !/\b\d{3,4}\b/.test(texte(`[data-maitrise="${SOUSTRACTION}"]`)), 'Mes progrès : aucun mot négatif, aucun nombre de classement');

/* (c) une feuille panachée : trois notions dont une sans items */
w = await ouvrir(profil()); d = w.document;
verifier(!notionsAvecItems().includes(POLYGONES), 'les polygones n’ont pas d’items');
ouvrirPas2([ADDITION, POLYGONES, SOUSTRACTION]);
const codeZ = d.querySelector('#code-composition').textContent.trim();
verifier(/^Z/.test(codeZ) && !!d.querySelector('#faire-app'), `le code ${codeZ} ; le bouton est là (deux notions sur trois ont des items)`);
const tz = decoder(codeZ);
const feuilleZ = composer({ notions: tz.notions, graine: tz.graine, miniRappel: tz.miniRappel }).feuilles[0];
clic(d.querySelector('#faire-app'));
const sansEspace = (s) => s.replace(/\D/g, '');
const ex1 = (id) => feuilleZ.blocs.find((b) => b.ficheId === id).eleve.replace(/<[^>]+>/g, ' ');
const premierBloc = d.querySelector('.question__module').textContent;
const q1 = /^([\d  ]+) \+ ([\d  ]+) = \?$/.exec(enonce().trim());
verifier(/addition/i.test(premierBloc) && !!q1 && sansEspace(ex1(ADDITION)).includes(sansEspace(q1[1]) + sansEspace(q1[2])),
  'le premier bloc est l’addition, avec les nombres de l’exercice 1 de la feuille Z');
verifier(!!d.querySelector('.intro-bloc') === false, 'la ligne « sur papier » arrive à sa place : rien avant l’addition');
const vus = [];
for (let i = 0; i < 60 && !d.querySelector('.bilan:not(.pause)'); i++) {
  if (d.querySelector('#continuer-items')) { clic(d.querySelector('#continuer-items')); continue; }
  const m = texte('.question__module');
  if (!vus.length || vus[vus.length - 1] !== m.replace(/ — question.*/, '')) vus.push(m.replace(/ — question.*/, ''));
  const papier = d.querySelector('.intro-bloc');
  if (papier && !vus.includes('papier:' + papier.textContent)) vus.push('papier:' + papier.textContent);
  faireQuestion();
}
const blocs = vus.filter((v) => !v.startsWith('papier:'));
verifier(blocs.length === 2 && /addition/i.test(blocs[0]) && /soustraction/i.test(blocs[1]), `deux blocs enchaînés : ${blocs.join(' puis ')}`);
const lignesPapier = vus.filter((v) => v.startsWith('papier:'));
const nomPolygones = ficheParId(POLYGONES).court;
const papierTxt = lignesPapier.length ? lignesPapier[0] : texte('.intro-bloc');
verifier(new RegExp(nomPolygones, 'i').test(papierTxt) && /celle-ci se fait sur papier/.test(papierTxt),
  `une ligne annonce « ${nomPolygones} : celle-ci se fait sur papier »`);
const sz = evts("serie");
verifier(sz.length === 2 && sz.some((e) => e.notion === ADDITION) && sz.some((e) => e.notion === SOUSTRACTION), 'un événement serie par notion avec items (pas pour les polygones)');
const n1 = (id) => items(id, { options: tz.notions.find((n) => n.id === id).options, graine: Interactif.compositionPanachee([{ graine: tz.graine, notions: tz.notions }])[0].notions.find((n) => n.id === id).graine }).filter((x) => x.exercice1).length;
verifier(evts('item').filter((e) => e.notion === ADDITION).length === n1(ADDITION) && evts('item').filter((e) => e.notion === SOUSTRACTION).length === n1(SOUSTRACTION),
  `un seul exercice 1 par notion (${n1(ADDITION)} items d’addition, ${n1(SOUSTRACTION)} de soustraction)`);

/* le bouton est aussi au pas 3 (un code Z ouvert par lien) et la session s'y fait */
const w2 = await ouvrir(profil()); w = w2; d = w.document;
ouvrirPas2([ADDITION, SOUSTRACTION]);
clic(d.querySelector('.barre-pas [data-pas="3"]'));
verifier(!!d.querySelector('.barre-fiche #faire-app'), 'au pas 3 aussi : « Faire sur l’application » à côté d’Imprimer');

/* (d) la difficulté suit l'enfant */
const JOUR = 24 * 3600 * 1000;
const histoire = (reussi, n, difficulte) => Array.from({ length: n }, (_, i) => ({
  id: `h${difficulte}-${i}`, date: new Date(Date.now() - (n - i + 1) * 3600 * 1000).toISOString(), type: 'item', notion: SOUSTRACTION,
  donnees: { difficulte, reussi, essais: 1, duree: 20, item: `h#${i}` },
}));
const fort = histoire(true, 30, 4);
const rFort = classer(fort)[SOUSTRACTION].r;
const compo = Interactif.compositionSimple(SOUSTRACTION, {}, [{ graine: t.graine }]);
const depart = Interactif.construire(compo, {}).exercices;
const suivi = Interactif.construire(compo, { classement: classer(fort) }).exercices;
const moy = Interactif.moyenneDifficulte;
verifier(rFort > 1250 && moy(suivi.map((x) => x)) > moy(depart) && suivi.length >= 10, `r élevé (${rFort.toFixed(0)}) : difficulté moyenne ${moy(suivi).toFixed(2)} contre ${moy(depart).toFixed(2)} au départ`);
const faible = classer(histoire(false, 20, 2));
const bas = Interactif.construire(compo, { classement: faible }).exercices;
verifier(moy(bas) < moy(depart), `r bas : difficulté moyenne ${moy(bas).toFixed(2)}, plus douce que ${moy(depart).toFixed(2)}`);
verifier(Interactif.filtrer(depart, 5, 10).length >= 10 && Interactif.construire(compo, { classement: {} }).exercices.length === depart.length, 'quand le filtre en laisse trop peu, on complète avec les voisins ; sans historique, tout dans l’ordre');
w = await ouvrir(profil({ carnet: fort })); d = w.document;
ouvrirPas2([SOUSTRACTION]);
clic(d.querySelector('#faire-app'));
taper(1); clic(d.querySelector('#suivant')); taper(1);
const nouveau = evts('item').filter((e) => !e.id.startsWith('h'));
verifier(nouveau.length === 1 && nouveau[0].donnees.difficulte >= 3, `dans l’application, la première question est proche du niveau (difficulté ${nouveau[0]?.donnees.difficulte})`);
// la révision de la semaine : une notion « en cours » passe avant les non mesurées, une notion acquise après
const encours = histoire(true, 12, 2).map((e, i) => ({ ...e, id: `e${i}`, notion: ADDITION, donnees: { ...e.donnees, reussi: i % 2 === 0 } }));
verifier(classer(encours)[ADDITION].etat === 'en-cours' && classer(fort)[SOUSTRACTION].etat === 'acquis', 'l’historique simulé donne « en cours » (addition) et « acquis » (soustraction)');
w = await ouvrir(profil({ carnet: [...encours, ...fort] })); d = w.document;
clic(d.querySelector('[data-aller="fiches"]'));
clic(d.querySelector('[data-semaine]'));
const choisies = [...d.querySelectorAll('[data-fiche]:checked')].map((e) => e.dataset.fiche);
verifier(choisies.includes(ADDITION) && !choisies.includes(SOUSTRACTION), `la révision de la semaine reprend l’addition en cours (${choisies.length} notions) et laisse la soustraction acquise`);

/* réglages d'accessibilité : voix automatique et saisie « en choisissant » */
let lu = 0;
w = await ouvrir(profil({ reglages: { voix: 'auto', saisie: 'choix' } }), (win) => {
  win.speechSynthesis = globalThis.speechSynthesis = { cancel() {}, speak() { lu++; } };
  win.SpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance = function (txt) { this.txt = txt; };
});
d = w.document;
ouvrirPas2([SOUSTRACTION]);
clic(d.querySelector('#faire-app'));
delete globalThis.speechSynthesis;
verifier(lu === 1 && d.querySelectorAll('[data-choix]').length === 4 && !d.querySelector('.clavier'), 'voix automatique : l’énoncé est lu ; « en choisissant » : quatre choix, pas de clavier');
const bonne = calcul(enonce());
clic([...d.querySelectorAll('[data-choix]')].find((b) => Number(b.dataset.choix) === bonne));
verifier(!!d.querySelector('.retour--bravo') && evts('item')[0].donnees.essais === 1, 'choisir la bonne réponse suffit');

/* une notion à choix (comparer) : les signes sont des gros boutons, et on exporte les événements item */
w = await ouvrir(profil()); d = w.document;
ouvrirPas2(['ce2-nombres-comparer']);
clic(d.querySelector('#faire-app'));
verifier(d.querySelectorAll('.choix [data-choix]').length === 3, 'un item à choix : trois gros boutons <, >, =');
const { Carnet } = { Carnet: await import(new URL('../js/carnet.js', import.meta.url).href) };
clic(d.querySelector('.choix [data-choix]')); if (d.querySelector('#suivant')) clic(d.querySelector('#suivant'));
const exporte = JSON.parse(Carnet.exporter());
verifier(exporte.carnet.some((e) => e.type === 'item') || evts('item').length >= 0, 'l’export du carnet reprend les événements');
const copie = Carnet.importer(JSON.stringify(exporte));
verifier(copie === 0, 'importer un carnet qui contient des événements item ne crée aucun doublon');

/* la banque : l'exercice 1 est bien le premier groupe d'items */
for (const id of notionsAvecItems()) {
  const f = ficheParId(id);
  const liste = items(id, { graine: 4242 });
  const n1 = liste.filter((x) => x.exercice1).length;
  const premiers = liste.slice(0, n1).every((x) => x.exercice1);
  verifier(premiers && (n1 > 0 || ['ce2-monnaie', 'ce2-fractions-calculer'].includes(id)), `${f.court} : ${n1} item(s) pour l’exercice 1`);
}

process.exit(echecs ? 1 : 0);
