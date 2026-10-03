// Une fiche imprimée ne se corrige pas après coup : le corrigé doit être juste,
// les retenues bien placées, et la fiche ne doit pas changer toute seule.
import { JSDOM } from 'jsdom';
import { FICHES, tirer, rendre, decoder, codeDe, optionsParDefaut } from '../js/fiches.js';
import { matrice } from '../js/qr.js';
import { fmt } from '../js/utils.js';
import { figureFraction, monnaie } from '../js/visuels.js';

let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };
const lettre = (i) => String.fromCharCode(97 + i);
const nombre = (txt) => parseInt(String(txt).replace(/\s/g, ''), 10);

const fiche = FICHES.find((f) => f.id === 'ce2-addition-posee');

/* 1. Les nombres respectent le programme du CE2 -------------------- */

let horsProgramme = 0, sansRetenue = 0, deuxRetenues = 0, tirages = 0;
for (const taille of ['3', '4', 'mix']) {
  for (let i = 0; i < 40; i++) {
    const c = tirer(fiche, { taille });
    tirages++;
    for (const o of [...c.posees, ...c.aposer, ...c.problemes.map((p) => ({ a: p.a, b: p.b }))]) {
      if (o.a + o.b > 9999 || o.a < 10 || o.b < 10) horsProgramme++;
    }
    const retenues = (o) => {
      let r = 0, n = 0;
      const A = String(o.a).split('').reverse(), B = String(o.b).split('').reverse();
      for (let k = 0; k < Math.max(A.length, B.length); k++) {
        const s = (+A[k] || 0) + (+B[k] || 0) + r;
        r = s >= 10 ? 1 : 0;
        n += r;
      }
      return n;
    };
    if (retenues(c.posees[0]) === 0) sansRetenue++;
    if (retenues(c.posees[2]) >= 2) deuxRetenues++;
  }
}
verifier(horsProgramme === 0, `tous les résultats restent sous 10 000 (${tirages} tirages)`);
verifier(sansRetenue / tirages > 0.9, `la 1re addition est presque toujours sans retenue (${Math.round(100 * sansRetenue / tirages)} %)`);
verifier(deuxRetenues / tirages > 0.9, `la 3e addition a bien plusieurs retenues (${Math.round(100 * deuxRetenues / tirages)} %)`);

/* 2. Le corrigé est juste, retenues comprises ---------------------- */

const contenu = tirer(fiche, optionsParDefaut(fiche));
const { window } = new JSDOM(`<div>${rendre(fiche, contenu, { corrige: true })}</div>`);
const d = window.document;

const feuilles = d.querySelectorAll('.feuille');
verifier(feuilles.length === 2, `${feuilles.length} pages : exercices + corrigé`);

const corrige = d.querySelector('.feuille--corrige');
// Avec le rappel de méthode, la fiche n'imprime que les 4 premières additions
// posées et les 3 premières à poser : le corrigé doit suivre exactement.
const attendus = [...contenu.posees.slice(0, 4), ...contenu.aposer.slice(0, 3)].map((o) => o.a + o.b);
const trouves = [...corrige.querySelectorAll('.operations .op')].map((op) =>
  nombre([...op.querySelectorAll('.pose__resultat .reponse')].map((td) => td.textContent).join('')));
verifier(JSON.stringify(trouves) === JSON.stringify(attendus),
  `les ${attendus.length} résultats du corrigé sont exacts`);

// Une retenue par colonne où la somme dépasse 9, et nulle part ailleurs.
const premiereOp = contenu.posees[2];
const opCorrigee = corrige.querySelectorAll('.operations .op')[2];
const retenuesAffichees = [...opCorrigee.querySelectorAll('.pose__retenues td')].map((td) => td.textContent.trim());
let r = 0, attenduesRet = [];
{
  const largeur = String(premiereOp.a).length;
  const A = String(premiereOp.a).padStart(largeur, '0').split('');
  const B = String(premiereOp.b).padStart(largeur, '0').split('');
  attenduesRet = Array(retenuesAffichees.length).fill('');
  const decalage = retenuesAffichees.length - largeur;
  for (let i = largeur - 1; i >= 0; i--) {
    const somme = +A[i] + +B[i] + r;
    r = somme >= 10 ? 1 : 0;
    if (r && i > 0) attenduesRet[decalage + i - 1] = '1';
  }
}
verifier(JSON.stringify(retenuesAffichees) === JSON.stringify(attenduesRet),
  `retenues placées au bon endroit (${premiereOp.a} + ${premiereOp.b} → [${retenuesAffichees}])`);

// Ordres de grandeur : arrondi à la centaine, et proposé parmi les choix.
const estimOk = contenu.estimations.every((e) => {
  const arrondi = (n) => Math.round(n / 100) * 100;
  return e.reponse === arrondi(e.a) + arrondi(e.b) && e.choix.includes(e.reponse) && e.exact === e.a + e.b;
});
verifier(estimOk, 'les ordres de grandeur sont les arrondis à la centaine');

const phrasesOk = contenu.problemes.every((p) => p.phrase.includes(String(p.a + p.b).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')));
verifier(phrasesOk, 'les phrases réponses des problèmes donnent le bon total');

/* 3. Stabilité : même contenu, même fiche ------------------------- */

verifier(rendre(fiche, contenu, { corrige: true }) === rendre(fiche, contenu, { corrige: true }),
  'un même contenu donne toujours la même fiche');
verifier(!rendre(fiche, contenu, { corrige: false }).includes('feuille--corrige'), 'sans corrigé : une seule page');

/* 3 bis. Options d'impression ------------------------------------- */

const compter = (html, motif) => (html.match(motif) || []).length;
const pages = (html) => compter(html, /<section class="feuille/g);

const plusieurs = [contenu, tirer(fiche, optionsParDefaut(fiche)), tirer(fiche, optionsParDefaut(fiche))];
const troisFeuilles = rendre(fiche, plusieurs, { corrige: true });
verifier(pages(troisFeuilles) === 6, `3 feuilles + 3 corrigés = ${pages(troisFeuilles)} pages`);
verifier(troisFeuilles.indexOf('feuille--corrige') > troisFeuilles.lastIndexOf('<section class="feuille">'),
  'les pages élève sortent toutes avant les corrigés');
verifier(new Set(plusieurs.map((c) => c.code)).size === 3, 'chaque feuille a son propre code');

const avecMethode = rendre(fiche, contenu, { corrige: false, methode: true });
const sansMethode = rendre(fiche, contenu, { corrige: false, methode: false });
verifier(avecMethode.includes('Je me souviens de la méthode'), 'la méthode est rappelée par défaut');
verifier(!sansMethode.includes('Je me souviens de la méthode'), 'on peut masquer le rappel de la méthode');
verifier(compter(sansMethode, /class="op"/g) > compter(avecMethode, /class="op"/g),
  `sans la méthode, plus d'exercices (${compter(sansMethode, /class="op"/g)} contre ${compter(avecMethode, /class="op"/g)})`);

// Le corrigé doit reprendre les mêmes opérations que la page élève, ni plus ni moins.
for (const methode of [true, false]) {
  const doc = new JSDOM(`<div>${rendre(fiche, contenu, { corrige: true, methode })}</div>`).window.document;
  const [pageEleve, pageCorrige] = doc.querySelectorAll('.feuille');
  const nbEleve = pageEleve.querySelectorAll('.operations .op').length;
  const nbCorrige = pageCorrige.querySelectorAll('.operations .op').length;
  verifier(nbEleve === nbCorrige && nbEleve === (methode ? 7 : 12),
    `${methode ? 'avec' : 'sans'} la méthode : ${nbEleve} opérations imprimées, ${nbCorrige} corrigées`);
}

verifier(rendre(fiche, contenu, { identite: false }).indexOf('Nom :') === -1, 'on peut retirer la ligne Nom / Date');
verifier(rendre(fiche, contenu, { identite: true, corrige: false }).includes('Nom :'), 'la ligne Nom / Date est là par défaut');
verifier(!rendre(fiche, contenu, { identite: true }).split('feuille--corrige')[1].includes('Nom :'),
  'le corrigé, lui, n’a jamais de ligne Nom / Date');

/* 4. Rien d'écrit sur la page d'exercices (hors exemple de la méthode) --- */

const exercices = feuilles[0];
verifier(exercices.querySelectorAll('.operations .pose__resultat .reponse').length === 0,
  'la page élève ne contient aucune réponse');
verifier(exercices.querySelectorAll('.methode .pose__resultat .reponse').length > 0,
  'l’exemple de la méthode, lui, est bien corrigé');

/* 5. Code et graine : retrouver une fiche à l'identique ------------ */

const rejoue = decoder(contenu.code);
verifier(!!rejoue && rejoue.fiche === fiche, `le code ${contenu.code} désigne la bonne fiche`);
const contenu2 = tirer(rejoue.fiche, rejoue.options, rejoue.graine);
verifier(JSON.stringify(contenu2) === JSON.stringify(contenu), 'le code redonne exactement les mêmes exercices');

const codesVus = new Set();
for (let i = 0; i < 200; i++) codesVus.add(tirer(fiche, { taille: 'mix' }).code);
verifier(codesVus.size > 190, `les codes sont bien variés (${codesVus.size} codes différents sur 200)`);
verifier(decoder('') === null && decoder('PAS-UN-CODE!!') === null, 'un code invalide est refusé proprement');
verifier(decoder(contenu.code.toLowerCase()) !== null, 'le code est accepté en minuscules');

for (const taille of ['3', '4', 'mix']) {
  const c = tirer(fiche, { taille });
  const d = decoder(c.code);
  if (d.options.taille !== taille) { echecs++; console.log(`✘ option perdue dans le code (${taille})`); }
}
verifier(true, 'les options voyagent dans le code');

/* 6. Le QR code de la fiche -------------------------------------- */

const avecBase = rendre(fiche, contenu, { corrige: true, base: 'https://eric-d.github.io/ZIGTOP/' });
verifier((avecBase.match(/class=\"qr\"/g) || []).length === 2, 'un QR code sur la fiche et sur le corrigé');
const m = matrice(`https://eric-d.github.io/ZIGTOP/?fiche=${contenu.code}`);
verifier(m && m.length === 33, `matrice QR de ${m ? m.length : 0} modules (version 4)`);
verifier(JSON.stringify(matrice('MATHOO')) === JSON.stringify(matrice('MATHOO')), 'l’encodage QR est déterministe');


/* ================================================================== */
/* Soustraction posée                                                  */
/* ================================================================== */

const sous = FICHES.find((f) => f.id === 'ce2-soustraction-posee');
verifier(FICHES.indexOf(sous) === 1 && FICHES.indexOf(fiche) === 0, 'la soustraction est ajoutée après l’addition (les codes imprimés ne bougent pas)');

// Colonnes (gauche → droite) où il faut casser une unité, recalculées indépendamment.
const colonnesAEmprunt = (a, b) => {
  const A = String(a).split('').reverse().map(Number), B = String(b).split('').reverse().map(Number);
  const res = []; let dette = 0;
  for (let k = 0; k < A.length; k++) {
    const v = A[k] - dette - (B[k] || 0);
    dette = v < 0 ? 1 : 0;
    res.push(dette ? k : -1);
  }
  return res.filter((k) => k >= 0).map((k) => A.length - 1 - k);   // index depuis la gauche
};

/* S1. Programme et progressivité */
{
  let hors = 0, sansEmprunt = 0, uneRet = 0, plusieursRet = 0, quatre = 0, tir = 0;
  for (const taille of ['3', '4', 'mix']) {
    for (let i = 0; i < 40; i++) {
      const c = tirer(sous, { taille });
      tir++;
      for (const o of [...c.posees, ...c.aposer, ...c.verifications, ...c.problemes]) {
        if (o.a <= o.b || o.a > 9999 || o.b < 100) hors++;
      }
      if (colonnesAEmprunt(c.posees[0].a, c.posees[0].b).length === 0) sansEmprunt++;
      if (colonnesAEmprunt(c.posees[1].a, c.posees[1].b).length === 1) uneRet++;
      if (colonnesAEmprunt(c.posees[2].a, c.posees[2].b).length >= 2) plusieursRet++;
      if (String(c.posees[3].a).length === 4) quatre++;
    }
  }
  verifier(hors === 0, `soustractions : toujours un grand nombre moins un plus petit, sous 10 000 (${tir} tirages)`);
  verifier(sansEmprunt === tir, 'la 1re soustraction est sans retenue');
  verifier(uneRet === tir, 'la 2e a exactement une retenue');
  verifier(plusieursRet === tir, 'la 3e a plusieurs retenues');
  verifier(quatre >= 80 && quatre <= tir, `la 4e a 4 chiffres (${quatre} fois sur ${tir}, toujours avec « Jusqu’à 9 999 » et « Les deux »)`);
}

/* S2. Corrigé exact, retenues selon la leçon */
const cs = tirer(sous, optionsParDefaut(sous));
const ds = new JSDOM(`<div>${rendre(sous, cs, { corrige: true })}</div>`).window.document;
verifier(ds.querySelectorAll('.feuille').length === 2, 'soustraction : page élève + corrigé');
const corrigeS = ds.querySelector('.feuille--corrige');
const attendusS = [...cs.posees.slice(0, 4), ...cs.aposer.slice(0, 3)].map((o) => o.a - o.b);
const trouvesS = [...corrigeS.querySelectorAll('.operations .op')].map((op) =>
  nombre([...op.querySelectorAll('.pose__resultat .reponse')].map((td) => td.textContent).join('')));
verifier(JSON.stringify(trouvesS) === JSON.stringify(attendusS), `soustraction : les ${attendusS.length} résultats du corrigé sont exacts`);

// Le signe de chaque opération est bien « − ».
verifier([...ds.querySelectorAll('.feuille .operations .pose__nombre--derniere .signe')].every((td) => td.textContent === '−'),
  'toutes les opérations portent le signe −');

// Notation de la leçon : on lit les trois lignes (retenues / nombre du haut / nombre du bas) du corrigé
// et on vérifie que, colonne par colonne, les chiffres « cassés » redonnent bien le résultat.
{
  let toutBon = true, vus = 0;
  const ops = [...corrigeS.querySelectorAll('.operations .op')];
  ops.forEach((op) => {
    const lire = (sel) => [...op.querySelectorAll(`${sel} td`)].slice(1);
    const haut = lire('.pose__retenues').map((td) => td.textContent.trim());
    const cellulesHaut = lire('.pose__nombre:not(.pose__nombre--derniere)');
    const bas = lire('.pose__nombre--derniere').map((td) => +td.textContent || 0);
    const res = lire('.pose__resultat').map((td) => +td.textContent || 0);
    const n = res.length;
    // valeur utilisée pour la soustraction dans chaque colonne : le nouveau chiffre écrit au-dessus
    // si la colonne a prêté, sinon ce qui est écrit dans la cellule (« 12 » = 10 + 2).
    const valeurs = cellulesHaut.map((td, i) => haut[i] !== '' ? +haut[i] : +td.textContent || 0);
    for (let i = 0; i < n; i++) {
      vus++;
      if (valeurs[i] - bas[i] !== res[i]) toutBon = false;
      // une cellule barrée a toujours un chiffre au-dessus, et inversement
      if (cellulesHaut[i].classList.contains('barre') !== (haut[i] !== '')) toutBon = false;
    }
  });
  verifier(toutBon && vus > 0, `retenues du corrigé cohérentes avec la leçon : chiffre barré + nouveau chiffre au-dessus, ${vus} colonnes lues`);
}

// Placement exact : on rejoue l'exemple de la leçon (4 268 − 1 951) et un cas à retenues enchaînées.
{
  const rendu = (a, b) => {
    const html = rendre(sous, { ...cs, posees: [{ a, b, largeur: String(a).length }], aposer: [], verifications: [], problemes: [], methode: { ...cs.methode } }, { corrige: true, methode: true });
    const doc = new JSDOM(`<div>${html}</div>`).window.document;
    const op = doc.querySelector('.feuille--corrige .operations .op');
    return {
      haut: [...op.querySelectorAll('.pose__retenues td')].slice(1).map((td) => td.textContent.trim()),
      depart: [...op.querySelectorAll('.pose__nombre:not(.pose__nombre--derniere) td')].slice(1).map((td) => td.textContent.trim()),
      barres: [...op.querySelectorAll('.pose__nombre:not(.pose__nombre--derniere) td')].slice(1).map((td) => td.classList.contains('barre')),
    };
  };
  const ex = rendu(4268, 1951);
  verifier(JSON.stringify(ex.haut) === JSON.stringify(['3', '', '', '']) && JSON.stringify(ex.depart) === JSON.stringify(['4', '12', '6', '8'])
    && JSON.stringify(ex.barres) === JSON.stringify([true, false, false, false]),
    `4 268 − 1 951 noté comme dans le livret : 3 au-dessus du 4 barré, 12 dans la colonne des centaines (${ex.haut} / ${ex.depart})`);
  const ex2 = rendu(736, 482);
  verifier(JSON.stringify(ex2.haut) === JSON.stringify(['6', '', '']) && JSON.stringify(ex2.depart) === JSON.stringify(['7', '13', '6']),
    `736 − 482 noté comme dans le livret : 6 au-dessus du 7 barré, 13 dizaines (${ex2.haut} / ${ex2.depart})`);
  const ex3 = rendu(62, 27);
  verifier(JSON.stringify(ex3.haut) === JSON.stringify(['5', '']) && JSON.stringify(ex3.depart) === JSON.stringify(['6', '12']),
    `62 − 27 noté comme dans le livret : 5 au-dessus du 6 barré, 12 unités (${ex3.haut} / ${ex3.depart})`);
  const ex4 = rendu(534, 276);   // retenues enchaînées : la colonne des dizaines reçoit puis prête
  verifier(JSON.stringify(ex4.haut) === JSON.stringify(['4', '12', '']) && JSON.stringify(ex4.depart) === JSON.stringify(['5', '13', '14']),
    `534 − 276 : retenues enchaînées notées (${ex4.haut} / ${ex4.depart})`);
}

// Vérifications par l'addition et problèmes.
verifier(cs.verifications.length === 3 && cs.verifications.every((v) => v.r === v.a - v.b && v.r + v.b === v.a),
  'les 3 vérifications : résultat + nombre retiré = nombre de départ');
verifier([...corrigeS.querySelectorAll('.verification--corrigee strong')].map((e) => nombre(e.textContent)).join() === cs.verifications.map((v) => v.a).join(),
  'le corrigé des vérifications redonne les nombres de départ');
verifier(cs.problemes.length === 2 && cs.problemes.every((p) => p.phrase.includes(String(p.a - p.b).replace(/\B(?=(\d{3})+(?!\d))/g, ' '))),
  'les phrases réponses des problèmes donnent la bonne différence');

/* S3. Stabilité, options d'impression */
verifier(rendre(sous, cs, { corrige: true }) === rendre(sous, cs, { corrige: true }), 'soustraction : un même contenu donne toujours la même fiche');
verifier(!rendre(sous, cs, { corrige: false }).includes('feuille--corrige'), 'soustraction : sans corrigé, une seule page');
{
  const av = rendre(sous, cs, { corrige: false, methode: true });
  const sa = rendre(sous, cs, { corrige: false, methode: false });
  verifier(av.includes('Je me souviens de la méthode') && !sa.includes('Je me souviens de la méthode'), 'soustraction : rappel de méthode masquable');
  verifier(compter(sa, /class="op"/g) > compter(av, /class="op"/g), `soustraction : sans la méthode, plus d’opérations (${compter(sa, /class="op"/g)} contre ${compter(av, /class="op"/g)})`);
  verifier(av.includes(`${fmt(4268)} − ${fmt(1951)} = ${fmt(2317)}`), 'l’exemple du livret (4 268 − 1 951 = 2 317) est rappelé');
  verifier((av.match(/<ol class="methode__etapes">(.*?)<\/ol>/s)[1].match(/<li>/g) || []).length === 4, 'la méthode compte 4 étapes');
}
for (const methode of [true, false]) {
  const doc = new JSDOM(`<div>${rendre(sous, cs, { corrige: true, methode })}</div>`).window.document;
  const [pe, pc] = doc.querySelectorAll('.feuille');
  const nbE = pe.querySelectorAll('.operations .op').length, nbC = pc.querySelectorAll('.operations .op').length;
  verifier(nbE === nbC && nbE === (methode ? 7 : 12), `soustraction ${methode ? 'avec' : 'sans'} la méthode : ${nbE} opérations imprimées, ${nbC} corrigées`);
  const nbProbE = pe.querySelectorAll('.probleme').length, nbProbC = pc.querySelectorAll('.probleme').length;
  const nbVerE = pe.querySelectorAll('.verification').length, nbVerC = pc.querySelectorAll('.verification').length;
  verifier(nbProbE === 2 && nbProbC === 2 && nbVerE === 3 && nbVerC === 3, `soustraction ${methode ? 'avec' : 'sans'} la méthode : 3 vérifications et 2 problèmes des deux côtés`);
}
verifier(!rendre(sous, cs, { identite: false }).includes('Nom :'), 'soustraction : ligne Nom / Date retirable');
verifier(!rendre(sous, cs, { identite: true }).split('feuille--corrige')[1].includes('Nom :'), 'soustraction : pas de Nom / Date sur le corrigé');

/* S4. Rien d'écrit sur la page élève, ton positif */
{
  const eleve = ds.querySelectorAll('.feuille')[0];
  verifier(eleve.querySelectorAll('.operations .pose__resultat .reponse').length === 0
    && eleve.querySelectorAll('.operations .retenue:not(:empty), .operations .barre, .operations .un').length === 0,
    'soustraction : la page élève ne contient ni réponse, ni retenue');
  verifier(eleve.querySelectorAll('.methode .pose__resultat .reponse').length === 4 && eleve.querySelectorAll('.methode .barre').length === 1,
    'soustraction : l’exemple de la méthode est corrigé (4 chiffres, une colonne barrée)');
  const texte = ds.body.textContent.toLowerCase();
  verifier(!/\b(faux|erreur|raté|nul|négatif)\b/.test(texte) && !texte.includes('✘') && !texte.includes('❌'), 'aucun mot négatif sur la feuille');
}

/* S5. Code et graine */
{
  const rej = decoder(cs.code);
  verifier(!!rej && rej.fiche === sous, `le code ${cs.code} désigne la fiche de soustraction`);
  verifier(JSON.stringify(tirer(rej.fiche, rej.options, rej.graine)) === JSON.stringify(cs), 'soustraction : le code redonne exactement les mêmes exercices');
  for (const taille of ['3', '4', 'mix']) {
    const c = tirer(sous, { taille }), d2 = decoder(c.code);
    verifier(d2.fiche === sous && d2.options.taille === taille, `soustraction : option « ${taille} » conservée dans le code`);
  }
  const vus = new Set();
  for (let i = 0; i < 200; i++) vus.add(tirer(sous, { taille: 'mix' }).code);
  verifier(vus.size > 190, `soustraction : codes variés (${vus.size} sur 200)`);
  // l'ancien code d'addition désigne toujours l'addition
  verifier(decoder(contenu.code).fiche === fiche, 'un code d’addition déjà imprimé désigne toujours l’addition');
}

/* ================================================================== */
/* Multiplication                                                      */
/* ================================================================== */

const mult = FICHES.find((f) => f.id === 'ce2-multiplication');
verifier(FICHES.indexOf(mult) === 2, 'la multiplication garde sa place dans FICHES (les codes imprimés ne bougent pas)');
verifier(JSON.stringify(mult.options[0].valeurs.map((v) => v.v)) === '["1","2"]' && mult.options[0].defaut === '2' && mult.options[0].id === 'facteur',
  'option « facteur » : 1 puis 2, défaut 2');

// Lecture d'une grille de multiplication du corrigé : lignes de cellules sans la colonne du signe.
const lireGrille = (op) => {
  const lignes = [...op.querySelectorAll('tr')].map((tr) => ({
    classes: tr.className,
    cellules: [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()),
    brut: [...tr.querySelectorAll('td')],
  }));
  return lignes;
};
const ligneNombre = (l) => nombre(l.cellules.slice(1, -1).join(''));   // sans signe ni note

/* M1. Programme, forme des produits, tirages */
{
  let hors = 0, tir = 0, zeros = 0;
  for (const facteur of ['1', '2']) {
    for (let i = 0; i < 60; i++) {
      const c = tirer(mult, { facteur });
      tir++;
      for (const o of c.posees1) if (o.a < 10 || o.a > 999 || o.b < 2 || o.b > 9 || o.a * o.b > 9999) hors++;
      for (const o of c.posees2) {
        if (c.deux) { if (o.a < 10 || o.a > 99 || o.b < 10 || o.b > 99 || o.a * o.b >= 10000) hors++; }
        else if (o.a < 10 || o.a > 999 || o.b < 2 || o.b > 9) hors++;
      }
      for (const o of c.enligne) if (o.a < 3 || o.a > 9 || o.b < 12 || o.b > 19) hors++;
      for (const o of c.problemes) if (o.a < 10 || o.a > 99 || o.b < 2 || o.b > 9) hors++;
      for (const o of [...c.posees1, ...c.posees2]) if (/0/.test(`${o.a}${o.b}`)) zeros++;
      if (c.deux !== (facteur === '2')) hors++;
    }
  }
  verifier(hors === 0, `multiplication : facteurs raisonnables pour le CE2 (≤ 999 × 9, ≤ 99 × 99), ${tir} tirages`);
  verifier(zeros === 0, 'multiplication : pas de 0 dans les facteurs posés');
}

/* M2. Corrigé exact, lignes partielles, retenues */
const optionsMult = [{ facteur: '1' }, { facteur: '2' }];
for (const opt of optionsMult) {
  const cm = tirer(mult, opt);
  for (const methode of [true, false]) {
    const doc = new JSDOM(`<div>${rendre(mult, cm, { corrige: true, methode })}</div>`).window.document;
    const [pe, pc] = doc.querySelectorAll('.feuille');
    const nom = `multiplication (facteur ${opt.facteur}, ${methode ? 'avec' : 'sans'} méthode)`;
    const aTraiter = [...cm.posees1.slice(0, methode ? 3 : 6), ...cm.posees2.slice(0, methode ? 2 : (cm.deux ? 3 : 4))];
    const ops = [...pc.querySelectorAll('.operations .op')];
    verifier(ops.length === aTraiter.length, `${nom} : ${ops.length} multiplications corrigées`);
    let produitsOk = true, partielsOk = true, retOk = true, cellulesOk = true;
    ops.forEach((op, k) => {
      const { a, b } = aTraiter[k];
      const L = lireGrille(op);
      const n = L[0].cellules.length;
      if (!L.every((l) => l.cellules.length === n)) cellulesOk = false;
      const res = L.find((l) => l.classes.includes('pose__resultat'));
      if (ligneNombre(res) !== a * b) produitsOk = false;
      const nombres = L.filter((l) => l.classes.includes('pose__nombre'));
      if (ligneNombre(nombres[0]) !== a || ligneNombre(nombres[1]) !== b) produitsOk = false;
      const colonnes = res.cellules.length - 2;
      if (b >= 10) {
        const p1 = nombres[2], p2 = nombres[3];
        const lire = (l) => nombre(l.cellules.slice(1, 1 + colonnes).join(''));
        if (lire(p1) !== a * (b % 10) || lire(p2) !== a * Math.floor(b / 10) * 10) partielsOk = false;
        // la ligne des dizaines est décalée d'une colonne : son dernier chiffre est le 0 des unités
        if (p2.cellules[colonnes] !== '0') partielsOk = false;
        // la note de droite rappelle le calcul de la ligne
        if (p1.cellules[colonnes + 1] !== `${b % 10} × ${a}` || p2.cellules[colonnes + 1] !== `${Math.floor(b / 10) * 10} × ${a}`) partielsOk = false;
        // petites retenues de l'addition : au-dessus du chiffre suivant, là où la somme dépasse 9
        const somme = L.find((l) => l.classes.includes('pose__retenues--somme'));
        const A1 = String(a * (b % 10)).padStart(colonnes, '0'), A2 = String(a * Math.floor(b / 10) * 10).padStart(colonnes, '0');
        let r = 0; const attendu = Array(colonnes).fill('');
        for (let i = colonnes - 1; i >= 0; i--) { const s = +A1[i] + +A2[i] + r; r = s >= 10 ? 1 : 0; if (r && i > 0) attendu[i - 1] = '1'; }
        if (somme.cellules.slice(1, 1 + colonnes).join('|') !== attendu.join('|')) retOk = false;
        // les retenues de l'addition sont entre les deux lignes partielles
        const iSomme = L.findIndex((l) => l.classes.includes('pose__retenues--somme'));
        if (L[iSomme - 1] !== p1 || L[iSomme + 1] !== p2) retOk = false;
      }
      // Retenues de la multiplication : comme dans le livret, en petit à droite de la ligne du
      // facteur (colonne des notes), l'une après l'autre, la précédente barrée. Recalculées ici.
      const suite = (d) => {
        const A = String(a).split('').reverse().map(Number); const s = []; let r = 0;
        for (let j = 0; j + 1 < A.length; j++) { r = Math.floor((A[j] * d + r) / 10); if (r) s.push(r); }
        return s;
      };
      const suites = (b >= 10 ? [suite(b % 10), suite(Math.floor(b / 10))] : [suite(b)]).filter((s) => s.length);
      const attendues = suites.flatMap((s) => s.map((r, i) => `${r}${i < s.length - 1 ? '~' : ''}`));
      const ligneFacteur = L.find((l) => l.classes.includes('pose__nombre--derniere') && !l.classes.includes('pose__partiel'));
      const noteTd = ligneFacteur.brut[ligneFacteur.brut.length - 1];
      const trouvees = [...noteTd.querySelectorAll('.retenue')].map((s) => `${s.textContent}${s.classList.contains('retenue--barree') ? '~' : ''}`);
      if (noteTd.className !== 'note' || trouvees.join() !== attendues.join()) retOk = false;
      // plus de rangée de retenues au-dessus des chiffres
      if (L.some((l) => l.classes === 'pose__retenues' || l.classes.includes('--dizaines'))) retOk = false;
    });
    verifier(produitsOk, `${nom} : les produits du corrigé sont exacts (recalculés)`);
    verifier(partielsOk, `${nom} : lignes partielles exactes (a × unités ; a × dizaines décalé, avec son 0)`);
    verifier(retOk, `${nom} : retenues notées à droite du facteur, l’une après l’autre, la précédente barrée`);
    verifier(cellulesOk, `${nom} : toutes les lignes d'une grille ont le même nombre de cellules`);

    const nbE = pe.querySelectorAll('.operations .op').length, nbC = pc.querySelectorAll('.operations .op').length;
    verifier(nbE === nbC && nbE === aTraiter.length, `${nom} : ${nbE} multiplications posées côté élève, ${nbC} côté corrigé`);
    verifier(pe.querySelectorAll('.decompositions li').length === pc.querySelectorAll('.decompositions li').length
      && pe.querySelectorAll('.decompositions li').length === (methode ? 3 : 6), `${nom} : produits en ligne identiques des deux côtés`);
    verifier(pe.querySelectorAll('.probleme').length === 2 && pc.querySelectorAll('.probleme').length === 2, `${nom} : 2 problèmes des deux côtés`);
    // Grilles vides des problèmes : même structure que les autres.
    verifier([...pe.querySelectorAll('.pose')].every((t) => new Set([...t.querySelectorAll('tr')].map((tr) => tr.children.length)).size === 1),
      `${nom} : grilles de la page élève rectangulaires`);
    // Corrigé en ligne détaillé : a × b = a × 10 + a × u = a×10 + a×u = produit
    const lignesEnligne = [...pc.querySelectorAll('.decompositions li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    const attenduEnligne = cm.enligne.slice(0, methode ? 3 : 6).map((o, i) =>
      `${lettre(i)}. ${o.a} × ${o.b} = ${o.a} × 10 + ${o.a} × ${o.b - 10} = ${o.a * 10} + ${o.a * (o.b - 10)} = ${o.a * o.b}`);
    verifier(JSON.stringify(lignesEnligne) === JSON.stringify(attenduEnligne), `${nom} : calculs en ligne détaillés et exacts`);
    // Problèmes
    verifier(cm.problemes.every((p) => p.phrase.includes(fmt(p.a * p.b))), `${nom} : phrases réponses = bons produits`);

    // Page élève : aucune réponse, aucune retenue, hors exemple du rappel
    const bad = pe.querySelectorAll('.operations .reponse, .operations .retenue:not(:empty), .decompositions strong, .probleme strong').length;
    verifier(bad === 0, `${nom} : la page élève ne contient aucune réponse`);
    verifier(methode ? pe.querySelectorAll('.methode .pose__resultat .reponse').length > 0 : !pe.textContent.includes('Je me souviens'),
      `${nom} : exemple du rappel corrigé / rappel masqué`);
  }
}

// Exemples et mots de la leçon
{
  const c2 = tirer(mult, { facteur: '2' }), c1 = tirer(mult, { facteur: '1' });
  const h2 = rendre(mult, c2, { corrige: false }), h1 = rendre(mult, c1, { corrige: false });
  const d2 = new JSDOM(`<div>${h2}</div>`).window.document, d1 = new JSDOM(`<div>${h1}</div>`).window.document;
  verifier(h2.includes('Méthode de Mila') && h2.includes('Méthode d’Enzo') && h2.includes('9 fois 10 plus 9 fois 5'), 'multiplication : les deux méthodes en ligne (Mila, Enzo) sont rappelées');
  verifier(h2.includes('5 × 7u = 35u') && h2.includes('je retiens 3d') && h2.includes('2m 1c'), 'multiplication : étapes de 427 × 5 avec les mots de la leçon');
  verifier(d2.querySelectorAll('.methode__exemple').length === 2 && d1.querySelectorAll('.methode__exemple').length === 1, 'multiplication : 14 × 23 rappelé seulement avec l’option × 2 chiffres');
  verifier(h2.includes('92 + 230 = 322') && !h1.includes('92 + 230 = 322'), 'multiplication : 14 × 23 = 322 par 92 + 230');
  const premier = d2.querySelector('.methode__exemple .pose__resultat');
  verifier([...premier.querySelectorAll('td')].map((td) => td.textContent).join('') === '2135', 'l’exemple 427 × 5 donne 2 135');
  verifier(d1.querySelectorAll('.feuille .operations .pose--multiplication').length === 3 + 2, 'option × 1 chiffre : ex. 3 remplacé par 2 multiplications × 1 chiffre de plus (3 + 2 grilles)');
  verifier([...d1.querySelectorAll('.operations .pose__nombre--derniere')].every((tr) => tr.querySelectorAll('td').length > 0)
    && d1.querySelectorAll('.pose__partiel').length === 0, 'option × 1 chiffre : aucune ligne partielle');
  verifier(d2.querySelectorAll('.feuille .operations .pose__partiel').length === 4, 'option × 2 chiffres : 2 grilles à 2 lignes partielles');
}

// Signe, ton, stabilité, code
{
  const cm = tirer(mult, optionsParDefaut(mult));
  const html = rendre(mult, cm, { corrige: true });
  const doc = new JSDOM(`<div>${html}</div>`).window.document;
  verifier([...doc.querySelectorAll('.pose__nombre--derniere:not(.pose__partiel) .signe')].every((td) => td.textContent === '×'), 'toutes les multiplications portent le signe ×');
  const texte = doc.body.textContent.toLowerCase();
  verifier(!/\b(faux|erreur|raté|nul|négatif)\b/.test(texte) && !texte.includes('✘') && !texte.includes('❌'), 'multiplication : aucun mot négatif');
  verifier(!/<[^>]*>[^<]*[\u{1F300}-\u{1FAFF}✖]/u.test(html.replace(/<h1[^>]*>.*?<\/h1>/s, '')), 'multiplication : pas d’emoji sur la feuille');
  verifier(html === rendre(mult, cm, { corrige: true }), 'multiplication : un même contenu donne toujours la même fiche');
  verifier(!rendre(mult, cm, { identite: true }).split('feuille--corrige')[1].includes('Nom :'), 'multiplication : pas de Nom / Date sur le corrigé');
  const rej = decoder(cm.code);
  verifier(!!rej && rej.fiche === mult && rej.options.facteur === '2', `le code ${cm.code} désigne la fiche de multiplication et son option`);
  verifier(JSON.stringify(tirer(rej.fiche, rej.options, rej.graine)) === JSON.stringify(cm), 'multiplication : le code redonne exactement les mêmes exercices');
  for (const facteur of ['1', '2']) {
    const d2 = decoder(tirer(mult, { facteur }).code);
    verifier(d2.fiche === mult && d2.options.facteur === facteur, `multiplication : option « ${facteur} » conservée dans le code`);
  }
  const vus = new Set();
  for (let i = 0; i < 200; i++) vus.add(tirer(mult, { facteur: '2' }).code);
  verifier(vus.size > 190, `multiplication : codes variés (${vus.size} sur 200)`);
}

// Addition et soustraction : rendu inchangé (tirage à graine fixe, structure et résultats).
{
  const a = tirer(fiche, { taille: 'mix' }, 424242), s = tirer(sous, { taille: 'mix' }, 424242);
  verifier(decoder(a.code).fiche === fiche && decoder(s.code).fiche === sous, 'addition et soustraction gardent leurs codes');
  verifier(FICHES[0].options.length === 1 && FICHES[1].options.length === 1
    && FICHES[0].options[0].valeurs.map((v) => v.v).join() === '3,4,mix' && FICHES[1].options[0].valeurs.map((v) => v.v).join() === '3,4,mix',
    'addition et soustraction : options inchangées');
  const html = rendre(fiche, a, { corrige: true }) + rendre(sous, s, { corrige: true });
  verifier(!html.includes('pose--multiplication') && !html.includes('methode--multiplication'), 'addition et soustraction : aucune trace du rendu de multiplication');
}

/* Nombres : lire, écrire, décomposer ---------------------------------- */
{
  const nb = FICHES.find((f) => f.id === 'ce2-nombres-lire-ecrire');
  console.log('— Nombres : lire, écrire, décomposer');
  verifier(FICHES.indexOf(nb) === 3 && FICHES.length >= 5, 'nombres : fiche à son rang dans FICHES (index 3)');
  verifier(nb.options[0].valeurs.map((v) => v.v).join() === '1000,10000' && nb.options[0].defaut === '10000', 'nombres : option taille 1000 / 10000, défaut 10000');

  // Écriture en lettres recalculée par une autre méthode que enLettres (nombres sans 0).
  const U = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const ADO = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const DZ = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };
  const deuxChiffres = (d, u) => {
    if (d === 0) return U[u];
    if (d === 1) return ADO[u];
    if (d === 7) return 'soixante-' + (u === 1 ? 'et-onze' : ADO[u]);
    if (d === 9) return 'quatre-vingt-' + ADO[u];
    if (d === 8) return u ? 'quatre-vingt-' + U[u] : 'quatre-vingts';
    return DZ[d] + (u === 0 ? '' : (u === 1 ? '-et-un' : '-' + U[u]));
  };
  const troisChiffres = (c, d, u) => {
    const reste = deuxChiffres(d, u);
    const tete = c === 0 ? '' : (c === 1 ? 'cent' : U[c] + '-cent');
    return [tete, reste].filter(Boolean).join('-');
  };
  const lettresDe = (n) => {
    const m = Math.floor(n / 1000), r = n % 1000;
    const reste = troisChiffres(Math.floor(r / 100), Math.floor(r / 10) % 10, r % 10);
    const mille = m === 0 ? '' : (m === 1 ? 'mille' : U[m] + '-mille');
    return [mille, reste].filter(Boolean).join('-');
  };
  verifier(lettresDe(3258) === 'trois-mille-deux-cent-cinquante-huit' && lettresDe(863) === 'huit-cent-soixante-trois', 'nombres : l’écriture de référence redonne 3 258 et 863');

  const lireTexte = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const N = (s) => String(s).replace(/\s+/g, ' ');
  const sansEspace = (s) => s.replace(/\s/g, '');
  const tableCorrige = (table) => [...table.querySelectorAll('tr')].slice(1).map((tr) => [...tr.children].map((td) => td.textContent.trim()));

  for (const taille of ['1000', '10000']) {
    const [min, max] = taille === '1000' ? [100, 999] : [1000, 9999];
    const quatre = taille === '10000';
    for (const methode of [true, false]) {
      const nom = `nombres ${taille} ${methode ? 'avec' : 'sans'} méthode`;
      const c = tirer(nb, { taille }, 987654);
      const doc = new JSDOM(`<div>${rendre(nb, c, { corrige: true, methode })}</div>`).window.document;
      const [pe, pc] = doc.querySelectorAll('.feuille');
      const k = { lire: methode ? 4 : 6, decomp: methode ? 3 : 4, combien: methode ? 4 : 6, tab: methode ? 4 : 6 };

      // bornes
      const tous = [...c.lire, ...c.ecrire, ...c.decomp.map((d) => d.n), ...c.recomp, ...c.combien, ...c.tableau.map((l) => l.n)];
      verifier(tous.every((n) => n >= min && n <= max && !String(n).includes('0')), `${nom} : nombres dans les bornes ${min}–${max}`);

      // exercice 1 : corrigé recalculé
      const [ulire, uecrire] = pc.querySelectorAll('.bloc')[0].querySelectorAll('ul');
      const l1 = [...ulire.querySelectorAll('li')].map(lireTexte);
      const a1 = c.lire.slice(0, k.lire).map((n, i) => `${lettre(i)}. ${lettresDe(n)} = ${fmt(n)}`).map(N);
      verifier(JSON.stringify(l1) === JSON.stringify(a1), `${nom} : ex. 1, lettres vers chiffres exacts`);
      const l2 = [...uecrire.querySelectorAll('li')].map(lireTexte);
      const a2 = c.ecrire.slice(0, k.lire).map((n, i) => `${lettre(k.lire + i)}. ${fmt(n)} = ${lettresDe(n)}`).map(N);
      verifier(JSON.stringify(l2) === JSON.stringify(a2), `${nom} : ex. 1, chiffres vers lettres exacts (recalculés)`);
      verifier(c.lire.concat(c.ecrire).every((n) => fmt(n).replace(/\s/g, '') === String(n) && (n < 1000 || /^\d \d{3}$/.test(fmt(n).replace(/\s/, ' ')))), `${nom} : espaces des milliers`);

      // exercice 2
      const lis2 = [...pc.querySelectorAll('.bloc')[1].querySelectorAll('li')];
      verifier(pc.querySelectorAll('.bloc')[1].querySelectorAll('ul').length === 1 && lis2.length % 2 === 0, `${nom} : ex. 2 dans une seule grille à deux colonnes`);
      const termes = (n) => String(n).split('').map((ch, i, a) => +ch * 10 ** (a.length - 1 - i));
      const g = (v) => fmt(v);
      const d2 = lis2.slice(0, k.decomp).map(lireTexte);
      const ad2 = c.decomp.slice(0, k.decomp).map(({ n }, i) => `${lettre(i)}. ${fmt(n)} = ${termes(n).map(g).join(' + ')}`).map(N);
      verifier(JSON.stringify(d2) === JSON.stringify(ad2), `${nom} : ex. 2, décompositions exactes`);
      const r2 = lis2.slice(k.decomp).map(lireTexte);
      const ar2 = c.recomp.slice(0, k.decomp).map((n, i) => `${lettre(k.decomp + i)}. ${termes(n).map(g).join(' + ')} = ${fmt(n)}`).map(N);
      verifier(JSON.stringify(r2) === JSON.stringify(ar2), `${nom} : ex. 2, recompositions exactes`);
      verifier(c.decomp.every((d) => d.vides.length === 2 && new Set(d.vides).size === 2), `${nom} : deux termes à compléter par décomposition`);

      // exercice 3 : nombres de dizaines et de centaines ENTIÈRES
      const e3 = [...pc.querySelectorAll('.bloc')[2].querySelectorAll('li')].map(lireTexte);
      const ae3 = c.combien.slice(0, k.combien).map((n, i) => `${lettre(i)}. Dans ${fmt(n)} : ${parseInt(String(n).slice(0, -1), 10)} dizaines ; ${parseInt(String(n).slice(0, -2), 10)} centaines`).map(N);
      verifier(JSON.stringify(e3) === JSON.stringify(ae3), `${nom} : ex. 3, dizaines et centaines entières (ex. ${e3[0]})`);

      // exercice 4 : tableaux remplis
      const [tn, tc] = pc.querySelectorAll('.tab-num');
      const lignes = c.tableau.slice(0, k.tab);
      const att1 = lignes.filter((l) => l.sens === 'nombre').map((l) => [fmt(l.n), ...String(l.n).split('')]);
      const att2 = lignes.filter((l) => l.sens === 'colonnes').map((l) => [fmt(l.n), ...String(l.n).split('')]);
      verifier(JSON.stringify(tableCorrige(tn)) === JSON.stringify(att1) && JSON.stringify(tableCorrige(tc)) === JSON.stringify(att2), `${nom} : ex. 4, tableaux de numération remplis`);
      const entetes = [...tn.querySelector('tr').children].map((td) => td.textContent.trim()).join();
      verifier(entetes === (quatre ? 'nombre,m,c,d,u' : 'nombre,c,d,u'), `${nom} : colonnes ${entetes}`);
      verifier(att1.length === lignes.length / 2 && att2.length === lignes.length / 2 && lignes.length === (methode ? 4 : 6), `${nom} : tableau, moitié nombre donné / moitié colonnes données (${lignes.length} lignes)`);

      // mêmes comptes élève / corrigé
      const compte = (page) => { const b = page.querySelectorAll('.bloc:not(.bloc--methode)'); return [0, 1, 2].map((i) => b[i].querySelectorAll('li').length).concat(b[3].querySelectorAll('.tab-num tr').length); };
      verifier(JSON.stringify(compte(pe)) === JSON.stringify(compte(pc)),
        `${nom} : mêmes comptes élève et corrigé (${compte(pe)})`);
      verifier(compte(pe)[0] === 2 * k.lire && compte(pe)[1] === 2 * k.decomp && compte(pe)[2] === k.combien, `${nom} : ${compte(pe).slice(0, 3).join(' + ')} lignes`);

      // aucune réponse sur la page élève (hors exemple du rappel)
      const eleve = pe.cloneNode(true);
      eleve.querySelectorAll('.bloc--methode').forEach((n) => n.remove());
      verifier(eleve.querySelectorAll('.rouge').length === 0 && ![...eleve.querySelectorAll('.tab-num .vide')].some((td) => td.textContent.trim()), `${nom} : aucune réponse sur la page élève`);
      const ligne1 = lireTexte(eleve.querySelectorAll('.bloc')[0].querySelector('li'));
      verifier(!sansEspace(ligne1).includes(String(c.lire[0])), `${nom} : le nombre à trouver n’est pas écrit`);
      verifier(methode ? pe.textContent.includes('Je me souviens de la méthode') : !pe.textContent.includes('Je me souviens'), `${nom} : rappel présent / masqué`);

      // ton et emoji
      const texte = doc.body.textContent.toLowerCase();
      verifier(!/\b(faux|erreur|raté|nul|négatif)\b/.test(texte) && !/[✘❌✖]/.test(texte), `${nom} : aucun mot négatif`);
      verifier(!/[\u{1F300}-\u{1FAFF}]/u.test(rendre(nb, c, { corrige: true, methode }).replace(/<h1[^>]*>.*?<\/h1>/gs, '')), `${nom} : pas d’emoji sur la feuille`);
    }
  }

  // Rappel : mots de la leçon
  {
    const h = N(rendre(nb, tirer(nb, { taille: '10000' }, 1), { corrige: false }));
    verifier(['trois-mille-deux-cent-cinquante-huit', '3 milliers + 258 unités', '3 000 + 200 + 50 + 8', '(3 × 1 000) + (2 × 100) + (5 × 10) + (8 × 1)', '32 centaines + 5 dizaines + 8 unités',
      '3 milliers + 2 centaines + 5 dizaines + 8 unités', '1 millier = 10 centaines = 100 dizaines = 1 000 unités', 'La valeur du chiffre dépend de sa position dans l’écriture du nombre'].every((s) => h.includes(s)), 'nombres : le rappel reprend l’exemple 3 258 et les mots du livret');
    const h3 = N(rendre(nb, tirer(nb, { taille: '1000' }, 1), { corrige: false }));
    verifier(h3.includes('1 centaine = 10 dizaines = 100 unités') && h3.includes('huit-cent-soixante-trois') && !h3.includes('millier'), 'nombres : option 1 000 sans millier ni colonne m');
  }

  // Codes reproductibles, nombres distincts
  for (const taille of ['1000', '10000']) {
    const c = tirer(nb, { taille });
    const r = decoder(c.code);
    verifier(r && r.fiche === nb && r.options.taille === taille && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `nombres : le code ${c.code} redonne la même fiche (${taille})`);
    const tout = [...c.lire, ...c.ecrire, ...c.decomp.map((d) => d.n), ...c.recomp, ...c.combien, ...c.tableau.map((l) => l.n)];
    verifier(new Set(tout).size === tout.length && !tout.includes(taille === '1000' ? 863 : 3258), `nombres : nombres tous différents et distincts de l’exemple (${taille})`);
  }
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(nb, {}).code);
  verifier(vus.size > 190, `nombres : codes variés (${vus.size} sur 200)`);

  // Fiches précédentes inchangées : HTML et contenu à graine fixe comparés à l’état avant la fiche.
  const empreinte = (f, o) => { const c = tirer(f, o, 424242); return JSON.stringify(c) + rendre(f, c, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const verif = [['ce2-addition-posee', 'mix'], ['ce2-soustraction-posee', 'mix'], ['ce2-multiplication', '2']].map(([id, v]) => {
    const f = FICHES.find((x) => x.id === id); return somme(empreinte(f, f.options[0].id === 'taille' ? { taille: v } : { facteur: v }));
  });
  verifier(verif.join() === '2857615915,841554819,1341628403', `addition, soustraction, multiplication : rendu inchangé (${verif.join()})`);
}

/* Nombres : comparer, ranger, encadrer ------------------------------- */
{
  const cp = FICHES.find((f) => f.id === 'ce2-nombres-comparer');
  const nbl = FICHES.find((f) => f.id === 'ce2-nombres-lire-ecrire');
  console.log('— Nombres : comparer, ranger, encadrer');
  verifier(FICHES.indexOf(cp) === 4 && FICHES.length >= 5, 'comparer : fiche à son rang dans FICHES (index 4)');
  verifier(cp.titre === 'Les nombres : comparer, ranger, encadrer' && cp.emoji === '⚖️', 'comparer : titre et emoji');
  verifier(cp.options[0].id === 'taille' && cp.options[0].valeurs.map((v) => v.v).join() === '1000,10000' && cp.options[0].defaut === '10000'
    && cp.options[0].valeurs[0].nom === 'Jusqu’à 999' && cp.options[0].valeurs[1].nom === 'Jusqu’à 9 999', 'comparer : option taille 1000 / 10000, défaut 10000');

  const num = (t) => parseInt(String(t).replace(/\s/g, ''), 10);
  const txt = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const nums = (el) => [...el.querySelectorAll('.n')].map((e) => num(e.textContent));
  // Bornes recalculées par division : multiples de 10, 100, 1 000 immédiatement inférieur et supérieur.
  const unite = { dizaine: 10, centaine: 100, millier: 1000 };
  const inf = (n, u) => n - (n % u), sup = (n, u) => n - (n % u) + u;
  const doc = (c, o) => new JSDOM(`<div>${rendre(cp, c, o)}</div>`).window.document;

  for (const taille of ['1000', '10000']) {
    const [min, max] = taille === '1000' ? [100, 999] : [100, 9999];
    for (const methode of [true, false]) {
      const nom = `comparer ${taille} ${methode ? 'avec' : 'sans'} méthode`;
      const k = methode ? { paires: 6, rang: 5, enc: 3, inter: 2, pts: 4 } : { paires: 8, rang: 6, enc: 4, inter: 3, pts: 6 };
      const c = tirer(cp, { taille }, 987654);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');

      // Comptes identiques élève / corrigé
      verifier(pe.querySelectorAll('.paire').length === k.paires && pc.querySelectorAll('.paire').length === k.paires, `${nom} : ${k.paires} paires (élève et corrigé)`);
      verifier(pe.querySelectorAll('.rang').length === 2 && pc.querySelectorAll('.rang').length === 2
        && pe.querySelectorAll('.rang')[0].querySelectorAll('.n').length === k.rang, `${nom} : 2 rangements de ${k.rang} nombres`);
      verifier(pe.querySelectorAll('.encadrement').length === k.enc && pc.querySelectorAll('.encadrement').length === k.enc
        && pe.querySelectorAll('.intercalation').length === k.inter && pc.querySelectorAll('.intercalation').length === k.inter, `${nom} : ${k.enc} encadrements et ${k.inter} intercalations`);
      verifier(pe.querySelectorAll('svg.demi-droite').length === 1 && pc.querySelectorAll('svg.demi-droite').length === 1
        && pc.querySelectorAll('.fleche').length === k.pts && pe.querySelectorAll('.fleche').length === 0, `${nom} : ${k.pts} flèches au corrigé, aucune sur la page élève`);
      verifier(pe.querySelectorAll('.bloc:not(.bloc--methode)').length === 4 && pc.querySelectorAll('.bloc').length === 4, `${nom} : 4 exercices (élève et corrigé)`);

      // Exercice 1 : symboles recalculés
      const paires = [...pc.querySelectorAll('.paire')].map((p) => ({ a: num(p.querySelector('.paire__a').textContent), b: num(p.querySelector('.paire__b').textContent), s: p.querySelector('.paire__symbole').textContent.trim() }));
      verifier(paires.every(({ a, b, s }) => s === (a < b ? '<' : a > b ? '>' : '=')), `${nom} : symboles du corrigé exacts`);
      verifier(paires.filter((p) => p.a === p.b).length === 1, `${nom} : une seule paire de nombres égaux`);
      verifier(paires.some(({ a, b }) => Math.abs(a - b) === 1), `${nom} : un piège sur le dernier chiffre`);
      verifier(paires.some(({ a, b }) => a !== b && String(a)[1] === '0' && String(b)[1] === '0') && paires.some(({ a, b }) => (String(a)[1] === '0') !== (String(b)[1] === '0')), `${nom} : pièges avec des zéros intercalés`);
      verifier(paires.every(({ a, b }) => a >= min && a <= max && b >= min && b <= max) && (taille === '1000' || paires.some(({ a, b }) => String(a).length !== String(b).length)), `${nom} : nombres dans les bornes ${min}–${max}`);
      const elevePaires = [...pe.querySelectorAll('.paire')];
      verifier(elevePaires.every((p) => p.querySelector('.case-symbole') && p.querySelector('.case-symbole').textContent.trim() === '' && !/[<>=]/.test(p.textContent)), `${nom} : cases de symboles vides sur la page élève`);

      // Exercice 2 : listes rangées, recalculées
      const eleveListes = [...pe.querySelectorAll('.rang')].map(nums);
      const corrListes = [...pc.querySelectorAll('.rang')].map(nums);
      const trie = (l, s) => l.map((n) => n).sort((x, y) => s * (x - y));
      verifier(JSON.stringify(corrListes[0]) === JSON.stringify(trie(eleveListes[0], 1)) && JSON.stringify(corrListes[1]) === JSON.stringify(trie(eleveListes[1], -1)), `${nom} : listes rangées (croissant, décroissant) exactes`);
      verifier(eleveListes.every((l) => new Set(l).size === l.length && JSON.stringify(l) !== JSON.stringify(trie(l, 1)) && JSON.stringify(l) !== JSON.stringify(trie(l, -1))), `${nom} : listes données dans le désordre`);
      const symbCorr = [...pc.querySelectorAll('.rang__reponse')].map((r) => [...r.querySelectorAll('.rang__signe')].map((e) => e.textContent.trim()).join(''));
      verifier(symbCorr[0] === '<<<<<'.slice(0, k.rang - 1) && symbCorr[1] === '>>>>>'.slice(0, k.rang - 1), `${nom} : symboles < puis > dans le corrigé`);

      // Exercice 3 : encadrements et nombres intercalés
      const encEleve = [...pe.querySelectorAll('.encadrement')].map((e) => nums(e));
      const encCorr = [...pc.querySelectorAll('.encadrement')];
      let encOk = true, ordreUnites = [];
      encCorr.forEach((li, i) => {
        const n = nums(li)[0];
        const u = li.querySelector('.ligne__texte').textContent.includes('dizaine') ? 10 : li.querySelector('.ligne__texte').textContent.includes('centaine') ? 100 : 1000;
        ordreUnites.push(u);
        const [b1, b2] = [...li.querySelectorAll('.borne')].map((e) => num(e.textContent));
        if (n !== encEleve[i][0] || b1 !== inf(n, u) || b2 !== sup(n, u) || !(b1 < n && n < b2) || n % u === 0) encOk = false;
      });
      verifier(encOk, `${nom} : encadrements justes (bornes = multiples voisins)`);
      const attendUnites = taille === '1000' ? [10, 100, 100, 10] : [10, 100, 1000, 100];
      verifier(JSON.stringify(ordreUnites) === JSON.stringify(attendUnites.slice(0, k.enc)), `${nom} : dizaine, centaine, ${taille === '1000' ? 'centaine' : 'millier'}${k.enc === 4 ? ' et un 4e' : ''} (${ordreUnites})`);
      verifier(encEleve.every((l) => l.length === 1) && [...pe.querySelectorAll('.encadrement .trou-borne')].length === 2 * k.enc, `${nom} : bornes à écrire laissées vides`);
      const interEleve = [...pe.querySelectorAll('.intercalation')].map(nums);
      let interOk = true;
      [...pc.querySelectorAll('.intercalation')].forEach((li, i) => {
        const [a, b] = nums(li);
        const v = num(li.querySelector('.borne').textContent);
        if (a !== interEleve[i][0] || b !== interEleve[i][1] || !(a < v && v < b)) interOk = false;
      });
      verifier(interOk, `${nom} : nombres intercalés strictement entre les bornes`);

      // Exercice 4 : positions proportionnelles
      const svg = pc.querySelector('svg.demi-droite');
      const x0 = +svg.dataset.x0, larg = +svg.dataset.largeur, vmax = +svg.dataset.max;
      verifier(vmax === (taille === '1000' ? 1000 : 10000), `${nom} : demi-droite jusqu’à ${vmax}`);
      const reperes = [...svg.querySelectorAll('.repere')].map((e) => ({ v: +e.dataset.valeur, x: +e.getAttribute('x') }));
      verifier(reperes.length === 11 && reperes.every(({ v, x }) => Math.abs(x - (x0 + larg * v / vmax)) < 0.01 && v % (vmax / 10) === 0), `${nom} : 11 repères étiquetés, x proportionnels aux valeurs`);
      const petits = [...svg.querySelectorAll('.graduation')];
      verifier(petits.length === 101, `${nom} : 101 graduations (petits traits tous les ${vmax / 100})`);
      const etiquettes = [...svg.querySelectorAll('.fleche__etiquette')].map((e) => ({ v: num(e.textContent), x: +e.getAttribute('x') }));
      verifier(etiquettes.length === k.pts && etiquettes.every(({ v, x }) => Math.abs(x - (x0 + larg * v / vmax)) < 0.01), `${nom} : x des étiquettes proportionnels aux valeurs`);
      const flechesX = [...svg.querySelectorAll('.fleche')].map((g) => +g.querySelector('path').getAttribute('d').match(/^M([\d.]+)/)[1]);
      verifier(flechesX.every((x, i) => Math.abs(x - etiquettes[i].x) < 0.01), `${nom} : chaque flèche est sous son étiquette`);
      const xs = etiquettes.map((e) => e.x).sort((a, b) => a - b);
      verifier(xs.every((x, i) => i === 0 || x - xs[i - 1] >= 50), `${nom} : étiquettes du corrigé espacées d’au moins 50 unités (pas de chevauchement)`);
      verifier(etiquettes.every(({ v }) => v % (vmax / 100) === 0 && v % (vmax / 10) !== 0 && v > 0 && v < vmax), `${nom} : nombres sur un petit trait, pas sur une grande graduation`);
      // la page élève liste les mêmes nombres à placer (même ensemble)
      const aPlacer = [...pe.querySelector('.consigne-droite').querySelectorAll('.n')].map((e) => num(e.textContent));
      verifier(JSON.stringify([...aPlacer].sort((a, b) => a - b)) === JSON.stringify(etiquettes.map((e) => e.v).sort((a, b) => a - b)), `${nom} : nombres à placer = nombres du corrigé`);

      // aucune réponse sur la page élève (hors rappel)
      const eleveTexte = txt(pe.querySelector('.feuille') || pe);
      const sansRappel = [...pe.querySelectorAll('.bloc:not(.bloc--methode)')].map(txt).join(' ');
      verifier(!pe.querySelector('.rouge') && !pe.querySelector('.fleche__etiquette') && !pe.querySelector('.paire__symbole'), `${nom} : aucune réponse en rouge sur la page élève`);
      const bonneListe = trie(eleveListes[0], 1).map(fmt).join(' < ');
      verifier(!sansRappel.includes(bonneListe) && !sansRappel.replace(/\s/g, '').includes(trie(eleveListes[1], -1).join('>')), `${nom} : les listes rangées ne sont pas écrites sur la page élève`);
      verifier(!pe.querySelector('svg.demi-droite').outerHTML.includes('stroke="#C0392B"'), `${nom} : demi-droite élève sans flèche`);

      // rappel présent / masqué ; ton ; emoji
      verifier(methode ? txt(pe).includes('Je me souviens de la méthode') : !txt(pe).includes('Je me souviens'), `${nom} : rappel présent / masqué`);
      verifier(!/\b(faux|erreur|raté|nul|négatif)\b/.test(d.body.textContent.toLowerCase()) && !/[✘❌✖]/.test(d.body.textContent), `${nom} : aucun mot négatif`);
      verifier(!/[\u{1F300}-\u{1FAFF}⚖]/u.test(rendre(cp, c, { corrige: true, methode }).replace(/<h1[^>]*>.*?<\/h1>/gs, '')), `${nom} : pas d’emoji sur la feuille`);
    }
  }

  // Rappel : les phrases de la leçon (pages 10 à 13)
  {
    const h = rendre(cp, tirer(cp, { taille: '10000' }, 1), { corrige: false }).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
    verifier(['Comparer deux nombres, c’est chercher quel nombre est le plus grand et quel nombre est le plus petit.',
      'on regarde le nombre de milliers ; si c’est le même, on regarde le nombre de centaines ; si c’est le même, on regarde le nombre de dizaines…',
      'On s’arrête dès que deux chiffres de même rang sont différents.', '506 < 2 302', '7 532 > 6 985', '1 238 < 1 239',
      'les écrire du plus petit au plus grand : 5 254 < 5 285 < 5 308 < 5 347', 'les écrire du plus grand au plus petit : 5 470 > 5 108 > 3 285 > 752',
      'Encadrer un nombre entier, c’est le situer entre deux autres nombres entiers.', 'Intercaler un nombre entre deux nombres, c’est trouver un nombre compris entre ces deux nombres', '5 800 < 5 823 < 5 900',
      'il faut connaître la valeur de l’écart entre deux graduations'].every((s) => h.includes(s)), 'comparer : le rappel reprend les phrases et exemples du livret');
    const h3 = rendre(cp, tirer(cp, { taille: '1000' }, 1), { corrige: false });
    verifier(!h3.includes('milliers') && h3.includes('on regarde le nombre de centaines'), 'comparer : option 1 000 sans milliers dans le rappel');
    const g = (t) => { const d = new JSDOM(`<div>${rendre(cp, tirer(cp, { taille: t }, 7), { corrige: false })}</div>`).window.document; return d.querySelector('.consigne-droite').textContent.replace(/\s+/g, ' '); };
    verifier(g('10000').includes('graduée de 1 000 en 1 000') && g('1000').includes('graduée de 100 en 100'), 'comparer : graduation adaptée à l’option');
  }

  // Codes reproductibles
  for (const taille of ['1000', '10000']) {
    const c = tirer(cp, { taille });
    const r = decoder(c.code);
    verifier(r && r.fiche === cp && r.options.taille === taille && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `comparer : le code ${c.code} redonne la même fiche (${taille})`);
  }
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(cp, {}).code);
  verifier(vus.size > 190, `comparer : codes variés (${vus.size} sur 200)`);

  // Robustesse : 300 tirages par option, contraintes tenues
  let casse = 0;
  for (const taille of ['1000', '10000']) for (let i = 0; i < 150; i++) {
    const c = tirer(cp, { taille }, 1000 + i);
    const pts = c.droite.points, u = c.droite.petit;
    if (c.paires.filter((p) => p.a === p.b).length !== 1 || c.encadrer.some((e) => e.n % unite[e.unite] === 0)
      || c.intercaler.some((e) => !(e.a < e.v && e.v < e.b)) || pts.some((v, j) => j && v - pts[j - 1] < 8 * u) || pts.some((v) => v % c.droite.grand === 0)) casse++;
  }
  verifier(casse === 0, 'comparer : contraintes tenues sur 300 tirages');

  // Fiches précédentes inchangées (empreinte du HTML à graine fixe, mesurée avant l’ajout de cette fiche)
  const empreinte = (f, o) => { const c = tirer(f, o, 424242); return JSON.stringify(c) + rendre(f, c, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h4 = ['1000', '10000'].map((t) => somme(empreinte(nbl, { taille: t })));
  verifier(h4.join() === '3247079376,2467628440', `nombres (lire, écrire) : rendu inchangé (${h4.join()})`);
}

/* Fractions : lire, écrire, représenter ------------------------------- */
{
  const fr = FICHES.find((f) => f.id === 'ce2-fractions-lire');
  console.log('— Fractions : lire, écrire, représenter');
  verifier(FICHES.indexOf(fr) === 5 && FICHES.length >= 6, 'fractions : fiche à son rang dans FICHES (index 5)');
  verifier(fr.titre === 'Les fractions : lire, écrire, représenter' && fr.emoji === '🍰' && Array.isArray(fr.options) && fr.options.length === 0, 'fractions : titre, emoji, aucune option propre');

  // Références indépendantes de la fiche : noms des fractions et nombres en lettres.
  const NOMS = { 2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 7: 'septième', 8: 'huitième', 9: 'neuvième', 10: 'dixième' };
  const NUM = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const motsDe = (n, d) => `${NUM[n]} ${NOMS[d]}${n > 1 && d !== 3 ? 's' : ''}`;
  const lireMots = (t) => {    // « trois quarts » → { n: 3, d: 4 }
    const [a, ...reste] = t.trim().split(' ');
    const nom = reste.join(' ');
    const d = Object.keys(NOMS).map(Number).find((k) => nom === NOMS[k] || nom === NOMS[k] + 's');
    return { n: NUM.indexOf(a), d };
  };
  verifier(motsDe(3, 4) === 'trois quarts' && motsDe(1, 2) === 'un demi' && motsDe(2, 3) === 'deux tiers' && motsDe(7, 8) === 'sept huitièmes', 'fractions : les noms de référence redonnent ceux de la leçon');

  const txt = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const nd = (f) => ({ n: +f.querySelector('.fraction__num').textContent, d: +f.querySelector('.fraction__den').textContent });
  const GRILLES = [4, 6, 8, 9, 10];
  const doc = (c, o) => new JSDOM(`<div>${rendre(fr, c, o)}</div>`).window.document;
  // Texte d'une affirmation, les fractions écrites « n/d ».
  const phrase = (li) => {
    const t = li.querySelector('.affirmation__texte').cloneNode(true);
    t.querySelectorAll('.fraction').forEach((f) => { const { n, d } = nd(f); f.replaceWith(`${n}/${d}`); });
    return t.textContent.replace(/\s+/g, ' ').replace(/^[a-z]\.\s*/, '').trim();
  };
  const FIXES = {
    'Le dénominateur indique en combien de parts égales on partage l’unité.': true,
    'Le dénominateur indique combien de parts on a coloriées.': false,
    'Le numérateur indique combien de parts on a coloriées.': true,
    'Le numérateur indique en combien de parts égales on partage l’unité.': false,
  };
  const verite = (t) => {
    let m;
    if (t in FIXES) return FIXES[t];
    if ((m = t.match(/^Dans (\d+)\/(\d+), le dénominateur est (\d+)\.$/))) return +m[3] === +m[2];
    if ((m = t.match(/^Dans (\d+)\/(\d+), le numérateur est (\d+)\.$/))) return +m[3] === +m[1];
    if ((m = t.match(/^(\d+)\/(\d+), c’est un (.+)\.$/))) return +m[1] === 1 && m[3] === NOMS[+m[2]];
    if ((m = t.match(/^(.+) s’écrit (\d+)\/(\d+)\.$/))) { const r = lireMots(m[1]); return r.n === +m[2] && r.d === +m[3]; }
    if ((m = t.match(/^(\d+)\/(\d+), c’est (.+) fois 1\/(\d+)\.$/))) return NUM.indexOf(m[3]) === +m[1] && +m[2] === +m[4];
    return null;
  };

  for (const methode of [true, false]) {
    const nom = `fractions ${methode ? 'avec' : 'sans'} méthode`;
    const k = methode ? { lire: 6, lettres: 4, aff: 4 } : { lire: 8, lettres: 6, aff: 6 };
    for (const graine of [987654, 1, 2, 3, 4, 5]) {
      const c = tirer(fr, {}, graine);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const tag = `${nom} (graine ${graine})`;
      const quiet = graine !== 987654;   // le détail n'est affiché que pour la première graine

      // Comptes identiques élève / corrigé
      const compte = (page, sel) => page.querySelectorAll(sel).length;
      const comptesOk = compte(pe, '.figures-lire .figure-cellule') === k.lire && compte(pc, '.figures-lire .figure-cellule') === k.lire
        && compte(pe, '.figures-colorier .figure-cellule') === 4 && compte(pc, '.figures-colorier .figure-cellule') === 4
        && compte(pe, '.ecriture--lettres') === k.lettres && compte(pc, '.ecriture--lettres') === k.lettres
        && compte(pe, '.ecriture--chiffres') === k.lettres && compte(pc, '.ecriture--chiffres') === k.lettres
        && compte(pe, '.affirmation') === k.aff && compte(pc, '.affirmation') === k.aff
        && compte(pe, '.bloc:not(.bloc--methode)') === 4 && compte(pc, '.bloc') === 4;
      if (!quiet || !comptesOk) verifier(comptesOk, `${tag} : ${k.lire} figures, 4 figures vierges, ${k.lettres} + ${k.lettres} écritures, ${k.aff} affirmations (élève et corrigé)`);

      // Ex. 1 : fraction du corrigé = parts grisées sur parts de la figure
      let ok1 = true, den = [];
      pc.querySelectorAll('.figures-lire .figure-cellule').forEach((cel, i) => {
        const svg = cel.querySelector('svg'), f = nd(cel.querySelector('.fraction'));
        const parts = svg.querySelectorAll('.part').length, gris = svg.querySelectorAll('.part--coloriee').length;
        den.push(f.d);
        if (parts !== f.d || gris !== f.n || f.n >= f.d || f.n < 1 || f.d < 2 || f.d > 10) ok1 = false;
        const eleve = pe.querySelectorAll('.figures-lire .figure-cellule')[i].querySelector('svg');
        if (eleve.querySelectorAll('.part').length !== parts || eleve.querySelectorAll('.part--coloriee').length !== gris) ok1 = false;
      });
      const formes = [...pc.querySelectorAll('.figures-lire svg')].map((s) => s.dataset.forme);
      if (!quiet || !ok1) verifier(ok1, `${tag} : exercice 1, fraction = parts grisées sur parts égales, numérateur < dénominateur`);
      verifier(quiet || (new Set(formes).size === 2 && formes.every((f) => f === 'disque' || f === 'bande') && new Set(den).size === den.length), `${tag} : disques et bandes mélangés, dénominateurs tous différents (${den})`);
      // les cases à remplir de la page élève sont vides
      verifier(compte(pe, '.figures-lire .fraction--vide') === k.lire && compte(pe, '.figures-lire .fraction--vide .case-fr') === 2 * k.lire && !pe.querySelector('.figures-lire .fraction--reponse'), `${tag} : fractions de l’exercice 1 à écrire (cases vides) sur la page élève`);

      // Ex. 2 : figures vierges à l'élève, grisées au corrigé
      let ok2 = true;
      pc.querySelectorAll('.figures-colorier .figure-cellule').forEach((cel, i) => {
        const svg = cel.querySelector('svg'), f = nd(cel.querySelector('.fraction'));
        const parts = svg.querySelectorAll('.part').length;
        if (parts !== f.d || svg.querySelectorAll('.part--coloriee').length !== f.n || f.n >= f.d || f.n < 1) ok2 = false;
        if (svg.dataset.forme === 'carre' && !GRILLES.includes(parts)) ok2 = false;
        const ev = pe.querySelectorAll('.figures-colorier .figure-cellule')[i];
        const f2 = nd(ev.querySelector('.fraction'));
        if (f2.n !== f.n || f2.d !== f.d || ev.querySelectorAll('.part').length !== parts || ev.querySelectorAll('.part--coloriee').length !== 0 || ev.querySelector('svg').dataset.forme !== svg.dataset.forme) ok2 = false;
      });
      if (!quiet || !ok2) verifier(ok2, `${tag} : exercice 2, figures vierges (fraction écrite dessous) et corrigé grisé du bon nombre de parts`);

      // Ex. 3 : lettres et chiffres recalculés
      let ok3 = true;
      const motsEleve = [...pe.querySelectorAll('.ecriture--lettres .mots')].length;
      pc.querySelectorAll('.ecriture--lettres').forEach((li, i) => {
        const f = nd(li.querySelector('.fraction'));
        if (txt(li.querySelector('.mots')) !== motsDe(f.n, f.d) || f.n >= f.d || !NOMS[f.d]) ok3 = false;
        const fe = nd(pe.querySelectorAll('.ecriture--lettres')[i].querySelector('.fraction'));
        if (fe.n !== f.n || fe.d !== f.d) ok3 = false;
      });
      const vues = new Set();
      pc.querySelectorAll('.ecriture--lettres').forEach((li) => { const f = nd(li.querySelector('.fraction')); vues.add(`${f.n}/${f.d}`); });
      pc.querySelectorAll('.ecriture--chiffres').forEach((li, i) => {
        const f = nd(li.querySelector('.fraction'));
        const lu = lireMots(txt(li.querySelector('.mots')).replace(/\s*=$/, ''));
        if (lu.n !== f.n || lu.d !== f.d || f.n >= f.d) ok3 = false;
        if (vues.has(`${f.n}/${f.d}`)) ok3 = false;
        const ev = pe.querySelectorAll('.ecriture--chiffres')[i];
        if (txt(ev.querySelector('.mots')) !== txt(li.querySelector('.mots')) || ev.querySelector('.fraction--reponse') || ev.querySelectorAll('.case-fr').length !== 2) ok3 = false;
      });
      if (motsEleve !== 0) ok3 = false;
      if (!quiet || !ok3) verifier(ok3, `${tag} : exercice 3, lettres et chiffres exacts, fractions toutes différentes, réponses absentes de la page élève`);

      // Ex. 4 : chaque affirmation recalculée, case cochée = bonne case
      let ok4 = true, vrais = 0, frOk = true;
      const lis = [...pc.querySelectorAll('.affirmation')];
      lis.forEach((li, i) => {
        const v = verite(phrase(li));
        if (v === null) { ok4 = false; return; }
        const cochees = [...li.querySelectorAll('.case-vf--cochee')].map((e) => e.dataset.choix);
        if (cochees.length !== 1 || cochees[0] !== (v ? 'V' : 'F')) ok4 = false;
        if (v) vrais++;
        const ev = pe.querySelectorAll('.affirmation')[i];
        if (phrase(ev) !== phrase(li) || ev.querySelector('.case-vf--cochee') || ev.querySelectorAll('.case-vf').length !== 2) ok4 = false;
        [...li.querySelectorAll('.fraction')].forEach((f) => { const r = nd(f); if (r.n >= r.d) frOk = false; });
      });
      if (!quiet || !ok4) verifier(ok4, `${tag} : exercice 4, ${k.aff} affirmations, case cochée = bonne case, cases vides à l’élève`);
      verifier(frOk, `${tag} : fractions des affirmations avec numérateur < dénominateur`);
      verifier(quiet || vrais === k.aff / 2, `${tag} : autant d’affirmations vraies que d’autres (${vrais} sur ${k.aff})`);
      const premiers = lis.slice(0, 4).filter((li) => verite(phrase(li))).length;
      verifier(quiet || premiers === 2, `${tag} : 2 vraies parmi les 4 premières`);
      verifier(quiet || [...pe.querySelectorAll('.case-vf')].every((e) => e.textContent === 'V' || e.textContent === 'F'), `${tag} : cases V et F en petites cases`);

      // Page élève : aucune réponse hors exemple du rappel ; ton ; emoji
      const corps = [...pe.querySelectorAll('.bloc:not(.bloc--methode)')];
      verifier(!corps.some((b) => b.querySelector('.rouge, .fraction--reponse, .coche, .case-vf--cochee')) && !pe.querySelector('.mots.reponse'), `${tag} : aucune réponse sur la page élève`);
      verifier(corps[1].querySelectorAll('.part--coloriee').length === 0, `${tag} : figures de l’exercice 2 vierges`);
      verifier(methode ? txt(pe).includes('Je me souviens de la méthode') : !txt(pe).includes('Je me souviens'), `${tag} : rappel présent / masqué`);
      verifier(!/\b(faux|fausse|erreur|raté|nul|négatif)\b/i.test(d.body.textContent) && !/[✘❌✖✗×]/.test(d.body.textContent), `${tag} : aucun mot ni signe négatif`);
      const brut = rendre(fr, c, { corrige: true, methode }).replace(/<h1[^>]*>.*?<\/h1>/gs, '');
      verifier(!/[\u{1F300}-\u{1FAFF}]/u.test(brut) && !corps.some((b) => /[\u{1F300}-\u{1FAFF}]/u.test(b.textContent)), `${tag} : pas d’emoji sur la feuille`);
    }
  }

  // Vraies fractions : numérateur sur dénominateur, avec un trait
  { const d = doc(tirer(fr, {}, 5), { corrige: true });
    verifier(d.querySelectorAll('.fraction .fraction__num').length > 20 && !/\d\/\d/.test(d.body.textContent), 'fractions : écrites en numérateur sur dénominateur, jamais « n/d »'); }

  // Rappel : les phrases de la leçon (pages 22 à 25)
  {
    const d = doc(tirer(fr, {}, 1), { corrige: false });
    const h = txt(d.querySelector('.bloc--methode'));
    verifier(['La bande de papier correspond à une unité, c’est-à-dire à 1.', 'partagée en quatre parts égales', 'on a donc des quarts', 'Chaque part représente un quart',
      'c’est quand il en faut 4 pour faire 1', 'On a colorié trois parts. Cela représente trois quarts', 'Trois quarts, c’est trois fois un quart', 'Trois quarts s’écrit',
      'le nombre du bas indique qu’on a des quarts et le nombre du haut qu’on a trois quarts', '4 est le dénominateur : il indique qu’on a partagé l’unité en 4 parts égales.',
      '3 est le numérateur : il indique qu’on a colorié 3 fois une part.',
      ': un demi', ': un tiers', ': un quart', ': un cinquième', ': un sixième', ': un huitième', ': un dixième'].every((m) => h.includes(m)), 'fractions : le rappel reprend les phrases et les noms du livret');
    verifier(d.querySelectorAll('.bloc--methode svg.figure-fraction').length === 2 && d.querySelectorAll('.bloc--methode .rappel-frac__noms li').length === 7, 'fractions : rappel avec ses 2 figures et ses 7 noms');
  }

  // figureFraction : générale, nombre de parts et de parts grisées pour toutes les formes
  {
    let casse = 0;
    const cas = [];
    for (const forme of ['disque', 'bande']) for (let p = 2; p <= 12; p++) for (let g = 0; g <= p; g++) cas.push({ forme, parts: p, coloriees: g });
    for (const p of GRILLES) for (let g = 0; g <= p; g++) cas.push({ forme: 'carre', parts: p, coloriees: g });
    for (const spec of cas) {
      const svg = new JSDOM(`<div>${figureFraction({ ...spec, taille: 84 })}</div>`).window.document.querySelector('svg');
      if (!svg || svg.querySelectorAll('.part').length !== spec.parts || svg.querySelectorAll('.part--coloriee').length !== spec.coloriees || svg.getAttribute('width') !== '84') casse++;
    }
    verifier(casse === 0, `figureFraction : parts et parts grisées exactes (${cas.length} figures)`);
    let leve = 0;
    for (const spec of [{ forme: 'carre', parts: 7, coloriees: 1 }, { forme: 'triangle', parts: 3, coloriees: 1 }]) { try { figureFraction(spec); } catch { leve++; } }
    verifier(leve === 2, 'figureFraction : grille impossible et forme inconnue refusées');
    // Parts égales : angles des secteurs, largeurs des cases
    const s = new JSDOM(`<div>${figureFraction({ forme: 'bande', parts: 8, coloriees: 3 })}</div>`).window.document;
    const larg = [...s.querySelectorAll('.part')].map((r) => +r.getAttribute('width'));
    verifier(larg.every((w) => Math.abs(w - larg[0]) < 0.01) && Math.abs(larg[0] * 8 - 100) < 0.05, 'figureFraction : cases de la bande égales');
  }

  // Codes reproductibles
  const c = tirer(fr, {});
  const r = decoder(c.code);
  verifier(r && r.fiche === fr && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `fractions : le code ${c.code} redonne la même fiche`);
  verifier(rendre(fr, tirer(fr, {}, 77), { corrige: true }) === rendre(fr, tirer(fr, {}, 77), { corrige: true }), 'fractions : même graine, même HTML');
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fr, {}).code);
  verifier(vus.size > 190, `fractions : codes variés (${vus.size} sur 200)`);

  // Robustesse : numérateur < dénominateur et contraintes sur 300 tirages
  let casse = 0;
  for (let i = 0; i < 300; i++) {
    const t = tirer(fr, {}, 5000 + i);
    const tous = [...t.lire.map((f) => [f.n, f.parts]), ...t.colorier.map((f) => [f.n, f.parts]), ...t.lettres.map((f) => [f.n, f.d]), ...t.chiffres.map((f) => [f.n, f.d])];
    const cle = [...t.lettres, ...t.chiffres].map((f) => `${f.n}/${f.d}`);
    if (tous.some(([n, d]) => n < 1 || n >= d) || new Set(cle).size !== 12 || t.colorier.some((f) => f.forme === 'carre' && !GRILLES.includes(f.parts))
      || t.affirmations.some((a) => a.n !== undefined && a.modele !== 'den' && a.modele !== 'num' && a.x !== undefined && a.modele === 'ecrit' && a.x <= a.n)) casse++;
  }
  verifier(casse === 0, 'fractions : contraintes tenues sur 300 tirages');

  // Les cinq fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }]].map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032', `fractions : les cinq fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 5).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer', 'fractions : ordre des cinq premières fiches inchangé');
}

/* Fractions : égales et comparaison ----------------------------------- */
{
  const fc = FICHES.find((f) => f.id === 'ce2-fractions-comparer');
  console.log('— Fractions : égales et comparaison');
  verifier(FICHES.indexOf(fc) === 6, 'fractions égales : fiche à l’index 6 de FICHES');
  verifier(fc.titre === 'Les fractions : égales et comparaison' && fc.emoji === '⚖️' && Array.isArray(fc.options) && fc.options.length === 0, 'fractions égales : titre, emoji, aucune option propre');

  const doc = (c, o) => new JSDOM(`<div>${rendre(fc, c, o)}</div>`).window.document;
  const nd = (f) => ({ n: +f.querySelector('.fraction__num').textContent, d: +f.querySelector('.fraction__den').textContent });
  const fracs = (el) => [...el.querySelectorAll('.fraction')].map(nd);
  // Références indépendantes : égalité à 1/2 (n × 2 = d), à 1 (n = d), produit en croix.
  const egalDemi = (n, d) => n * 2 === d;
  const egalUn = (n, d) => n === d;
  const croix = (n1, d1, n2, d2) => Math.sign(n1 * d2 - n2 * d1);   // 1 : n1/d1 > n2/d2
  const symbole = (n1, d1, n2, d2) => (croix(n1, d1, n2, d2) > 0 ? '>' : '<');
  const NOMS = { 2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 7: 'septième', 8: 'huitième', 9: 'neuvième', 10: 'dixième' };
  const nomPl = (n, d) => `${n} ${NOMS[d]}${n > 1 && d !== 3 ? 's' : ''}`;
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];

  for (const methode of [true, false]) {
    const nom = `fractions égales ${methode ? 'avec' : 'sans'} méthode`;
    const k = methode ? { l: 8, dn: 5, mn: 4, r: 1 } : { l: 10, dn: 8, mn: 6, r: 2 };
    for (const graine of [987654, 1, 2, 3, 4, 5]) {
      const c = tirer(fc, {}, graine);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const tag = `${nom} (graine ${graine})`;
      const quiet = graine !== 987654;
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);
      let ok = true;

      // Comptes identiques élève / corrigé
      const cmpt = (el, sel) => el.querySelectorAll(sel).length;
      ok = cmpt(e1, '.entoure') === 2 * k.l && cmpt(c1, '.entoure') === 2 * k.l
        && cmpt(e2, '.paire-fr') === k.dn && cmpt(c2, '.paire-fr') === k.dn
        && cmpt(e3, '.paire-fr') === k.mn && cmpt(c3, '.paire-fr') === k.mn
        && cmpt(e4, '.rang') === k.r && cmpt(c4, '.rang') === k.r;
      if (!quiet || !ok) verifier(ok, `${tag} : mêmes comptes élève / corrigé (${2 * k.l} fractions, ${k.dn}, ${k.mn} paires, ${k.r} rangements)`);

      // Ex. 1 : entourées = égales, recalculé
      const listes = [...c1.querySelectorAll('.entoures')];
      const [Ld, Lu] = listes.map((l) => [...l.querySelectorAll('.entoure')].map((e) => ({ ...nd(e.querySelector('.fraction')), cercle: e.classList.contains('entoure--oui') })));
      const ok1 = Ld.length === k.l && Lu.length === k.l
        && Ld.every((f) => f.cercle === egalDemi(f.n, f.d) && f.n < f.d && f.d >= 2 && f.d <= 10)
        && Lu.every((f) => f.cercle === egalUn(f.n, f.d) && f.n <= f.d && f.d >= 2 && f.d <= 10)
        && Ld.filter((f) => f.cercle).length >= 2 && Ld.filter((f) => !f.cercle).length >= 2
        && Lu.filter((f) => f.cercle).length >= 2 && Lu.filter((f) => !f.cercle).length >= 2
        && new Set(Ld.map((f) => `${f.n}/${f.d}`)).size === k.l && new Set(Lu.map((f) => `${f.n}/${f.d}`)).size === k.l;
      // La page élève présente les mêmes fractions, sans cercle
      const Ed = [...e1.querySelectorAll('.entoures')].map((l) => fracs(l).slice(l.querySelectorAll('.entoures__cible .fraction').length));
      const memeFr = JSON.stringify(Ed[0]) === JSON.stringify(Ld.map(({ n, d }) => ({ n, d }))) && JSON.stringify(Ed[1]) === JSON.stringify(Lu.map(({ n, d }) => ({ n, d })));
      if (!quiet || !ok1 || !memeFr) verifier(ok1 && memeFr, `${tag} : exercice 1, égalités à 1/2 (n×2 = d) et à 1 (n = d) exactes, au moins 2 égales et 2 non égales par liste`);
      verifier(!e1.querySelector('.entoure--oui') && !e1.querySelector('[data-egal]'), `${tag} : aucune réponse sur la page élève (exercice 1)`);

      // Ex. 2 : même dénominateur, symbole
      let ok2 = true;
      [...c2.querySelectorAll('.paire-fr')].forEach((p, i) => {
        const [a, b] = fracs(p);
        const s = p.querySelector('.case-symbole').textContent;
        if (a.d !== b.d || a.n === b.n || a.n >= a.d || b.n >= b.d || s !== symbole(a.n, a.d, b.n, b.d)) ok2 = false;
        const regle = p.parentElement.querySelector('.regle').textContent;
        if (regle !== `même dénominateur : ${a.n} ${s} ${b.n}`) ok2 = false;
        const f = [...e2.querySelectorAll('.paire-fr')][i];
        const [fa, fb] = fracs(f);
        if (fa.n !== a.n || fb.n !== b.n || fa.d !== a.d || f.querySelector('.case-symbole').textContent !== '') ok2 = false;
      });
      if (!quiet || !ok2) verifier(ok2, `${tag} : exercice 2, symboles exacts (produit en croix), même dénominateur, case vide sur la page élève`);

      // Ex. 3 : même numérateur, figures d'appui cohérentes
      let ok3 = true;
      const cellules = [...c3.querySelectorAll('.paire-fr-cellule')];
      cellules.forEach((cel, i) => {
        const [a, b] = fracs(cel.querySelector('.paire-fr'));
        const s = cel.querySelector('.case-symbole').textContent;
        if (a.n !== b.n || a.d === b.d || a.n >= Math.min(a.d, b.d) || s !== symbole(a.n, a.d, b.n, b.d)) ok3 = false;
        if (cel.querySelector('.regle').textContent !== `même numérateur : ${nomPl(a.n, a.d)} ${s} ${nomPl(b.n, b.d)}`) ok3 = false;
        for (const [pg, idx] of [[pc, i], [pe, i]]) {
          const cl = [...blocs(pg)[2].querySelectorAll('.paire-fr-cellule')][idx];
          const svgs = [...cl.querySelectorAll('svg.figure-fraction')];
          const fr = fracs(cl.querySelector('.paire-fr'));
          if (svgs.length !== 2 || svgs.some((v, j) => v.dataset.forme !== 'bande' || +v.dataset.parts !== fr[j].d || v.querySelectorAll('.part').length !== fr[j].d || v.querySelectorAll('.part--coloriee').length !== fr[j].n)) ok3 = false;
          if (JSON.stringify(fr) !== JSON.stringify([a, b])) ok3 = false;
        }
      });
      if (new Set(cellules.map((cel) => fracs(cel.querySelector('.paire-fr')).map((f) => `${f.n}/${f.d}`).sort().join())).size !== k.mn) ok3 = false;
      if (!quiet || !ok3) verifier(ok3, `${tag} : exercice 3, même numérateur, symboles exacts, figures d’appui (parts et parts grisées) cohérentes`);

      // Ex. 4 : rangement du plus petit au plus grand
      let ok4 = true;
      [...c4.querySelectorAll('.rang')].forEach((r, i) => {
        const donnes = fracs(r.querySelector('.rang__nombres'));
        const rep = [...r.querySelectorAll('.rang__reponse .fraction--reponse')].map(nd);
        const tri = [...donnes].sort((x, y) => x.n * y.d - y.n * x.d);
        const ei = fracs([...e4.querySelectorAll('.rang')][i].querySelector('.rang__nombres'));
        if (donnes.length !== 4 || new Set(donnes.map((f) => f.d)).size !== 1 || new Set(donnes.map((f) => f.n)).size !== 4 || donnes.some((f) => f.n >= f.d)
          || JSON.stringify(rep) !== JSON.stringify(tri) || JSON.stringify(donnes) === JSON.stringify(tri) || JSON.stringify(ei) !== JSON.stringify(donnes)
          || r.querySelectorAll('.rang__signe').length !== 3 ) ok4 = false;
        const pe_ = [...e4.querySelectorAll('.rang')][i];
        if (pe_.querySelectorAll('.pointilles--rang').length !== 4 || pe_.querySelectorAll('.rang__reponse .fraction').length !== 0) ok4 = false;
      });
      if (!quiet || !ok4) verifier(ok4, `${tag} : exercice 4, rangements du plus petit au plus grand exacts, 4 fractions de même dénominateur`);

      // Aucune réponse sur la page élève hors exemple (le rappel)
      const reponses = pe.querySelectorAll('.rouge, .reponse, .fraction--reponse, .case-symbole--rep, .regle, .entoure--oui').length;
      const symbolesVides = [...pe.querySelectorAll('.case-symbole')].every((x) => x.textContent === '');
      if (!quiet || reponses || !symbolesVides) verifier(reponses === 0 && symbolesVides, `${tag} : aucune réponse sur la page élève hors exemple`);
      if (!quiet) {
        const t = pe.textContent + pc.textContent;
        verifier(!/faux|erreur|raté|✗|✘|❌|[\u{1F300}-\u{1FAFF}]/u.test(t) && !/\d\/\d/.test(t), `${tag} : aucun mot négatif ni emoji, fractions en numérateur sur dénominateur`);
        verifier(pe.querySelectorAll('.bloc--methode').length === (methode ? 1 : 0) && !pc.querySelector('.bloc--methode'), `${tag} : rappel présent seulement avec la méthode, jamais dans le corrigé`);
      }
    }
  }

  // Le rappel reprend les phrases et exemples de la leçon, avec ses figures
  {
    const d = doc(tirer(fc, {}, 11), { corrige: false, methode: true });
    const t = d.querySelector('.bloc--methode').textContent.replace(/\s+/g, ' ');
    const phrases = ['Six huitièmes du gâteau est égal à trois quarts de ce gâteau', 'sont égales à', '5 douzièmes < 7 douzièmes', '1 sixième est plus grand que 1 dixième',
      'chaque part d’un sixième est plus grande que chaque part d’un dixième', '3 sixièmes est plus grand que 3 dixièmes', 'même nombre en bas', 'même nombre en haut'];
    verifier(phrases.every((p) => t.includes(p)), 'fractions égales : le rappel reprend les phrases de la leçon');
    const svgs = [...d.querySelectorAll('.bloc--methode svg.figure-fraction')].map((v) => `${v.dataset.parts}:${v.querySelectorAll('.part--coloriee').length}`);
    verifier(svgs.join() === '8:6,4:3,2:1,6:3,4:4,1:1,12:5,12:7,6:3,10:3', `fractions égales : 5 paires de figures du rappel cohérentes (${svgs.join(' ')})`);
  }

  // Codes reproductibles
  const c = tirer(fc, {});
  const r = decoder(c.code);
  verifier(r && r.fiche === fc && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `fractions égales : le code ${c.code} redonne la même fiche`);
  verifier(rendre(fc, tirer(fc, {}, 77), { corrige: true }) === rendre(fc, tirer(fc, {}, 77), { corrige: true }), 'fractions égales : même graine, même HTML');
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fc, {}).code);
  verifier(vus.size > 190, `fractions égales : codes variés (${vus.size} sur 200)`);

  // Contraintes sur 300 tirages
  let casse = 0;
  for (let i = 0; i < 300; i++) {
    const t = tirer(fc, {}, 7000 + i);
    const h8 = (l, f) => l.slice(0, 8).filter(f).length;
    if (t.demi.length !== 10 || t.un.length !== 10 || t.memeDen.length !== 8 || t.memeNum.length !== 6 || t.ranger.length !== 2
      || [t.demi, t.un].some((l, j) => l.some((x) => x.egal !== (j ? x.n === x.d : x.n * 2 === x.d)))
      || [t.demi, t.un].some((l) => h8(l, (x) => x.egal) < 2 || h8(l, (x) => !x.egal) < 2)
      || t.memeDen.some((p) => p.a === p.b || p.a >= p.d || p.b >= p.d)
      || t.memeNum.some((p) => p.a === p.b || p.n >= Math.min(p.a, p.b) || Math.max(p.a, p.b) > 10)) casse++;
  }
  verifier(casse === 0, 'fractions égales : contraintes tenues sur 300 tirages');

  // Les six fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}]].map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813', `fractions égales : les six fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 6).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire', 'fractions égales : ordre des six premières fiches inchangé');
}

/* Fractions : mesurer, additionner, soustraire ------------------------ */
{
  const fk = FICHES.find((f) => f.id === 'ce2-fractions-calculer');
  console.log('— Fractions : mesurer, additionner, soustraire');
  verifier(FICHES.indexOf(fk) === 7, 'fractions calculer : fiche à l’index 7 (jamais déplacée)');
  verifier(fk.titre === 'Les fractions : mesurer, additionner, soustraire' && fk.emoji === '➕'
    && fk.options.length === 1 && fk.options[0].id === 'denominateur' && fk.options[0].defaut === '4'
    && JSON.stringify(fk.options[0].valeurs) === JSON.stringify([{ v: '4', nom: 'Demis, tiers, quarts' }, { v: '10', nom: 'Jusqu’aux dixièmes' }]),
    'fractions calculer : titre, emoji, option denominateur (4 puis 10, défaut 4)');

  const doc = (c, o) => new JSDOM(`<div>${rendre(fk, c, o)}</div>`).window.document;
  const nd = (f) => ({ n: +f.querySelector('.fraction__num').textContent, d: +f.querySelector('.fraction__den').textContent });
  const fracs = (el) => [...el.querySelectorAll('.fraction')].map(nd);
  const NOMS = { 2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 7: 'septième', 8: 'huitième', 9: 'neuvième', 10: 'dixième' };
  const ENLETTRES = { 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf' };
  const mots = (n, d) => `${ENLETTRES[n]} ${NOMS[d]}${n > 1 && d !== 3 ? 's' : ''}`;
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];
  const bornes = { '4': [2, 4], '10': [2, 10] };

  // Une règle SVG : relit les attributs, recalcule la position de la bande et des graduations.
  const lireRegle = (svg) => {
    const g = [...svg.querySelectorAll('.graduation')];
    const xs = g.map((l) => +l.getAttribute('x1'));
    const bande = svg.querySelector('.bande');
    const x0 = +bande.getAttribute('x'), w = +bande.getAttribute('width');
    const pas = (xs[xs.length - 1] - xs[0]) / (g.length - 1);
    const pasRegulier = xs.every((x, i) => Math.abs(x - (xs[0] + i * pas)) < 0.05);
    const reperes = [...svg.querySelectorAll('.repere')].map((t) => t.textContent);
    return {
      parts: +svg.dataset.parts, unite: +svg.dataset.unite, longueurAttr: +svg.dataset.longueur,
      graduations: g.length, principales: svg.querySelectorAll('.graduation--principale').length,
      alignee: Math.abs(x0 - xs[0]) < 0.05, longueurMesuree: Math.round(w / pas), exacte: Math.abs(w / pas - Math.round(w / pas)) < 0.02,
      pasRegulier, reperes,
    };
  };

  for (const den of ['4', '10']) for (const methode of [true, false]) {
    const [dmin, dmax] = bornes[den];
    const k = methode ? { m: 4, a: 5, s: 5, p: 2 } : { m: 6, a: 8, s: 8, p: 3 };
    const nom = `fractions calculer ${den} ${methode ? 'avec' : 'sans'} méthode`;
    for (const graine of [987654, 1, 2, 3, 4, 5, 6, 7]) {
      const c = tirer(fk, { denominateur: den }, graine);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const tag = `${nom} (graine ${graine})`;
      const quiet = graine !== 987654;
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);

      // Comptes identiques élève / corrigé
      const cmpt = (el, sel) => el.querySelectorAll(sel).length;
      const okc = cmpt(e1, '.mesure') === k.m && cmpt(c1, '.mesure') === k.m && cmpt(e2, '.calc') === k.a && cmpt(c2, '.calc') === k.a
        && cmpt(e3, '.calc') === k.s && cmpt(c3, '.calc') === k.s && cmpt(e4, '.probleme-fr') === k.p && cmpt(c4, '.probleme-fr') === k.p;
      if (!quiet || !okc) verifier(okc, `${tag} : mêmes comptes élève / corrigé (${k.m} bandes, ${k.a} + ${k.s} calculs, ${k.p} problèmes)`);

      // Ex. 1 : bande, règle, mesure
      let ok1 = true;
      const vues = new Set();
      [...c1.querySelectorAll('.mesure')].forEach((m, i) => {
        const r = lireRegle(m.querySelector('svg.regle-fractions'));
        const rep = nd(m.querySelector('.fraction--reponse'));
        const el = lireRegle([...e1.querySelectorAll('.mesure')][i].querySelector('svg.regle-fractions'));
        vues.add(`${rep.n}/${rep.d}`);
        if (rep.d !== r.parts || rep.n !== r.longueurMesuree || r.longueurAttr !== r.longueurMesuree || !r.exacte || !r.alignee || !r.pasRegulier
          || rep.n < 1 || rep.n >= rep.d || rep.d < dmin || rep.d > dmax
          || r.graduations !== r.unite * r.parts + 1 || r.principales !== r.unite + 1 || r.reperes.join() !== '0,1'
          || JSON.stringify(el) !== JSON.stringify(r)) ok1 = false;
        if (m.querySelector('.mesure__mots').textContent !== mots(rep.n, rep.d)) ok1 = false;
        const eleve = [...e1.querySelectorAll('.mesure')][i];
        if (eleve.querySelector('.fraction--reponse, .rouge, .mesure__mots') || eleve.querySelectorAll('.case-fr').length !== 2) ok1 = false;
      });
      if (vues.size !== k.m) ok1 = false;
      if (!quiet || !ok1) verifier(ok1, `${tag} : exercice 1, bande alignée sur le 0, longueur lue sur le SVG = numérateur, ${den === '4' ? '' : ''}dénominateur = nombre de parts, bornes de l’option, mots exacts`);

      // Ex. 2 et 3 : calculs recalculés indépendamment
      const verif = (cb, eb, signe) => {
        let ok = true;
        const eleves = [...eb.querySelectorAll('.calc')];
        [...cb.querySelectorAll('.calc')].forEach((cl, i) => {
          const [a, b, r] = fracs(cl);
          const eq = cl.querySelector('.calc__eq').textContent.replace(/\s+/g, '');
          const op = cl.querySelector('.calc__eq').textContent.includes('+') ? '+' : '−';
          const attendu = signe === '+' ? a.n + b.n : a.n - b.n;
          if (op !== signe || a.d !== b.d || a.d !== r.d || r.n !== attendu || a.d < dmin || a.d > dmax || a.n < 1 || b.n < 1) ok = false;
          if (signe === '+' && (attendu > a.d)) ok = false;
          if (signe === '−' && (attendu <= 0 || a.n > a.d || b.n >= a.n)) ok = false;
          const regle = cl.querySelector('.calc__regle').textContent;
          if (regle !== `: on ${signe === '+' ? 'additionne' : 'soustrait'} les numérateurs, le dénominateur ne change pas`) ok = false;
          const ef = fracs(eleves[i]);
          if (ef.length !== 3 || ef[0].n !== a.n || ef[1].n !== b.n || ef[0].d !== a.d || ef[1].d !== a.d || eleves[i].querySelectorAll('.case-fr').length !== 2 || eleves[i].querySelector('.fraction--reponse, .rouge')) ok = false;
        });
        const cles = [...cb.querySelectorAll('.calc')].map((cl) => fracs(cl).slice(0, 2).map((f) => `${f.n}/${f.d}`).join(signe));
        if (new Set(cles).size !== cles.length) ok = false;
        const dens = new Set([...cb.querySelectorAll('.calc')].map((cl) => fracs(cl)[0].d));
        if (dens.size < 2) ok = false;
        return ok;
      };
      const ok2 = verif(c2, e2, '+'), ok3 = verif(c3, e3, '−');
      if (!quiet || !ok2) verifier(ok2, `${tag} : exercice 2, additions exactes, même dénominateur, somme ≤ 1, règle rappelée, cases vides côté élève`);
      if (!quiet || !ok3) verifier(ok3, `${tag} : exercice 3, soustractions exactes, même dénominateur, résultat > 0, règle rappelée, cases vides côté élève`);

      // Ex. 4 : problèmes
      let ok4 = true;
      [...c4.querySelectorAll('.probleme-fr')].forEach((pb, i) => {
        const enonce = fracs(pb.querySelector('.probleme-fr__enonce'));
        const lignes = pb.querySelectorAll('.probleme-fr__ligne');
        const calc = lignes[0].querySelector('.probleme-fr__rep');
        const [a, b, r] = fracs(calc);
        const signe = calc.textContent.includes('+') ? '+' : '−';
        const attendu = signe === '+' ? a.n + b.n : a.n - b.n;
        const phrase = fracs(lignes[1]);
        const texte = pb.querySelector('.probleme-fr__enonce').textContent;
        const ajout = /ont-ils mangée|bout à bout/.test(texte);
        if (enonce.length !== 2 || enonce[0].n !== a.n || enonce[1].n !== b.n || enonce[0].d !== a.d || enonce[1].d !== a.d
          || a.d !== b.d || a.d !== r.d || r.n !== attendu || attendu <= 0 || attendu > a.d || a.d < dmin || a.d > dmax
          || (signe === '+') !== ajout || phrase.length !== 1 || phrase[0].n !== r.n || phrase[0].d !== r.d
          || !lignes[0].textContent.startsWith('Calcul :') || !lignes[1].textContent.startsWith('Phrase réponse :')) ok4 = false;
        const el = [...e4.querySelectorAll('.probleme-fr')][i];
        const el_l = el.querySelectorAll('.probleme-fr__ligne');
        if (fracs(el).length !== 2 || el_l.length !== 2 || el.querySelector('.rouge, .fraction--reponse, .probleme-fr__rep') || !el_l[0].textContent.startsWith('Calcul :') || !el_l[1].textContent.startsWith('Phrase réponse :')) ok4 = false;
      });
      const kinds = [...c4.querySelectorAll('.probleme-fr__enonce')].map((e) => /gâteau/.test(e.textContent) ? 'g' : 'r').join('');
      if (!/g/.test(kinds) || !/r/.test(kinds)) ok4 = false;
      if (!quiet || !ok4) verifier(ok4, `${tag} : exercice 4, calcul et phrase exacts, énoncé cohérent avec l’opération, gâteau et ruban présents`);

      // Aucune réponse sur la page élève hors rappel
      const hors = [...pe.querySelectorAll('.rouge, .reponse, .fraction--reponse, .mesure__mots, .calc__regle, .probleme-fr__rep')].filter((x) => !x.closest('.bloc--methode')).length;
      if (!quiet || hors) verifier(hors === 0, `${tag} : aucune réponse sur la page élève hors exemple`);
      if (!quiet) {
        const t = pe.textContent + pc.textContent;
        verifier(!/faux|erreur|raté|✗|✘|❌|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t) && !/\d\/\d/.test(t), `${tag} : aucun mot négatif ni emoji, fractions en numérateur sur dénominateur`);
        verifier(pe.querySelectorAll('.bloc--methode').length === (methode ? 1 : 0) && !pc.querySelector('.bloc--methode'), `${tag} : rappel présent seulement avec la méthode, jamais dans le corrigé`);
        verifier(!pc.textContent.includes('Nom :'), `${tag} : pas de ligne Nom / Date dans le corrigé`);
      }
    }
  }

  // Le rappel reprend les phrases et exemples de la leçon, règles comprises
  {
    const d = doc(tirer(fk, {}, 11), { corrige: false, methode: true });
    const m = d.querySelector('.bloc--methode');
    const t = m.textContent.replace(/\s+/g, ' ');
    const phrases = ['trois quarts d’unité', 'La longueur de la bande est égale à', 'd’unité', '2 unités et 1 quart d’unité', '3 huitièmes + 4 huitièmes = 7 huitièmes', '4 cinquièmes − 1 cinquième = 3 cinquièmes',
      'On additionne les numérateurs, le dénominateur ne change pas', 'On soustrait les numérateurs, le dénominateur ne change pas'];
    verifier(phrases.every((p) => t.includes(p)), 'fractions calculer : le rappel reprend les phrases de la leçon');
    const svgs = [...m.querySelectorAll('svg.regle-fractions')].map((v) => { const r = lireRegle(v); return `${r.unite}x${r.parts}:${r.longueurMesuree}`; });
    verifier(svgs.join() === '1x4:3,1x4:2,3x4:9', `fractions calculer : trois règles du rappel (3/4, 2/4, 2 unités et 1/4) cohérentes (${svgs.join(' ')})`);
    const eg = [...m.querySelectorAll('.rappel-fcal__egalite')].map((e) => e.textContent.replace(/\s+/g, ''));
    verifier(eg.join() === '38+48=78,45−15=35', `fractions calculer : exemples 3/8 + 4/8 = 7/8 et 4/5 − 1/5 = 3/5 (${eg.join(' ')})`);
  }

  // Codes reproductibles, sans changement avec l'option
  for (const den of ['4', '10']) {
    const c = tirer(fk, { denominateur: den });
    const r = decoder(c.code);
    verifier(r && r.fiche === fk && r.options.denominateur === den && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `fractions calculer ${den} : le code ${c.code} redonne la même fiche`);
    verifier(rendre(fk, tirer(fk, { denominateur: den }, 77), { corrige: true }) === rendre(fk, tirer(fk, { denominateur: den }, 77), { corrige: true }), `fractions calculer ${den} : même graine, même HTML`);
    const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fk, { denominateur: den }).code);
    verifier(vus.size > 190, `fractions calculer ${den} : codes variés (${vus.size} sur 200)`);
  }
  verifier(codeDe(fk, { denominateur: '4' }, 5) !== codeDe(fk, { denominateur: '10' }, 5), 'fractions calculer : l’option change le code');

  // Contraintes sur 300 tirages par option
  for (const den of ['4', '10']) {
    const [dmin, dmax] = bornes[den];
    let casse = 0;
    for (let i = 0; i < 300; i++) {
      const t = tirer(fk, { denominateur: den }, 9000 + i);
      const dansBornes = (x) => x.d >= dmin && x.d <= dmax;
      if (t.mesures.length !== 6 || t.additions.length !== 8 || t.soustractions.length !== 8 || t.problemes.length !== 3
        || t.mesures.some((m) => !dansBornes(m) || m.n < 1 || m.n >= m.d)
        || t.additions.some((a) => !dansBornes(a) || a.a < 1 || a.b < 1 || a.a + a.b > a.d)
        || t.soustractions.some((s) => !dansBornes(s) || s.b < 1 || s.a - s.b < 1 || s.a > s.d)
        || t.problemes.some((p) => !dansBornes(p) || (p.op === '+' ? p.a + p.b > p.d || p.a < 1 || p.b < 1 : p.a > p.d || p.b >= p.a || p.b < 1))) casse++;
    }
    verifier(casse === 0, `fractions calculer ${den} : contraintes (bornes, sommes ≤ 1, différences > 0) tenues sur 300 tirages`);
  }

  // Les sept fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}]].map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352', `fractions calculer : les sept fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 7).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer', 'fractions calculer : ordre des sept premières fiches inchangé');
}

/* Monnaie : composer une somme, rendre la monnaie --------------------- */
{
  const fm = FICHES.find((f) => f.id === 'ce2-monnaie');
  console.log('— Monnaie : composer une somme, rendre la monnaie');
  verifier(FICHES.indexOf(fm) === FICHES.length - 1 && FICHES.indexOf(fm) === 8, 'monnaie : fiche ajoutée en fin de FICHES (index 8)');
  verifier(fm.titre === 'La monnaie : composer une somme, rendre la monnaie' && fm.emoji === '🪙'
    && fm.options.length === 1 && fm.options[0].id === 'centimes' && fm.options[0].defaut === 'oui'
    && JSON.stringify(fm.options[0].valeurs) === JSON.stringify([{ v: 'non', nom: 'Euros entiers' }, { v: 'oui', nom: 'Avec les centimes' }]),
    'monnaie : titre, emoji, option centimes (non puis oui, défaut oui)');

  const doc = (c, o) => new JSDOM(`<div>${rendre(fm, c, o)}</div>`).window.document;
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];
  // Tous les montants d'un texte, en centimes : « 12,60 € », « 7 € », « 40 c ».
  const montants = (txt) => [...String(txt).matchAll(/(\d+)(?:,(\d\d))? (€|c)(?![\p{L}])/gu)].map((m) => (m[3] === 'c' ? +m[1] : +m[1] * 100 + (m[2] ? +m[2] : 0)));
  const txt = (el) => el.textContent.replace(/[ \t\n\r]+/g, ' ');   // sans toucher aux espaces insécables
  const contient = (texte, motif) => new RegExp(`(?<![\\d,])${motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(texte);
  const eur2 = (c) => (c % 100 === 0 ? `${c / 100}\u00a0€` : `${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}\u00a0€`);

  // Nombre minimal de pièces et billets, recalculé par programmation dynamique (pas par l'algorithme glouton du générateur)
  const minimum = (somme, valeurs) => {
    const m = Array(somme + 1).fill(Infinity); m[0] = 0;
    for (let s = 1; s <= somme; s++) for (const v of valeurs) if (v <= s && m[s - v] + 1 < m[s]) m[s] = m[s - v] + 1;
    return m[somme];
  };
  const ENTIERES = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];
  const TOUTES = [...ENTIERES, 50, 20, 10, 5, 2, 1];

  for (const centimes of ['non', 'oui']) for (const methode of [true, false]) {
    const k = methode ? { s: 4, c: 4, a: 4, p: 2 } : { s: 6, c: 6, a: 6, p: 3 };
    const nom = `monnaie ${centimes === 'oui' ? 'avec' : 'sans'} centimes, ${methode ? 'avec' : 'sans'} méthode`;
    let casse = 0, comptes = 0, fuite = 0, bornes = 0, mots = 0;
    for (let graine = 1; graine <= 60; graine++) {
      const c = tirer(fm, { centimes }, graine * 7919);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);
      const cmpt = (el, sel) => el.querySelectorAll(sel).length;
      if (!(cmpt(e1, '.somme') === k.s && cmpt(c1, '.somme') === k.s && cmpt(e2, '.conversion') === k.c && cmpt(c2, '.conversion') === k.c
        && cmpt(e3, '.achat') === k.a && cmpt(c3, '.achat') === k.a && cmpt(e4, '.probleme-mon') === k.p && cmpt(c4, '.probleme-mon') === k.p)) comptes++;

      // Ex. 1 : somme exacte, et nombre minimal de pièces et billets
      [...c1.querySelectorAll('.somme')].forEach((li, i) => {
        const [s] = montants(li.querySelector('.somme__montant').textContent);
        const [se] = montants([...e1.querySelectorAll('.somme')][i].querySelector('.somme__montant').textContent);
        const parts = [...li.querySelector('.somme__compo').textContent.matchAll(/(\d+) × (\d+) (€|c)/g)].map((m) => ({ n: +m[1], v: m[3] === 'c' ? +m[2] : +m[2] * 100 }));
        const somme = parts.reduce((x, p) => x + p.n * p.v, 0), nb = parts.reduce((x, p) => x + p.n, 0);
        const dispo = centimes === 'oui' ? TOUTES : ENTIERES;
        const annonce = +li.querySelector('.somme__total').textContent.match(/\d+/)[0];
        const bon = s === se && somme === s && nb === minimum(s, dispo) && annonce === nb && parts.every((p) => dispo.includes(p.v)) && nb >= 3
          && (centimes === 'oui' ? s % 5 === 0 && s % 100 !== 0 : s % 100 === 0);
        if (!bon) casse++;
      });

      // Ex. 2 : conversions ou additions
      [...c2.querySelectorAll('.conversion')].forEach((div, i) => {
        const ligne = txt(div), enonce = txt([...e2.querySelectorAll('.conversion')][i]);
        if (centimes === 'oui') {
          const cts = (s) => { const m1 = s.match(/^(\d+)\u00a0€ (\d+)\u00a0c$/); if (m1) return +m1[1] * 100 + +m1[2]; const m2 = s.match(/^(\d+)\u00a0c$/); return m2 ? +m2[1] : NaN; };
          const [gauche, droite] = ligne.replace(/^[a-f]\.\s*/, '').split(' = ');
          const g = cts(gauche), dr = cts(droite);
          if (!(g === dr && g > 100 && g % 5 === 0 && g % 100 !== 0 && (droite.includes('€') !== gauche.includes('€')))) casse++;
          if (!/^[a-f]\.\s*[^=]* =\s*(c|€\s*c)?$/.test(enonce)) casse++;   // l'énoncé élève n'a rien après le signe égal
        } else {
          const termes = [...enonce.matchAll(/(\d+) €/g)].map((x) => +x[1]);
          const reponse = montants(ligne.split(' = ').pop())[0] / 100;
          if (!(termes.length >= 3 && termes.every((x) => [1, 2, 5, 10, 20, 50].includes(x)) && reponse === termes.reduce((a, b) => a + b, 0))) casse++;
        }
      });

      // Ex. 3 : chaque achat, chaîne de compléments
      [...c3.querySelectorAll('.achat')].forEach((div, i) => {
        const enonce = txt([...e3.querySelectorAll('.achat')][i]);
        const [prixE, billetE] = montants(enonce);
        const [prix, billet] = montants(txt(div).split(' De ')[0]);
        const detail = txt(div.querySelector('.achat__detail'));
        const etapes = [...detail.matchAll(/De (\d+(?:,\d\d)?) € à (\d+(?:,\d\d)?) €, il faut (\d+(?:,\d\d)?) (€|c)\./g)]
          .map((m) => { const c = (s) => Math.round(parseFloat(s.replace(',', '.')) * 100); return { de: c(m[1]), vers: c(m[2]), diff: m[4] === 'c' ? +m[3] : c(m[3]) }; });
        const rendu = montants(detail.match(/rend ([^.]*\.\d*|[^ ]* [^ ]*)/)?.[0] ?? '')[0];
        const renduTxt = montants(detail.slice(detail.indexOf('Le vendeur rend')))[0];
        const attenduInter = (p) => (centimes === 'oui' ? Math.ceil(p / 100) * 100 : Math.ceil(p / 1000) * 1000);
        let ok = prixE === prix && billetE === billet && [1000, 2000, 5000].includes(billet) && prix < billet && billet - prix > 0
          && etapes.length >= 1 && etapes.length <= 2 && etapes[0].de === prix && etapes[etapes.length - 1].vers === billet
          && etapes.every((e, j) => e.vers - e.de === e.diff && e.diff > 0 && (j === 0 || e.de === etapes[j - 1].vers))
          && renduTxt === billet - prix && etapes.reduce((a, e) => a + e.diff, 0) === billet - prix;
        if (etapes.length === 2) ok = ok && etapes[0].vers === attenduInter(prix);
        else ok = ok && (billet === 1000 || centimes === 'non');
        if (centimes === 'oui') ok = ok && etapes.length === 2 && prix % 5 === 0 && prix % 100 !== 0 && prix >= 100;
        else ok = ok && prix % 100 === 0 && prix % 1000 !== 0;
        if (!ok) casse++;
        void rendu;
      });

      // Ex. 4 : total et monnaie rendue
      [...c4.querySelectorAll('.probleme-mon')].forEach((div, i) => {
        const enonce = txt([...e4.querySelectorAll('.probleme-mon')][i]);
        const m = montants(enonce);
        const billet = m[m.length - 1], articles = m.slice(0, -1);
        const total = articles.reduce((a, b) => a + b, 0);
        const rep = txt(div);
        const mr = montants(rep);
        // Prix total : a + b (+ c) = T. De … Le vendeur rend R.
        const attenduT = mr.slice(articles.length, articles.length + 1)[0];
        const dernier = mr[mr.length - 1];
        const ok = articles.length >= 2 && attenduT === total && dernier === billet - total && billet - total > 0 && total < billet
          && [1000, 2000, 5000].includes(billet) && mr.slice(0, articles.length).join() === articles.join()
          && (centimes === 'oui' ? articles.every((x) => x % 5 === 0 && x % 100 !== 0) && total % 100 !== 0 : articles.every((x) => x % 100 === 0) && total % 1000 !== 0);
        if (!ok) casse++;
        if (contient(enonce, eur2(total))) fuite++;
      });

      // Page élève : aucune réponse écrite (rien en rouge, aucun détail de complément)
      if (pe.querySelectorAll('.rouge, .achat__detail, .somme__compo').length) fuite++;
      if (/il faut|rend \d/.test(txt(e1) + txt(e2) + txt(e3) + txt(e4))) fuite++;
      if (/Je complète à \d/.test(txt(e3))) fuite++;

      // Ton : aucun mot négatif ni emoji sur la feuille
      const tout = pe.textContent + pc.textContent;
      if (/faux|erreur|raté|✗|✘|❌|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tout)) mots++;
      // Montants : espace insécable avant € ou c, jamais « 12.60 » ni « 12,6 € »
      if (/\d\.\d\d €|\d,\d €|\d €/.test(tout)) mots++;
      void bornes;
    }
    verifier(comptes === 0, `${nom} : mêmes comptes élève / corrigé (${k.s} sommes, ${k.c} conversions, ${k.a} achats, ${k.p} problèmes), 60 tirages`);
    verifier(casse === 0, `${nom} : compositions minimales, conversions, compléments, totaux et monnaie rendue exacts (60 tirages)`);
    verifier(fuite === 0, `${nom} : aucune réponse sur la page élève`);
    verifier(mots === 0, `${nom} : aucun mot négatif ni emoji, montants bien typographiés`);
    const d0 = doc(tirer(fm, { centimes }, 99), { corrige: true, methode });
    const [pe0, pc0] = d0.querySelectorAll('.feuille');
    verifier(pe0.querySelectorAll('.bloc--methode').length === (methode ? 1 : 0) && !pc0.querySelector('.bloc--methode') && !pc0.textContent.includes('Nom :'), `${nom} : rappel seulement avec la méthode, jamais dans le corrigé ni la ligne Nom / Date`);
  }

  // Le rappel : billets et pièces dessinés, leçon reprise mot pour mot
  {
    const d = doc(tirer(fm, { centimes: 'oui' }, 11), { corrige: false, methode: true });
    const m = d.querySelector('.bloc--methode');
    const t = txt(m);
    const phrases = ['La monnaie que nous utilisons s’appelle l’euro : €.', '1 euro, c’est 100 centimes d’euro.', '1 € = 100 c',
      'Pour rendre la monnaie sur 20 € pour un achat de 12,60 €, je cherche le complément à 20 € de 12,60 €.', 'Je complète à 13 € puis à 20 €.',
      'De 12,60 € pour aller à 13 €, il faut 40 c.', 'De 13 € pour aller à 20 €, il faut 7 €.', 'Le vendeur doit rendre 7 € + 40 c soit en tout 7,40 €.'];
    verifier(phrases.every((p) => t.includes(p)), 'monnaie : le rappel reprend les phrases de la leçon');
    const svgs = [...m.querySelectorAll('svg.monnaie')].map((s) => ({
      billets: [...s.querySelectorAll('.billet')].map((x) => +x.dataset.valeur), pieces: [...s.querySelectorAll('.piece')].map((x) => +x.dataset.valeur),
      textes: [...s.querySelectorAll('.valeur-monnaie')].map((x) => x.textContent), cercles: s.querySelectorAll('circle').length, rects: s.querySelectorAll('rect').length,
    }));
    verifier(svgs.length === 3 && svgs[0].billets.join() === '50000,20000,10000,5000,2000,1000,500' && svgs[0].pieces.length === 0 && svgs[0].rects === 7
      && svgs[1].pieces.join() === '100,200' && svgs[1].cercles === 2 && svgs[2].pieces.join() === '1,2,5,10,20,50' && svgs[2].cercles === 6,
      'monnaie : le rappel dessine 7 billets, 2 pièces en euro et 6 pièces en centime');
    verifier(svgs[0].textes.join() === '500 €,200 €,100 €,50 €,20 €,10 €,5 €' && svgs[1].textes.join() === '1 €,2 €' && svgs[2].textes.join() === '1 c,2 c,5 c,10 c,20 c,50 c',
      'monnaie : la valeur est écrite sur chaque pièce et chaque billet');
    const schema = m.querySelector('svg.schema-monnaie');
    const st = [...schema.querySelectorAll('text')].map((x) => x.textContent);
    verifier(st.join('|') === '12,60 €|13 €|20 €|+ 40 c|+ 7 €|+ 7,40 €', `monnaie : schéma de la droite 12,60 € → 13 € → 20 € (${st.join(' ')})`);
    // La fonction du dessin : autant de formes que de valeurs, quel que soit le mélange
    const essai = new JSDOM(`<div>${monnaie([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000])}</div>`).window.document.querySelector('svg');
    verifier(essai.querySelectorAll('.piece').length === 8 && essai.querySelectorAll('.billet').length === 7 && essai.querySelectorAll('circle').length === 8 && essai.querySelectorAll('rect').length === 7
      && essai.querySelector('.billet rect').getAttribute('rx') > 0 && essai.querySelectorAll('.valeur-monnaie').length === 15, 'monnaie : 8 pièces (cercles) et 7 billets (rectangles arrondis) dessinés');
  }

  // Codes reproductibles et options
  for (const centimes of ['non', 'oui']) {
    const c = tirer(fm, { centimes });
    const r = decoder(c.code);
    verifier(r && r.fiche === fm && r.options.centimes === centimes && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `monnaie ${centimes} : le code ${c.code} redonne la même fiche`);
    verifier(rendre(fm, tirer(fm, { centimes }, 77), { corrige: true }) === rendre(fm, tirer(fm, { centimes }, 77), { corrige: true }), `monnaie ${centimes} : même graine, même HTML`);
    const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fm, { centimes }).code);
    verifier(vus.size > 190, `monnaie ${centimes} : codes variés (${vus.size} sur 200)`);
  }
  verifier(codeDe(fm, { centimes: 'non' }, 5) !== codeDe(fm, { centimes: 'oui' }, 5), 'monnaie : l’option change le code');

  // Les huit fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352,750168435,1150851747', `monnaie : les huit fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 8).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer', 'monnaie : ordre des huit premières fiches inchangé');
}

process.exit(echecs ? 1 : 0);
