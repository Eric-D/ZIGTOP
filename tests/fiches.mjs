// Une fiche imprimée ne se corrige pas après coup : le corrigé doit être juste,
// les retenues bien placées, et la fiche ne doit pas changer toute seule.
import { JSDOM } from 'jsdom';
import { FICHES, tirer, rendre, decoder, codeDe, optionsParDefaut } from '../js/fiches.js';
import { matrice } from '../js/qr.js';
import { fmt } from '../js/utils.js';
import { figureFraction, monnaie, polygoneCote, horloge, ligneDuTemps, solide, patronCube, NB_ASSEMBLAGES } from '../js/visuels.js';

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
  verifier(FICHES.indexOf(fm) === 8, 'monnaie : fiche à l’index 8 de FICHES (jamais déplacée)');
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

/* Longueurs : unités, conversions, périmètre ---------------------------- */
{
  const fl = FICHES.find((f) => f.id === 'ce2-longueurs');
  console.log('— Longueurs : unités, conversions, périmètre');
  verifier(FICHES.indexOf(fl) === 9, 'longueurs : fiche à l’index 9 de FICHES');
  verifier(fl.titre === 'Les longueurs : unités, conversions, périmètre' && fl.emoji === '📏'
    && fl.options.length === 1 && fl.options[0].id === 'km' && fl.options[0].defaut === 'oui'
    && JSON.stringify(fl.options[0].valeurs) === JSON.stringify([{ v: 'non', nom: 'mm, cm, dm, m' }, { v: 'oui', nom: 'Avec le kilomètre' }]),
    'longueurs : titre, emoji, option km (non puis oui, défaut oui)');

  const doc = (c, o) => new JSDOM(`<div>${rendre(fl, c, o)}</div>`).window.document;
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];
  const txt = (el) => el.textContent.replace(/[ \t\n\r]+/g, ' ');
  // Valeurs en millimètres, recalculées ici sans rien emprunter au générateur.
  const MM = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000 };
  const mesures = (t) => [...String(t).matchAll(/([\d ]+) (mm|cm|dm|km|m)(?![\p{L}])/gu)].map((m) => ({ n: parseInt(m[1].replace(/ /g, ''), 10), u: m[2] }));
  const enMm = (l) => l.reduce((s, x) => s + x.n * MM[x.u], 0);

  // La figure dessinée : un dessin par côté, l'étiquette la plus proche de son côté, lisible dans le cadre.
  const lireFigure = (svg) => ({
    forme: svg.dataset.forme,
    cotes: [...svg.querySelectorAll('text.cote')].map((t) => +t.dataset.cm),
    textes: [...svg.querySelectorAll('text.cote')].map((t) => t.textContent),
    sommets: svg.querySelector('polygon').getAttribute('points').split(' ').map((p) => p.split(',').map(Number)),
    etiquettes: [...svg.querySelectorAll('text.cote')].map((t) => [+t.getAttribute('x'), +t.getAttribute('y') - 4]),
  });
  const distSegment = (p, a, b) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const figureOk = (f, nbCotes) => {
    if (f.cotes.length !== nbCotes || f.sommets.length !== nbCotes) return false;
    // chaque étiquette est plus proche de son côté que de tous les autres, à moins de 32 unités, dans le cadre (220 × 138)
    return f.etiquettes.every((e, k) => {
      const d = f.sommets.map((a, i) => distSegment(e, a, f.sommets[(i + 1) % nbCotes]));
      return d[k] <= 32 && d.every((x, i) => i === k || d[k] <= x) && e[0] > 12 && e[0] < 208 && e[1] > 6 && e[1] < 134;
    }) && f.textes.every((t, k) => t === `${f.cotes[k]} cm`);
  };

  // La fonction de dessin elle-même
  {
    const essais = [['carre', [5], 4], ['carre', [5, 5, 5, 5], 4], ['rectangle', [8, 3], 4], ['rectangle', [8, 3, 8, 3], 4], ['triangle', [6, 7, 8], 3], ['triangle', [3, 4, 5], 3], ['pentagone', [18, 12, 30, 7, 20], 5], ['pentagone', [5, 5, 5, 5, 5], 5]];
    const ok = essais.every(([forme, cotes, n]) => {
      const svg = new JSDOM(`<div>${polygoneCote({ forme, cotes })}</div>`).window.document.querySelector('svg');
      return svg.classList.contains('polygone-cote') && figureOk(lireFigure(svg), n);
    });
    verifier(ok, 'polygoneCote : carré, rectangle, triangle et pentagone, une étiquette près de chaque côté, dans le cadre');
    const tri = new JSDOM(`<div>${polygoneCote({ forme: 'triangle', cotes: [3, 4, 5] })}</div>`).window.document.querySelector('svg');
    const pts = lireFigure(tri).sommets;
    const long = (i) => Math.hypot(pts[i][0] - pts[(i + 1) % 3][0], pts[i][1] - pts[(i + 1) % 3][1]);
    verifier(Math.abs(long(0) / long(1) - 3 / 4) < 0.02 && Math.abs(long(2) / long(1) - 5 / 4) < 0.02, 'polygoneCote : le triangle est à l’échelle');
    const rect = lireFigure(new JSDOM(`<div>${polygoneCote({ forme: 'rectangle', cotes: [8, 3] })}</div>`).window.document.querySelector('svg')).sommets;
    verifier(Math.abs((rect[1][0] - rect[0][0]) / (rect[2][1] - rect[1][1]) - 8 / 3) < 0.02 || Math.abs((rect[1][0] - rect[0][0]) / (rect[1][1] - rect[2][1]) - 8 / 3) < 0.02, 'polygoneCote : le rectangle est à l’échelle');
    let leve = false; try { polygoneCote({ forme: 'triangle', cotes: [1, 2] }); } catch { leve = true; }
    verifier(leve, 'polygoneCote : un nombre de côtés incohérent est refusé');
  }

  for (const km of ['non', 'oui']) for (const methode of [true, false]) {
    const k = methode ? { c: 6, e: 4, p: 4, f: 3 } : { c: 8, e: 6, p: 6, f: 4 };
    const nom = `longueurs ${km === 'oui' ? 'avec' : 'sans'} km, ${methode ? 'avec' : 'sans'} méthode`;
    let comptes = 0, conv = 0, mixtes = 0, comp = 0, rang = 0, fig = 0, fuite = 0, mots = 0, bornes = 0, egal = 0;
    for (let graine = 1; graine <= 60; graine++) {
      const c = tirer(fl, { km }, graine * 7919);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);
      const cmpt = (el, sel) => el.querySelectorAll(sel).length;
      if (!(cmpt(e1, '.conversion') === k.c && cmpt(c1, '.conversion') === k.c && cmpt(e2, '.conversion') === k.e && cmpt(c2, '.conversion') === k.e
        && cmpt(e3, '.paire') === k.p && cmpt(c3, '.paire') === k.p && cmpt(e3, '.rang') === 1 && cmpt(c3, '.rang') === 1
        && cmpt(e4, '.figure-lg') === k.f && cmpt(c4, '.figure-lg') === k.f && cmpt(e4, 'svg.polygone-cote') === k.f)) comptes++;

      // Ex. 1 : « 40 mm = … cm » → « 40 mm = 4 cm »
      const unitesVues = new Set();
      [...c1.querySelectorAll('.conversion')].forEach((el, i) => {
        const [g, dr] = txt(el).replace(/^[a-z]\.\s*/, '').split(' = ');
        const a = mesures(g)[0], b = mesures(dr)[0];
        const depart = mesures(txt(e1.querySelectorAll('.conversion')[i]).split('=')[0])[0];
        if (!a || !b || a.u === b.u || !depart || depart.n !== a.n || depart.u !== a.u || a.n * MM[a.u] !== b.n * MM[b.u]) conv++;
        else { unitesVues.add(a.u); unitesVues.add(b.u); }
        if (!txt(e1.querySelectorAll('.conversion')[i]).trim().endsWith(`=${b.u}`)) conv++;   // l'unité d'arrivée est écrite sur la feuille
      });
      // Ex. 2 : écritures mixtes, un côté à deux parties
      [...c2.querySelectorAll('.conversion')].forEach((el) => {
        const [g, dr] = txt(el).replace(/^[a-z]\.\s*/, '').split(' = ');
        const a = mesures(g), b = mesures(dr);
        const [mixte, simple] = a.length === 2 ? [a, b] : [b, a];
        const okForme = (a.length === 1 && b.length === 2) || (a.length === 2 && b.length === 1);
        const ordre = okForme && mixte[0].u !== mixte[1].u && MM[mixte[0].u] / MM[mixte[1].u] >= 10 && mixte[1].n < MM[mixte[0].u] / MM[mixte[1].u] && mixte[1].n > 0 && simple[0].u === mixte[1].u;
        if (!ordre || enMm(a) !== enMm(b)) mixtes++;
        a.concat(b).forEach((x) => unitesVues.add(x.u));
      });
      // Ex. 3 : symboles
      let egalites = 0;
      [...c3.querySelectorAll('.paire')].forEach((el) => {
        const a = mesures(el.querySelector('.paire__a').textContent), b = mesures(el.querySelector('.paire__b').textContent);
        const s = el.querySelector('.paire__symbole').textContent;
        if (a.length !== 1 || b.length !== 1 || a[0].u === b[0].u || s !== (enMm(a) < enMm(b) ? '<' : enMm(a) > enMm(b) ? '>' : '=')) comp++;
        if (s === '=') egalites++;
        a.concat(b).forEach((x) => unitesVues.add(x.u));
      });
      if (egalites !== 1) egal++;
      // Rangement : 4 longueurs d'unités différentes, mélangées, rangées du plus petit au plus grand
      const donnees = mesures(e3.querySelector('.rang__nombres').textContent);
      const rangees = mesures(c3.querySelector('.rang__reponse--corrige').textContent);
      const tri = [...donnees].sort((x, y) => enMm([x]) - enMm([y]));
      const ordreDonne = donnees.every((x, i) => !i || enMm([x]) > enMm([donnees[i - 1]])) || donnees.every((x, i) => !i || enMm([x]) < enMm([donnees[i - 1]]));
      if (donnees.length !== 4 || rangees.length !== 4 || JSON.stringify(rangees) !== JSON.stringify(tri) || ordreDonne || new Set(donnees.map((x) => enMm([x]))).size !== 4
        || new Set(donnees.map((x) => x.u)).size < (km === 'oui' ? 2 : 4) || cmpt(e3, '.rang .pointilles') !== 4) rang++;
      donnees.forEach((x) => unitesVues.add(x.u));
      // Ex. 4 : périmètres
      const figs = [...e4.querySelectorAll('svg.polygone-cote')].map(lireFigure);
      const formes = figs.map((f) => f.forme).join();
      const attendu = methode ? [/^carre,rectangle,(triangle|pentagone)$/] : [/^carre,rectangle,(triangle,pentagone|pentagone,triangle)$/];
      const nbCotes = { carre: 4, rectangle: 4, triangle: 3, pentagone: 5 };
      let figOk = attendu[0].test(formes) && figs.every((f) => figureOk(f, nbCotes[f.forme]));
      [...c4.querySelectorAll('.figure-lg')].forEach((el, i) => {
        const f = lireFigure(el.querySelector('svg.polygone-cote'));
        if (f.forme !== figs[i].forme || f.cotes.join() !== figs[i].cotes.join()) figOk = false;
        const [g, dr] = txt(el.querySelector('.calcul-lg')).replace(/^\s*Calcul : /, '').split(' = ');
        const termes = mesures(g), total = mesures(dr);
        const somme = f.cotes.reduce((s, x) => s + x, 0);
        if (termes.length !== nbCotes[f.forme] || termes.some((t) => t.u !== 'cm') || termes.map((t) => t.n).join() !== f.cotes.join()
          || total.length !== 1 || total[0].u !== 'cm' || total[0].n !== somme || !/^(\d+ cm \+ )+\d+ cm$/.test(g)) figOk = false;
        if (f.forme === 'carre' && new Set(f.cotes).size !== 1) figOk = false;
        if (f.forme === 'rectangle' && !(f.cotes[0] === f.cotes[2] && f.cotes[1] === f.cotes[3] && f.cotes[0] !== f.cotes[1])) figOk = false;
        if (f.forme === 'triangle' && Math.max(...f.cotes) * 2 >= somme) figOk = false;
      });
      if (!figOk) fig++;

      // Unités dans les bornes de l'option
      const tout = pe.textContent + pc.textContent;
      if (km === 'non' && (unitesVues.has('km') || /\bkm\b|kilomètre/.test(tout))) bornes++;
      if (km === 'oui' && !(unitesVues.has('km') && cmpt(e1, '.conversion') === k.c && /km/.test(txt(e1)) && /km/.test(txt(e2)))) bornes++;
      ['mm', 'cm', 'dm', 'm'].forEach((u) => { if (km === 'non' && !unitesVues.has(u)) bornes++; });

      // Page élève : aucune réponse (hors exemple du rappel)
      if (pe.querySelectorAll('.rouge, .calcul-lg--corrige, .paire__symbole').length) fuite++;
      if (/=\s*\d/.test(txt(e1) + txt(e2) + txt(e4))) fuite++;
      if ([...e3.querySelectorAll('.case-symbole')].some((x) => x.textContent.trim())) fuite++;
      if ([...e4.querySelectorAll('.pointilles')].some((x) => x.textContent.trim())) fuite++;
      // Ton, emoji, typographie des unités (espace insécable)
      if (/faux|erreur|raté|✗|✘|❌|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tout)) mots++;
      if (/\d (mm|cm|dm|km|m)(?![\p{L}])/u.test(tout)) mots++;
    }
    verifier(comptes === 0, `${nom} : mêmes comptes élève / corrigé (${k.c} conversions, ${k.e} écritures, ${k.p} comparaisons + 1 rangement, ${k.f} figures), 60 tirages`);
    verifier(conv === 0, `${nom} : conversions exactes (recalculées en mm)`);
    verifier(mixtes === 0, `${nom} : écritures mixtes exactes`);
    verifier(comp === 0 && egal === 0, `${nom} : symboles exacts (recalculés en mm), une égalité par feuille, unités différentes de chaque côté`);
    verifier(rang === 0, `${nom} : rangement de 4 longueurs d’unités différentes, exact et jamais déjà rangé`);
    verifier(fig === 0, `${nom} : figures (étiquettes près de chaque côté), additions écrites et périmètres exacts`);
    verifier(bornes === 0, `${nom} : unités dans les bornes de l’option`);
    verifier(fuite === 0, `${nom} : aucune réponse sur la page élève`);
    verifier(mots === 0, `${nom} : aucun mot négatif ni emoji, espace insécable avant chaque unité`);
    const d0 = doc(tirer(fl, { km }, 99), { corrige: true, methode });
    const [pe0, pc0] = d0.querySelectorAll('.feuille');
    verifier(pe0.querySelectorAll('.bloc--methode').length === (methode ? 1 : 0) && !pc0.querySelector('.bloc--methode') && !pc0.textContent.includes('Nom :'), `${nom} : rappel seulement avec la méthode, jamais dans le corrigé ni la ligne Nom / Date`);
  }

  // Le rappel : phrases et exemple de la leçon
  for (const km of ['non', 'oui']) {
    const m = doc(tirer(fl, { km }, 11), { corrige: false, methode: true }).querySelector('.bloc--methode');
    const t = txt(m).replace(/[\u00a0\u202f]/g, ' ');
    const communes = ['Le centimètre est une unité de longueur dix fois plus grande que le millimètre.', '1 cm = 10 mm',
      'Le mètre est une unité de longueur cent fois plus grande que le centimètre.', '1 m = 100 cm',
      'Le mètre est une unité de longueur dix fois plus grande que le décimètre.', '1 m = 10 dm',
      'Le décimètre est une unité de longueur dix fois plus grande que le centimètre.', '1 dm = 10 cm',
      'Le périmètre d’une figure est la longueur du tour de cette figure.',
      'On calcule le périmètre d’une figure en additionnant les longueurs de tous les côtés de la figure.',
      '30 cm + 12 cm + 18 cm + 20 cm + 7 cm = 87 cm', 'Le périmètre de cette figure mesure 87 cm.'];
    const kmPhrases = ['Le kilomètre est une unité de longueur 1 000 fois plus grande que le mètre.', '1 km = 1 000 m', '5 km, c’est 5 000 m.', '3 700 m, c’est 3 km 700 m.'];
    verifier(communes.every((p) => t.includes(p)), `longueurs ${km} : le rappel reprend les phrases de la leçon (mm, cm, dm, m, périmètre)`);
    verifier(kmPhrases.every((p) => t.includes(p)) === (km === 'oui') && (km === 'oui' || !/km|kilomètre/.test(t)), `longueurs ${km} : le rappel ${km === 'oui' ? 'reprend les phrases du kilomètre' : 'ne parle pas du kilomètre'}`);
    const f = lireFigure(m.querySelector('svg.polygone-cote'));
    verifier(f.forme === 'pentagone' && f.cotes.join() === '18,12,30,7,20' && figureOk(f, 5) && f.cotes.reduce((s, x) => s + x, 0) === 87, `longueurs ${km} : l’exemple de la leçon dessiné (pentagone 18, 12, 30, 7, 20 cm : 87 cm)`);
    verifier(!m.querySelector('table') && m.querySelectorAll('svg').length === 1, `longueurs ${km} : pas de tableau de conversion (la leçon n’en montre pas)`);
  }

  // Codes reproductibles et options
  for (const km of ['non', 'oui']) {
    const c = tirer(fl, { km });
    const r = decoder(c.code);
    verifier(r && r.fiche === fl && r.options.km === km && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `longueurs ${km} : le code ${c.code} redonne la même fiche`);
    verifier(rendre(fl, tirer(fl, { km }, 77), { corrige: true }) === rendre(fl, tirer(fl, { km }, 77), { corrige: true }), `longueurs ${km} : même graine, même HTML`);
    const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fl, { km }).code);
    verifier(vus.size > 190, `longueurs ${km} : codes variés (${vus.size} sur 200)`);
  }
  verifier(codeDe(fl, { km: 'non' }, 5) !== codeDe(fl, { km: 'oui' }, 5), 'longueurs : l’option change le code');

  // Les neuf fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352,750168435,1150851747,649082766,1335819493', `longueurs : les neuf fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 9).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie', 'longueurs : ordre des neuf premières fiches inchangé');
}

/* Heures : lire l'heure sur une horloge à aiguilles ----------------------- */
{
  const fh = FICHES.find((f) => f.id === 'ce2-heures');
  console.log('— Heures : lire l’heure sur une horloge');
  verifier(FICHES.indexOf(fh) === 10, 'heures : fiche à l’index 10 de FICHES');
  verifier(fh.titre === 'Les heures : lire l’heure sur une horloge' && fh.emoji === '🕒' && fh.options.length === 1 && fh.options[0].id === 'minutes' && fh.options[0].defaut === 'cinq'
    && JSON.stringify(fh.options[0].valeurs) === JSON.stringify([{ v: 'quarts', nom: 'Heures, quarts et demies' }, { v: 'cinq', nom: 'Toutes les 5 minutes' }]),
    'heures : titre, emoji, option minutes (quarts puis cinq, défaut cinq)');

  // Une seule fenêtre jsdom pour tout le bloc : on y recrée un conteneur par rendu (les rendus précédents sont libérés).
  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fh, c, o));
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];
  const txt = (el) => { const c = el.cloneNode(true); c.querySelectorAll('svg').forEach((x) => x.remove()); return c.textContent.replace(/[\u00a0\u202f]/g, ' ').replace(/[ \t\n\r]+/g, ' ').trim(); };

  // Lecture d'un cadran SVG : angles des deux aiguilles (lus dans transform), sans rien emprunter au générateur.
  const angle = (g) => (g ? +/rotate\(([-\d.]+)/.exec(g.getAttribute('transform'))[1] : null);
  const lireCadran = (svg) => {
    const aH = angle(svg.querySelector('.aiguille-heures')), aM = angle(svg.querySelector('.aiguille-minutes'));
    if (aH === null || aM === null) return null;
    const m = Math.round(aM / 6) % 60;
    const h12 = Math.floor((aH + 0.01) / 30) % 12 || 12;
    // cohérence : la petite aiguille a avancé de m / 2 degrés dans son heure
    const ok = Math.abs(aM - 6 * m) < 0.1 && Math.abs(aH - (((h12 % 12) * 30) + m / 2)) < 0.1;
    return { h: h12, m, ok };
  };
  const hmTexte = (t) => { const r = /(\d+) h (\d\d)/.exec(t); return r ? { h: +r[1], m: +r[2] } : null; };
  const toutesHm = (t) => [...t.matchAll(/(\d+) h (\d\d)/g)].map((r) => ({ h: +r[1], m: +r[2] }));

  // Le composant horloge
  {
    const svg = (o) => conteneur(horloge(o)).querySelector('svg');
    let ok = true;
    for (let h = 1; h <= 12; h++) for (const m of [0, 7, 15, 30, 45, 59]) {
      const c = lireCadran(svg({ heures: h, minutes: m }));
      if (!c || !c.ok || c.h !== h || c.m !== m) ok = false;
    }
    verifier(ok, 'horloge : angles des deux aiguilles exacts pour toutes les heures (la petite avance avec les minutes)');
    const a = svg({ heures: 3, minutes: 30 });
    verifier(a.querySelectorAll('text').length === 12 && [...a.querySelectorAll('text')].map((t) => t.textContent).join() === '1,2,3,4,5,6,7,8,9,10,11,12', 'horloge : 12 chiffres');
    const traits = [...a.querySelectorAll('line')].filter((l) => !l.closest('.aiguille-heures, .aiguille-minutes'));
    const gros = traits.filter((l) => +l.getAttribute('stroke-width') > 1.5);
    verifier(traits.length === 60 && gros.length === 12, 'horloge : 60 graduations dont 12 plus marquées');
    const lH = a.querySelector('.aiguille-heures line'), lM = a.querySelector('.aiguille-minutes line');
    const long = (l) => Math.abs(+l.getAttribute('y2') - 50);
    verifier(long(lH) < long(lM) * 0.7 && +lH.getAttribute('stroke-width') > 2 * +lM.getAttribute('stroke-width'), 'horloge : petite aiguille courte et épaisse, grande aiguille longue et fine');
    const v = svg({ heures: 3, minutes: 30, aiguilles: false });
    verifier(!v.querySelector('.aiguille-heures') && !v.querySelector('.aiguille-minutes') && v.querySelectorAll('circle').length === 2, 'horloge : cadran vierge sans aiguilles, centre marqué');
    verifier(!svg({ heures: 3, minutes: 30, chiffres: false }).querySelector('text'), 'horloge : chiffres masquables');
    let leve = false; try { horloge({ heures: 3, minutes: 75 }); } catch { leve = true; }
    verifier(leve, 'horloge : une heure impossible est refusée');
  }

  for (const minutes of ['quarts', 'cinq']) for (const methode of [true, false]) {
    const k = methode ? { l: 6, m: 4, t: 4, v: 4 } : { l: 8, m: 6, t: 6, v: 6 };
    const permis = minutes === 'quarts' ? [0, 15, 30, 45] : Array.from({ length: 12 }, (_, i) => 5 * i);
    const nom = `heures ${minutes}, ${methode ? 'avec' : 'sans'} méthode`;
    let comptes = 0, lecture = 0, moinsKo = 0, tracerKo = 0, vingtKo = 0, bornes = 0, fuite = 0, mots = 0, couverture = 0, angles = 0;
    for (let graine = 1; graine <= 30; graine++) {
      const c = tirer(fh, { minutes }, graine * 7919);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);
      const n = (el, sel) => el.querySelectorAll(sel).length;
      if (!(n(e1, '.horloge-item') === k.l && n(c1, '.horloge-item') === k.l && n(e2, '.horloge-item') === k.m && n(c2, '.horloge-item') === k.m
        && n(e3, '.horloge-item') === k.t && n(c3, '.horloge-item') === k.t && n(e4, '.horloge-item') === k.v && n(c4, '.horloge-item') === k.v
        && n(e1, '.case-h') === 2 * k.l && n(e4, '.case-h') === 2 * k.v)) comptes++;

      // Ex. 1 : heure écrite sous l'horloge = heure lue sur les aiguilles, matin, minutes dans l'option ; aiguilles identiques sur la page élève
      const vus1 = new Set();
      [...c1.querySelectorAll('.horloge-item')].forEach((el, i) => {
        const cad = lireCadran(el.querySelector('svg')), ecrit = hmTexte(txt(el));
        if (!cad || !cad.ok || !ecrit || ecrit.h !== cad.h || ecrit.m !== cad.m || cad.h < 6 || cad.h > 11 || !permis.includes(cad.m)) lecture++;
        else vus1.add(cad.m);
        const eleve = lireCadran(e1.querySelectorAll('.horloge-item')[i].querySelector('svg'));
        if (!eleve || eleve.h !== cad.h || eleve.m !== cad.m) lecture++;
        if (!permis.includes(cad.m)) bornes++;
      });
      if (![0, 15, 30, 45].every((m) => vus1.has(m))) couverture++;

      // Ex. 2 : « 8 heures moins 10, c'est 7 h 50 » — l'équivalence est recalculée
      [...c2.querySelectorAll('.horloge-item')].forEach((el) => {
        const cad = lireCadran(el.querySelector('svg')), t = txt(el).replace(/^[a-z]\.\s*/, '');
        const lu = hmTexte(t);
        const moins = /^(\d+) heures moins (le quart|\d+), c’est (\d+) h (\d\d)\.$/.exec(t);
        const demie = /^(\d+) heures et demie, c’est (\d+) h (\d\d)\.$/.exec(t);
        if (!cad || !cad.ok || !lu) { moinsKo++; return; }
        if (moins) {
          const retire = moins[2] === 'le quart' ? 15 : +moins[2];
          const total = (+moins[1] * 60 - retire) % 720;
          if (cad.m < 35 || (minutes === 'quarts' && cad.m !== 45) || (cad.h * 60 + cad.m) % 720 !== total % 720 || lu.h !== cad.h || lu.m !== cad.m || +moins[1] !== (cad.h % 12) + 1 && !(cad.h === 11 && +moins[1] === 12)) moinsKo++;
          if (moins[2] === 'le quart' && cad.m !== 45) moinsKo++;
          if ((moins[2] === 'le quart') !== (retire === 15)) moinsKo++;
        } else if (demie) {
          if (minutes !== 'quarts' || cad.m !== 30 || +demie[1] !== cad.h || lu.h !== cad.h || lu.m !== 30) moinsKo++;
        } else moinsKo++;
        if (!permis.includes(cad.m)) bornes++;
      });
      if (minutes === 'cinq' && new Set([...c2.querySelectorAll('.horloge-item svg')].map((s) => lireCadran(s).m)).size < 4) couverture++;

      // Ex. 3 : cadran vierge sur la page élève, heure écrite dessous ; le corrigé trace des aiguilles qui lui correspondent
      [...e3.querySelectorAll('.horloge-item')].forEach((el, i) => {
        const ecrit = hmTexte(txt(el)), corr = c3.querySelectorAll('.horloge-item')[i];
        const cad = lireCadran(corr.querySelector('svg')), ecritC = hmTexte(txt(corr));
        if (el.querySelector('.aiguille-heures, .aiguille-minutes') || !ecrit || !cad || !cad.ok || !ecritC || ecritC.h !== ecrit.h || ecritC.m !== ecrit.m || cad.h !== ecrit.h || cad.m !== ecrit.m) tracerKo++;
        if (!permis.includes(ecrit.m) || ecrit.h < 1 || ecrit.h > 12) bornes++;
        // l'angle de la petite aiguille est cohérent avec l'heure
        const aH = angle(corr.querySelector('.aiguille-heures'));
        if (Math.abs(aH - (((ecrit.h % 12) * 30) + ecrit.m / 2)) > 0.1) angles++;
      });

      // Ex. 4 : 24 h = heure + 12 pour l'après-midi et le soir
      const periodes = new Set();
      [...c4.querySelectorAll('.horloge-item')].forEach((el) => {
        const cad = lireCadran(el.querySelector('svg')), t = txt(el).replace(/^[a-z]\.\s*/, '');
        const r = /^(\d+) h (\d\d) (l’après-midi|le soir), c’est (\d+) h (\d\d)\.$/.exec(t);
        if (!cad || !cad.ok || !r || +r[1] !== cad.h || +r[2] !== cad.m || +r[4] !== cad.h + 12 || +r[5] !== cad.m || r[5].length !== 2) vingtKo++;
        else {
          periodes.add(r[3]);
          if (r[3] === 'l’après-midi' && (cad.h < 1 || cad.h > 5)) vingtKo++;
          if (r[3] === 'le soir' && (cad.h < 6 || cad.h > 11)) vingtKo++;
        }
        if (!permis.includes(cad.m)) bornes++;
      });
      if (periodes.size !== 2) couverture++;
      [...e4.querySelectorAll('.horloge-item')].forEach((el, i) => {
        const cad = lireCadran(el.querySelector('svg')), cc = lireCadran(c4.querySelectorAll('.horloge-item')[i].querySelector('svg'));
        if (!cad || !cc || cad.h !== cc.h || cad.m !== cc.m) vingtKo++;
      });

      // Page élève : aucune réponse écrite (hors exemple de la leçon), aucun rouge, libellés d'accessibilité sans l'heure
      const reps = (bloc) => [...bloc.querySelectorAll('.horloge-item__rep, .horloge-item__periode')].map((x) => x.textContent);
      const heuresDonnees = reps(e3).map((t) => hmTexte(t.replace(/[\u00a0\u202f]/g, ' ')));
      if (pe.querySelector('.rouge') || [e1, e2, e4].some((b) => reps(b).some((t) => /\d/.test(t)))
        || heuresDonnees.length !== k.t || heuresDonnees.some((x) => !x)
        || [...pe.querySelectorAll('.bloc:not(.bloc--methode) svg')].some((x) => /\d/.test(x.getAttribute('aria-label')))) fuite++;

      const tout = pe.textContent + ' ' + pc.textContent;
      if (/faux|erreur|raté|✗|✘|❌|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tout)) mots++;
    }
    verifier(comptes === 0, `${nom} : mêmes comptes élève / corrigé (${k.l} horloges, ${k.m} « moins », ${k.t} cadrans, ${k.v} heures 24 h), cases de réponse, 30 tirages`);
    verifier(lecture === 0, `${nom} : heures lues exactes (aiguilles relues dans le SVG), matin, mêmes horloges sur les deux pages`);
    verifier(couverture === 0, `${nom} : heure pile, et quart, et demie, moins le quart présents ; variété des minutes ; matin et soir`);
    verifier(moinsKo === 0, `${nom} : lectures « moins » et équivalences exactes (ex. 8 heures moins 10 = 7 h 50)`);
    verifier(tracerKo === 0 && angles === 0, `${nom} : cadrans vierges sur la page élève, aiguilles du corrigé exactes (angle de la petite aiguille cohérent avec l’heure)`);
    verifier(vingtKo === 0, `${nom} : notation 24 h exacte (heure + 12), après-midi 1 h à 5 h, soir 6 h à 11 h`);
    verifier(bornes === 0, `${nom} : minutes dans les bornes de l’option`);
    verifier(fuite === 0, `${nom} : aucune réponse sur la page élève (hors exemple de la leçon)`);
    verifier(mots === 0, `${nom} : aucun mot négatif ni emoji sur la feuille`);
    const d0 = doc(tirer(fh, { minutes }, 99), { corrige: true, methode });
    const [pe0, pc0] = d0.querySelectorAll('.feuille');
    verifier(pe0.querySelectorAll('.bloc--methode').length === (methode ? 1 : 0) && !pc0.querySelector('.bloc--methode') && !pc0.textContent.includes('Nom :'), `${nom} : rappel seulement avec la méthode, jamais dans le corrigé ni la ligne Nom / Date`);
  }

  // Le rappel : phrases et exemples de la leçon
  for (const minutes of ['quarts', 'cinq']) {
    const m = doc(tirer(fh, { minutes }, 11), { corrige: false, methode: true }).querySelector('.bloc--methode');
    const t = txt(m);
    const phrases = ['La petite aiguille indique les heures.', 'La grande aiguille indique les minutes.', 'Il est 20 heures 13 minutes.', 'Le 15 est relié à « et quart » ; le 30 est relié à « et demie ».',
      '1 heure = 60 minutes', 'une demi-heure = 30 minutes', 'un quart d’heure = 15 minutes', 'trois quarts d’heure = 45 minutes',
      'Il est 8 heures moins 10.', 'Il est 7 h 50.', 'Il est 7 heures 50 minutes.', 'Dans 10 minutes, il sera 8 heures.',
      'moins 5 → 55', 'moins 10 → 50', 'moins le quart → 45', 'moins 20 → 40', 'moins 25 → 35'];
    verifier(phrases.every((p) => t.includes(p)), `heures ${minutes} : le rappel reprend les phrases de la leçon (aiguilles, et quart / et demie, « 8 heures moins 10 », moins 5 à moins 25)`);
    const svgs = [...m.querySelectorAll('svg')].map(lireCadran);
    verifier(svgs.length === 2 && svgs[0].ok && svgs[0].h === 8 && svgs[0].m === 13 && svgs[1].ok && svgs[1].h === 7 && svgs[1].m === 50, `heures ${minutes} : horloges d’exemple 8 h 13 (20 h 13) et 7 h 50 (8 heures moins 10)`);
  }

  // Codes reproductibles et options
  for (const minutes of ['quarts', 'cinq']) {
    const c = tirer(fh, { minutes });
    const r = decoder(c.code);
    verifier(r && r.fiche === fh && r.options.minutes === minutes && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `heures ${minutes} : le code ${c.code} redonne la même fiche`);
    verifier(rendre(fh, tirer(fh, { minutes }, 77), { corrige: true }) === rendre(fh, tirer(fh, { minutes }, 77), { corrige: true }), `heures ${minutes} : même graine, même HTML`);
    const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fh, { minutes }).code);
    verifier(vus.size > 190, `heures ${minutes} : codes variés (${vus.size} sur 200)`);
  }
  verifier(codeDe(fh, { minutes: 'quarts' }, 5) !== codeDe(fh, { minutes: 'cinq' }, 5), 'heures : l’option change le code');

  // Les dix fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352,750168435,1150851747,649082766,1335819493,11888257,1584605419', `heures : les dix fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 10).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs', 'heures : ordre des dix premières fiches inchangé');
}

/* Masses et contenances : unités et conversions --------------------------- */
{
  const fm = FICHES.find((f) => f.id === 'ce2-masses-contenances');
  console.log('— Masses et contenances : unités et conversions');
  verifier(FICHES.indexOf(fm) === 11, 'masses et contenances : fiche à l’index 11 de FICHES');
  verifier(fm.titre === 'Les masses et les contenances' && fm.emoji === '⚖️' && fm.options.length === 1 && fm.options[0].id === 'grandeur' && fm.options[0].defaut === 'deux'
    && JSON.stringify(fm.options[0].valeurs) === JSON.stringify([{ v: 'masses', nom: 'Masses (g, kg, t)' }, { v: 'contenances', nom: 'Contenances (cL, dL, L)' }, { v: 'deux', nom: 'Les deux' }]),
    'masses et contenances : titre, emoji, option grandeur (masses, contenances, deux ; défaut deux)');

  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fm, c, o));
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];
  const brut = (el) => el.textContent;
  const txt = (el) => { const c = el.cloneNode(true); c.querySelectorAll('svg').forEach((x) => x.remove()); return c.textContent.replace(/[  ]/g, ' ').replace(/[ \t\n\r]+/g, ' ').trim(); };

  // Tout est recalculé ici : valeur en g (masses) ou en cL (contenances).
  const BASE = { g: 1, kg: 1000, t: 1000000, cL: 1, dL: 10, L: 100 };
  const FAM = { g: 'masses', kg: 'masses', t: 'masses', cL: 'contenances', dL: 'contenances', L: 'contenances' };
  const mesures = (t) => [...String(t).matchAll(/(\d+(?: \d{3})*) (kg|g|t|cL|dL|L)(?![\p{L}\d])/gu)].map((m) => ({ n: parseInt(m[1].replace(/ /g, ''), 10), u: m[2] }));
  const val = (x) => x.n * BASE[x.u];
  // Objets : unité et quantités réalistes (aucun verre de 12 t).
  const OBJETS = {
    'Une pomme': ['g', 80, 250], 'Un œuf': ['g', 40, 80], 'Un cahier': ['g', 80, 250], 'Un livre': ['g', 150, 500], 'Un stylo': ['g', 3, 20],
    'Un chat': ['kg', 2, 6], 'Un cartable': ['kg', 2, 6], 'Un melon': ['kg', 1, 3], 'Un vélo': ['kg', 8, 20], 'Un élève de CE2': ['kg', 20, 40],
    'Un camion': ['t', 5, 30], 'Un éléphant': ['t', 3, 7], 'Un autobus': ['t', 8, 15],
    'Un verre': ['cL', 10, 30], 'Une canette': ['cL', 25, 50], 'Une petite cuillère': ['cL', 1, 2], 'Un biberon': ['cL', 10, 30],
    'Une tasse à café': ['dL', 1, 2], 'Un bol': ['dL', 2, 5], 'Une louche': ['dL', 1, 3], 'Un pot de crème': ['dL', 1, 3],
    'Une bouteille d’eau': ['L', 1, 2], 'Un bidon de produit ménager': ['L', 1, 5], 'Une casserole': ['L', 1, 6], 'Un arrosoir': ['L', 5, 15], 'Un aquarium': ['L', 20, 100],
    'Un réservoir de voiture': ['L', 30, 80], 'Une baignoire': ['L', 100, 200], 'Une piscine gonflable': ['L', 500, 1500],
  };
  const dans = (o, fam) => (o === 'deux' ? true : o === fam);
  const dernierNombre = (t) => { const m = [...String(t).matchAll(/(\d+(?: \d{3})*)(?! \d)/g)]; return m.length ? parseInt(m[m.length - 1][1].replace(/ /g, ''), 10) : NaN; };

  for (const grandeur of ['masses', 'contenances', 'deux']) for (const methode of [true, false]) {
    const k = methode ? { o: 6, c: 6, p: 4, pb: 2 } : { o: 8, c: 8, p: 6, pb: 3 };
    const nom = `masses et contenances ${grandeur}, ${methode ? 'avec' : 'sans'} méthode`;
    let comptes = 0, objets = 0, conv = 0, comp = 0, rang = 0, probl = 0, fuite = 0, mots = 0, famil = 0, equilibre = 0, egal = 0, sens = 0;
    for (let graine = 1; graine <= 40; graine++) {
      const c = tirer(fm, { grandeur }, graine * 7919);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);
      const cmpt = (el, sel) => el.querySelectorAll(sel).length;
      if (!(cmpt(e1, '.conversion') === k.o && cmpt(c1, '.conversion') === k.o && cmpt(e2, '.conversion') === k.c && cmpt(c2, '.conversion') === k.c
        && cmpt(e3, '.paire') === k.p && cmpt(c3, '.paire') === k.p && cmpt(e3, '.rang') === 1 && cmpt(c3, '.rang') === 1
        && cmpt(e4, '.probleme-fr') === k.pb && cmpt(c4, '.probleme-fr') === k.pb && blocs(pe).length === 4 && blocs(pc).length === 4)) comptes++;

      const familles = { objets: [], conv: [], comp: [] };
      // Ex. 1 : l'unité adaptée
      const noms = new Set();
      [...c1.querySelectorAll('.conversion')].forEach((el, i) => {
        const m = /^[a-z]\.\s*(.+) : (\d+(?: \d{3})*) (kg|g|t|cL|dL|L)$/u.exec(txt(el));
        if (!m) { objets++; return; }
        const [, nomObjet, q, u] = m; const n = parseInt(q.replace(/ /g, ''), 10);
        const ref = OBJETS[nomObjet];
        if (!ref || ref[0] !== u || n < ref[1] || n > ref[2] || noms.has(nomObjet) || !dans(grandeur, FAM[u])) objets++;
        noms.add(nomObjet); familles.objets.push(FAM[u]);
        if (txt(e1.querySelectorAll('.conversion')[i]).replace(/ /g, '') !== `${lettre(i)}.${nomObjet}:${q}`.replace(/ /g, '') || cmpt(e1.querySelectorAll('.conversion')[i], '.pointilles') !== 1) objets++;
      });
      // Ex. 2 : conversions dans les deux sens, exactes
      let versPetit = 0, versGrand = 0;
      [...c2.querySelectorAll('.conversion')].forEach((el, i) => {
        const [g, dr] = txt(el).replace(/^[a-z]\.\s*/, '').split(' = ');
        const a = mesures(g)[0], b = mesures(dr)[0];
        const eleve = txt(e2.querySelectorAll('.conversion')[i]).replace(/^[a-z]\.\s*/, '').replace(/ /g, '');
        if (!a || !b || a.u === b.u || FAM[a.u] !== FAM[b.u] || val(a) !== val(b) || !dans(grandeur, FAM[a.u]) || b.n < 1 || a.n < 2
          || eleve !== `${a.n}${a.u}=${b.u}`.replace(/ /g, '')) conv++;
        else { familles.conv.push(FAM[a.u]); if (BASE[a.u] > BASE[b.u]) versPetit++; else versGrand++; }
      });
      if (!versPetit || !versGrand) sens++;
      // Ex. 3 : symboles, une égalité, unités différentes de chaque côté
      let egalites = 0;
      [...c3.querySelectorAll('.paire')].forEach((el, i) => {
        const a = mesures(el.querySelector('.paire__a').textContent.replace(/[  ]/g, ' ')), b = mesures(el.querySelector('.paire__b').textContent.replace(/[  ]/g, ' '));
        const s = el.querySelector('.paire__symbole').textContent;
        if (a.length !== 1 || b.length !== 1 || a[0].u === b[0].u || FAM[a[0].u] !== FAM[b[0].u] || !dans(grandeur, FAM[a[0].u]) || s !== (val(a[0]) < val(b[0]) ? '<' : val(a[0]) > val(b[0]) ? '>' : '=')) comp++;
        else familles.comp.push(FAM[a[0].u]);
        if (s === '=') egalites++;
        const ev = e3.querySelectorAll('.paire')[i];
        if (txt(ev.querySelector('.paire__a')) !== txt(el.querySelector('.paire__a')) || txt(ev.querySelector('.paire__b')) !== txt(el.querySelector('.paire__b'))) comp++;
      });
      if (egalites !== 1) egal++;
      // Rangement : quatre mesures mélangées d'unités différentes, rangées du plus petit au plus grand
      const donnees = mesures(txt(e3.querySelector('.rang__nombres')));
      const rangees = mesures(txt(c3.querySelector('.rang__reponse--corrige')));
      const tri = [...donnees].sort((x, y) => val(x) - val(y));
      const ordreDonne = donnees.every((x, i) => !i || val(x) > val(donnees[i - 1])) || donnees.every((x, i) => !i || val(x) < val(donnees[i - 1]));
      const famRang = donnees.length ? FAM[donnees[0].u] : '';
      if (donnees.length !== 4 || rangees.length !== 4 || JSON.stringify(rangees) !== JSON.stringify(tri) || ordreDonne || new Set(donnees.map(val)).size !== 4
        || donnees.some((x) => FAM[x.u] !== famRang) || !dans(grandeur, famRang) || new Set(donnees.map((x) => x.u)).size < (famRang === 'masses' ? 2 : 3)
        || cmpt(e3, '.rang .pointilles') !== 4 || cmpt(c3, '.rang__reponse--corrige .rouge') !== 4) rang++;
      // Option « deux » : la moitié de chaque dans chaque exercice (rangement à part)
      if (grandeur === 'deux') {
        for (const liste of [familles.objets, familles.conv, familles.comp]) if (liste.filter((x) => x === 'masses').length * 2 !== liste.length) equilibre++;
      } else for (const liste of [familles.objets, familles.conv, familles.comp]) if (liste.some((x) => x !== grandeur)) famil++;
      // Chaque unité de la famille apparaît dans les objets
      for (const fam of grandeur === 'deux' ? ['masses', 'contenances'] : [grandeur]) {
        const unites = new Set([...c1.querySelectorAll('.conversion')].map((el) => /(\S+)$/.exec(txt(el))[1]).filter((u) => FAM[u] === fam));
        if (unites.size !== 3) famil++;
      }
      // Ex. 4 : problèmes recalculés
      const modeles = [];
      [...c4.querySelectorAll('.probleme-fr')].forEach((el, i) => {
        const enonce = txt(el.querySelector('.probleme-fr__enonce')).replace(/^[a-z]\. /, '');
        const [ligneCalcul, lignePhrase] = [...el.querySelectorAll('.probleme-fr__ligne')].map((l) => txt(l.querySelector('.probleme-fr__rep')));
        const m = mesures(enonce);
        let attendu = NaN, modele = '', etapes = [];
        if (/^Pour un gâteau/.test(enonce) && m.length === 3) { modele = 'recette'; attendu = m[0].n + m[1].n + m[2].n; etapes = [`${m[0].n} g + ${m[1].n} g + ${m[2].n} g`]; if (m.some((x) => x.u !== 'g' || x.n < 50 || x.n > 600) || attendu > 1100) attendu = NaN; }
        else if (/^Un sac contient/.test(enonce) && m.length === 2) { modele = 'sac'; attendu = m[0].n * 1000 - m[1].n; if (m[0].u !== 'kg' || m[1].u !== 'g' || attendu <= 0) attendu = NaN; }
        else if (/^Un camion transporte/.test(enonce) && m.length === 2) { modele = 'camion'; attendu = m[0].n * 1000 + m[1].n; if (m[0].u !== 't' || m[1].u !== 'kg' || m[0].n > 5) attendu = NaN; }
        else if (/verres de/.test(enonce) && m.length === 2) { modele = 'verres'; attendu = val(m[0]) / val(m[1]); if (m[0].u !== 'L' || m[1].u !== 'cL' || attendu !== Math.floor(attendu) || attendu < 2) attendu = NaN; }
        else if (/^Une bouteille contient/.test(enonce) && m.length === 2) { modele = 'bouteille'; attendu = (val(m[0]) - val(m[1])) / BASE.cL; if (m[1].u !== 'cL' || attendu <= 0) attendu = NaN; }
        else if (/^Un pichet contient/.test(enonce) && m.length === 2) { modele = 'bouteille'; attendu = (val(m[0]) - val(m[1])) / BASE.dL; if (m[1].u !== 'dL' || attendu <= 0) attendu = NaN; }
        else if (/de jus puis/.test(enonce) && m.length === 2) { modele = 'carafe'; attendu = val(m[0]) + val(m[1]); if (m[0].u !== 'dL' || m[1].u !== 'cL') attendu = NaN; }
        modeles.push(modele);
        const uniteRep = { recette: 'g', sac: 'g', camion: 'kg', verres: 'verres', carafe: 'cL', bouteille: /^Un pichet/.test(enonce) ? 'dL' : 'cL' }[modele] || '';
        const unitesEnonce = new Set(m.map((x) => FAM[x.u]));
        const premiereEtape = ligneCalcul.split(' ; ')[0];
        const conversionOk = modele === 'recette' || (() => { const [x, y] = mesures(premiereEtape); return x && y && x.u === m[0].u && x.n === m[0].n && val(x) === val(y) && y.u === (uniteRep === 'verres' ? 'cL' : uniteRep); })();
        const ecrit = String(attendu).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        const finOk = uniteRep === 'verres' ? ligneCalcul.endsWith(` = ${attendu}`) && lignePhrase.includes(`${attendu} verres`) : ligneCalcul.endsWith(` = ${ecrit} ${uniteRep}`) && lignePhrase.includes(`${ecrit} ${uniteRep}`);
        if (!modele || Number.isNaN(attendu) || dernierNombre(ligneCalcul) !== attendu || dernierNombre(lignePhrase) !== attendu || !conversionOk || !finOk
          || unitesEnonce.size !== 1 || !dans(grandeur, [...unitesEnonce][0])) probl++;
        if (!/^Calcul/.test(txt(e4.querySelectorAll('.probleme-fr__ligne')[2 * i])) || !/^Phrase réponse/.test(txt(e4.querySelectorAll('.probleme-fr__ligne')[2 * i + 1])) || txt(e4.querySelectorAll('.probleme-fr__enonce')[i]) !== txt(el.querySelector('.probleme-fr__enonce'))) probl++;
      });
      const attendusModeles = grandeur === 'masses' ? ['recette', 'sac', 'camion'] : grandeur === 'contenances' ? ['verres'] : ['recette', 'verres'];
      attendusModeles.slice(0, k.pb).forEach((x, i) => { if (modeles[i] !== x) probl++; });
      if (grandeur === 'contenances' && modeles.slice(1).some((x) => x !== 'bouteille' && x !== 'carafe')) probl++;
      if (grandeur === 'deux' && modeles[2] !== undefined && ['recette', 'verres'].includes(modeles[2])) probl++;

      // Page élève : aucune réponse
      if (pe.querySelectorAll('.rouge, .paire__symbole, .probleme-fr__rep').length) fuite++;
      if (/=\s*\d/.test(txt(e1) + txt(e2) + txt(e4))) fuite++;
      if ([...e3.querySelectorAll('.case-symbole')].some((x) => x.textContent.trim())) fuite++;
      if ([...pe.querySelectorAll('.pointilles')].some((x) => x.textContent.trim())) fuite++;
      // Ton, emoji, typographie (espace insécable avant l'unité, espace fine dans les milliers)
      const tout = brut(pe) + brut(pc);
      if (/faux|erreur|raté|✗|✘|❌|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tout)) mots++;
      if (/\d (kg|g|t|cL|dL|L)(?![\p{L}])/u.test(tout) || /\d \d{3}(?!\d)/.test(tout)) mots++;
    }
    verifier(comptes === 0, `${nom} : mêmes comptes élève / corrigé (${k.o} objets, ${k.c} conversions, ${k.p} comparaisons + 1 rangement, ${k.pb} problèmes), 40 tirages`);
    verifier(objets === 0, `${nom} : unités des objets exactes, quantités réalistes, jamais deux fois le même objet`);
    verifier(conv === 0 && sens === 0, `${nom} : conversions exactes (recalculées en g ou en cL), dans les deux sens`);
    verifier(comp === 0 && egal === 0, `${nom} : symboles exacts, une égalité par feuille, unités différentes de chaque côté`);
    verifier(rang === 0, `${nom} : rangement de 4 mesures d’unités différentes, exact et jamais déjà rangé`);
    verifier(famil === 0 && equilibre === 0, `${nom} : unités dans les bornes de l’option${grandeur === 'deux' ? ' (moitié de chaque dans les exercices 1 à 3)' : ''}`);
    verifier(probl === 0, `${nom} : problèmes exacts (calcul et phrase), recalculés indépendamment`);
    verifier(fuite === 0, `${nom} : aucune réponse sur la page élève`);
    verifier(mots === 0, `${nom} : aucun mot négatif ni emoji, espace insécable avant chaque unité`);
    const d0 = doc(tirer(fm, { grandeur }, 99), { corrige: true, methode });
    const [pe0, pc0] = d0.querySelectorAll('.feuille');
    verifier(pe0.querySelectorAll('.bloc--methode').length === (methode ? 1 : 0) && !pc0.querySelector('.bloc--methode') && !pc0.textContent.includes('Nom :'), `${nom} : rappel seulement avec la méthode, jamais dans le corrigé ni la ligne Nom / Date`);
  }

  // Le rappel : les phrases, relations et repères des leçons
  for (const grandeur of ['masses', 'contenances', 'deux']) {
    const m = doc(tirer(fm, { grandeur }, 11), { corrige: false, methode: true }).querySelector('.bloc--methode');
    const t = txt(m);
    const masses = ['1 kg = 1 000 g', 'Un chat pèse 5 300 g ou 5 kg 300 g.', '1 t = 1 000 kg', 'Un éléphant pèse 6 250 kg ou 6 t 250 kg.'];
    const contenances = ['On utilise le litre pour mesurer des contenances.', 'Un litre s’écrit 1 L.', 'Une petite cuillère a une contenance de 1 cL.', 'Une tasse à café a une contenance de 1 dL.',
      'Une brique de lait a une contenance de 1 L.', '1 L = 100 cL', '1 L = 10 dL'];
    const reperes = ['Une bouteille d’eau de 1 L', 'Une brique de lait de 1 L', 'Un bidon de produit ménager de 2 L', 'Une casserole de 5 L', 'Un arrosoir de 12 L', 'Un aquarium de 40 L',
      'Un réservoir de voiture de 50 L', 'Une baignoire de 150 L', 'Une piscine gonflable de 930 L'];
    verifier(masses.every((p) => t.includes(p)) === (grandeur !== 'contenances') && (grandeur !== 'contenances' || !/kg|tonne/.test(t)), `masses et contenances ${grandeur} : le rappel ${grandeur === 'contenances' ? 'ne parle pas des masses' : 'reprend les phrases de la leçon des masses (page 39)'}`);
    verifier(contenances.every((p) => t.includes(p)) === (grandeur !== 'masses') && (grandeur !== 'masses' || !/cL|dL|litre/.test(t)), `masses et contenances ${grandeur} : le rappel ${grandeur === 'masses' ? 'ne parle pas des contenances' : 'reprend les phrases de la leçon des contenances (pages 41 et 42)'}`);
    verifier(reperes.every((p) => t.includes(p)) === (grandeur !== 'masses') && m.querySelectorAll('.rappel-mc__reperes li').length === (grandeur === 'masses' ? 0 : 9), `masses et contenances ${grandeur} : le rappel ${grandeur === 'masses' ? 'n’a pas la liste de repères en litres' : 'reprend les neuf repères du livret'}`);
    verifier(!m.querySelector('table, svg, img'), `masses et contenances ${grandeur} : pas de tableau ni de dessin dans le rappel (la leçon n’en montre pas)`);
  }

  // Codes reproductibles et options
  for (const grandeur of ['masses', 'contenances', 'deux']) {
    const c = tirer(fm, { grandeur });
    const r = decoder(c.code);
    verifier(r && r.fiche === fm && r.options.grandeur === grandeur && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `masses et contenances ${grandeur} : le code ${c.code} redonne la même fiche`);
    verifier(rendre(fm, tirer(fm, { grandeur }, 77), { corrige: true }) === rendre(fm, tirer(fm, { grandeur }, 77), { corrige: true }), `masses et contenances ${grandeur} : même graine, même HTML`);
    const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fm, { grandeur }).code);
    verifier(vus.size > 190, `masses et contenances ${grandeur} : codes variés (${vus.size} sur 200)`);
  }
  verifier(new Set(['masses', 'contenances', 'deux'].map((g) => codeDe(fm, { grandeur: g }, 5))).size === 3, 'masses et contenances : l’option change le code');

  // Les onze fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352,750168435,1150851747,649082766,1335819493,11888257,1584605419,857785706,538954699', `masses et contenances : les onze fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 11).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures', 'masses et contenances : ordre des onze premières fiches inchangé');
}

/* Durées : relations et calculs --------------------------------------------- */
{
  const fd = FICHES.find((f) => f.id === 'ce2-durees');
  console.log('— Durées : relations et calculs');
  verifier(FICHES.indexOf(fd) === 12, 'durées : fiche à l’index 12 de FICHES');
  verifier(fd.titre === 'Les durées : relations et calculs' && fd.emoji === '⏱️' && fd.options.length === 1 && fd.options[0].id === 'secondes' && fd.options[0].defaut === 'non'
    && JSON.stringify(fd.options[0].valeurs) === JSON.stringify([{ v: 'non', nom: 'Minutes et heures' }, { v: 'oui', nom: 'Avec les secondes' }]),
    'durées : titre, emoji, option secondes (non, oui ; défaut non)');

  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fd, c, o));
  const blocs = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')];
  const txt = (el) => { const c = el.cloneNode(true); c.querySelectorAll('svg').forEach((x) => x.remove()); return c.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(); };
  const hor = (s) => { const m = /^(\d+) h(?: (\d\d))?$/.exec(s); return m ? 60 * +m[1] + (m[2] ? +m[2] : 0) : NaN; };
  const dur = (s) => { const m = /^(?:(\d+) h)?(?: ?(\d+) min)?$/.exec(s); return m && s ? 60 * (+m[1] || 0) + (+m[2] || 0) : NaN; };
  // Écritures attendues, refaites ici : « 9 h 40 », « 10 h », « 1 h 35 min », « 35 min ».
  const horTxt = (t) => (t % 60 ? `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')}` : `${t / 60} h`);
  const dureeTxtT = (D) => { const hh = Math.floor(D / 60), mm = D % 60; return hh && mm ? `${hh} h ${mm} min` : hh ? `${hh} h` : `${mm} min`; };
  const HORAIRE = '(\\d+ h(?: \\d\\d)?)';

  // Valeur d'une quantité écrite : en minutes (durées usuelles) ou en secondes ; en ans (siècles, millénaires).
  const enMin = (q) => {
    let m;
    if ((m = /^(\d+) h(?: (\d+)(?: min)?)?$/.exec(q))) return 60 * +m[1] + (+m[2] || 0);
    if ((m = /^(\d+) min$/.exec(q))) return +m[1];
    if (q === '1 quart d’heure') return 15;
    if (q === '1 demi-heure') return 30;
    return NaN;
  };
  const enS = (q) => { let m; if ((m = /^(\d+) min(?: (\d+) s)?$/.exec(q))) return 60 * +m[1] + (+m[2] || 0); if ((m = /^(\d+) s$/.exec(q))) return +m[1]; return NaN; };
  const enAns = (q) => {
    let m;
    if ((m = /^(\d+) siècles?$/.exec(q))) return 100 * +m[1];
    if ((m = /^(\d+) millénaires?$/.exec(q))) return 1000 * +m[1];
    if ((m = /^(\d[\d ]*) ans$/.exec(q))) return +m[1].replace(/ /g, '');
    return NaN;
  };
  // « 90 min = 1 h 30 min » : la valeur de gauche, celle de droite, dans la même unité.
  const egalOk = (ligne) => {
    const [g, d] = ligne.replace(/^[a-z]\.\s*/, '').split(/\s*=\s*/);
    if (!d) return false;
    const x = [enMin, enS, enAns].map((f) => [f(g), f(d)]).find(([a, b]) => !Number.isNaN(a) && !Number.isNaN(b));
    return !!x && x[0] === x[1];
  };

  for (const secondes of ['non', 'oui']) for (const methode of [true, false]) {
    const k = methode ? { e: 6, c: 4, d: 2, p: 2 } : { e: 8, c: 6, d: 3, p: 3 };
    const nom = `durées secondes=${secondes}, ${methode ? 'avec' : 'sans'} méthode`;
    let comptes = 0, egalites = 0, conv = 0, tl = 0, saut = 0, detail = 0, probl = 0, fuite = 0, horaires = 0, mots = 0, secUsage = 0, emoji = 0, tousMultiples = 0;
    for (let graine = 1; graine <= 60; graine++) {
      const c = tirer(fd, { secondes }, graine * 7919);
      const d = doc(c, { corrige: true, methode });
      const [pe, pc] = d.querySelectorAll('.feuille');
      const [e1, e2, e3, e4] = blocs(pe), [c1, c2, c3, c4] = blocs(pc);
      const cmpt = (el, sel) => el.querySelectorAll(sel).length;
      if (!(blocs(pe).length === 4 && blocs(pc).length === 4 && cmpt(e1, '.conversion') === k.e && cmpt(c1, '.conversion') === k.e
        && cmpt(e2, '.conversion') === k.c && cmpt(c2, '.conversion') === k.c
        && cmpt(e3, '.duree') === 2 * k.d && cmpt(c3, '.duree') === 2 * k.d && cmpt(e3, 'svg.ligne-du-temps') === 2 * k.d && cmpt(c3, 'svg.ligne-du-temps') === 2 * k.d
        && cmpt(e4, '.probleme-fr') === k.p && cmpt(c4, '.probleme-fr') === k.p)) comptes++;

      // Ex. 1 et 2 : le corrigé est exact (recalculé ici), la feuille de l'élève n'a que des blancs
      [[c1, e1], [c2, e2]].forEach(([cl, el]) => {
        [...cl.querySelectorAll('.conversion')].forEach((l, i) => {
          if (!egalOk(txt(l))) (cl === c1 ? egalites++ : conv++);
          const gauche = txt(l).replace(/^[a-z]\.\s*/, '').split(/\s*=\s*/)[0];
          const eleve = txt(el.querySelectorAll('.conversion')[i]);
          if (!eleve.replace(/\s/g, '').startsWith(`${lettre(i)}.${gauche}=`.replace(/\s/g, ''))) (cl === c1 ? egalites++ : conv++);
          if (/\d/.test(eleve.split(/\s*=\s*/)[1] || '') || cmpt(el.querySelectorAll('.conversion')[i], '.pointilles') < 1) (cl === c1 ? egalites++ : conv++);
        });
      });
      const gauchesC1 = [...c1.querySelectorAll('.conversion')].map((l) => txt(l).replace(/^[a-z]\.\s*/, '').split(/\s*=\s*/)[0]);
      const exigees = ['1 h', '1 quart d’heure', '1 siècle'];
      if (!exigees.every((x) => gauchesC1.includes(x)) || !gauchesC1.some((x) => /^\d+ h \d+$/.test(x)) || !gauchesC1.some((x) => /^\d+ min$/.test(x)) || !gauchesC1.some((x) => /^[2-9] siècles$/.test(x))) egalites++;
      if (methode === false && !(gauchesC1.includes('1 demi-heure') && gauchesC1.some((x) => x === '1 millénaire'))) egalites++;
      const gauchesC2 = [...c2.querySelectorAll('.conversion')].map((l) => txt(l).replace(/^[a-z]\.\s*/, '').split(/\s*=\s*/)[0]);
      const droitesC2 = [...c2.querySelectorAll('.conversion')].map((l) => txt(l).split(/\s*=\s*/)[1]);
      const aSecondes = gauchesC2.some((x) => / s$/.test(x)) || droitesC2.some((x) => / s$/.test(x));
      if ((secondes === 'oui') !== aSecondes) secUsage++;
      if (secondes === 'oui' && !(gauchesC2.some((x) => /^\d+ min$/.test(x) && droitesC2[gauchesC2.indexOf(x)] && / s$/.test(droitesC2[gauchesC2.indexOf(x)])) && gauchesC2.some((x) => /^\d+ s$/.test(x)))) secUsage++;
      if (secondes === 'non' && !(gauchesC2.some((x) => /millénaires$/.test(x)) && gauchesC2.some((x) => / ans$/.test(x)))) conv++;
      if (new Set(gauchesC2).size !== gauchesC2.length) conv++;

      // Ex. 3 : chaque durée recalculée tout en minutes ; sauts de la ligne du temps du corrigé
      const items = [...c3.querySelectorAll('.duree')];
      const itemsE = [...e3.querySelectorAll('.duree')];
      items.forEach((it, i) => {
        const type = i < k.d ? 'duree' : 'arrivee';
        const enonce = txt(it.querySelector('.duree__enonce')).replace(/^[a-z]\. /, '');
        const m = type === 'duree' ? new RegExp(`^Départ : ${HORAIRE} ; arrivée : ${HORAIRE}\\.$`).exec(enonce) : new RegExp(`^Départ : ${HORAIRE} ; durée : (.+)\\.$`).exec(enonce);
        if (!m) { tl++; return; }
        const t0 = hor(m[1]);
        const D = type === 'duree' ? hor(m[2]) - t0 : dur(m[2]);
        const t1 = type === 'duree' ? hor(m[2]) : t0 + D;
        if (!(t0 % 5 === 0 && t1 % 5 === 0 && D % 5 === 0 && D > 0 && D < 240 && t0 >= 360 && t1 <= 22 * 60)) horaires++;
        // Les sauts dessinés
        const svg = it.querySelector('svg.ligne-du-temps');
        const sauts = [...svg.querySelectorAll('.saut')].map((g) => g.getAttribute('data-libelle').replace(/[ ]/g, ' '));
        const dest = [...svg.querySelectorAll('.horaire')].map((x) => x.textContent.replace(/[ ]/g, ' '));
        const valeurs = sauts.map((s) => dur(s.replace(/^\+ /, '')));
        if (valeurs.some(Number.isNaN) || valeurs.reduce((a, b) => a + b, 0) !== D) saut++;
        // Chaque cible = départ + sauts cumulés ; départ et arrivée imprimés comme dans l'énoncé
        let t = t0; const cibles = [];
        valeurs.forEach((v) => { t += v; cibles.push(t); });
        if (dest.length !== valeurs.length + 1 || dest.slice(1).some((x, j) => hor(x) !== cibles[j]) || hor(dest[0]) !== t0 || cibles[cibles.length - 1] !== t1) saut++;
        // Méthode : jusqu'à l'heure pile, puis les heures, puis les minutes
        const attendus = []; let r = D; const mm = t0 % 60;
        if (mm && r >= 60 - mm) { attendus.push(60 - mm); r -= 60 - mm; }
        if (Math.floor(r / 60)) attendus.push(60 * Math.floor(r / 60));
        if (r % 60) attendus.push(r % 60);
        if (JSON.stringify(attendus) !== JSON.stringify(valeurs)) saut++;
        if (valeurs.length > 1 && cibles.slice(0, -1).some((x, j) => (j === 0 && mm ? x % 60 !== 0 : false))) saut++;
        // Détail en mots
        const dt = txt(it.querySelector('.duree__detail'));
        let tt = t0;
        const morceaux = valeurs.map((v) => { const s = `de ${horTxt(tt)} à ${horTxt(tt + v)} : ${dureeTxtT(v)}`; tt += v; return s; });
        const fin = type === 'duree' ? `en tout ${dureeTxtT(D)}.` : `arrivée à ${horTxt(t1)}.`;
        if (dt !== `${morceaux.join(' ; ')} ; ${fin}`) detail++;
        // Page élève : ligne vierge, rien de la réponse
        const ie = itemsE[i], se = ie.querySelector('svg.ligne-du-temps');
        const dE = [...se.querySelectorAll('.horaire')].map((x) => x.textContent.replace(/ /g, ' '));
        if (se.querySelectorAll('.saut').length || dE.length !== (type === 'duree' ? 2 : 1) || hor(dE[0]) !== t0 || (type === 'duree' && hor(dE[1]) !== t1)) fuite++;
        if (txt(ie.querySelector('.duree__enonce')).replace(/^[a-z]\. /, '') !== enonce || cmpt(ie, '.duree__reponse .pointilles') !== (type === 'duree' ? 2 : 2)) fuite++;
        if (/en tout|arrivée à/.test(txt(ie)) || (type === 'arrivee' && txt(ie).includes(horTxt(t1)) && t1 !== t0)) fuite++;
        tousMultiples++;
      });
      // Ex. 4
      [...c4.querySelectorAll('.probleme-fr')].forEach((pb, i) => {
        const enonce = txt(pb.querySelector('.probleme-fr__enonce')).replace(/^[a-z]\. /, '');
        const [calc, phrase] = [...pb.querySelectorAll('.probleme-fr__rep')].map(txt);
        const hs = [...enonce.matchAll(/(\d+ h(?: \d\d)?)(?![\d ]*min)/g)].map((x) => hor(x[1]));
        let ok = false;
        if (i === 0) { // trajet : départ, arrivée → durée
          const [a, b] = hs; const D = b - a;
          ok = /durée du trajet/.test(enonce) && D > 0 && D < 240 && phrase === `Le trajet dure ${dureeTxtT(D)}.` && calc.endsWith(`= ${dureeTxtT(D)}`) && calc.split(' = ')[0].split(' + ').reduce((s, x) => s + dur(x), 0) === D;
        } else if (i === 1) { // film : début + durée → fin
          const a = hs[0], D = dur(/Il dure (.+?)\. À/.exec(enonce)[1]);
          ok = D > 0 && D < 240 && phrase === `Le film finit à ${horTxt(a + D)}.` && calc.endsWith(`= ${horTxt(a + D)}`) && calc.split(' ; ').reduce((t, s) => { const mm = /^(.+) \+ (.+) = (.+)$/.exec(s); return mm && hor(mm[1]) === t && hor(mm[3]) === t + dur(mm[2]) ? t + dur(mm[2]) : NaN; }, a) === a + D;
        } else {
          const [a, b] = hs; const D = b - a;
          ok = /Combien de minutes/.test(enonce) && D > 0 && D < 60 && phrase === `La récréation dure ${D} min.` && /= \d+ min$|: \d+ min$/.test(calc);
        }
        if (!ok || !(hs.every((x) => x % 5 === 0))) probl++;
        if (!/Calcul :/.test(txt(e4.querySelectorAll('.probleme-fr')[i])) || !/Phrase réponse :/.test(txt(e4.querySelectorAll('.probleme-fr')[i])) || /dure \d|finit à \d/.test(txt(e4.querySelectorAll('.probleme-fr')[i]).replace(enonce, ''))) fuite++;
      });
      // Ton et feuille : pas de mot négatif, pas d'emoji
      const tout = txt(pe) + ' ' + txt(pc);
      if (/faux|erreur|raté|mauvais|✘|✗|✖|❌/i.test(tout)) mots++;
      if (/\p{Extended_Pictographic}/u.test(rendre(fd, c, { corrige: true, methode }).replace(/<svg[\s\S]*?<\/svg>/g, ''))) emoji++;
    }
    verifier(comptes === 0, `${nom} : ${k.e} égalités, ${k.c} conversions, ${2 * k.d} lignes du temps, ${k.p} problèmes, 4 exercices, identiques sur la feuille et le corrigé`);
    verifier(egalites === 0, `${nom} : égalités exactes (recalculées), blancs sur la feuille, relations de la leçon présentes`);
    verifier(conv === 0 && secUsage === 0, `${nom} : conversions exactes dans les deux sens, secondes seulement avec l’option`);
    verifier(tl === 0 && horaires === 0, `${nom} : horaires en multiples de 5 min, durées de moins de 4 h, énoncés bien formés (${tousMultiples} durées)`);
    verifier(saut === 0, `${nom} : sauts de la ligne du temps = heure pile, heures, minutes ; leur somme vaut la durée`);
    verifier(detail === 0, `${nom} : détail en mots du corrigé exact`);
    verifier(probl === 0, `${nom} : problèmes avec calcul et phrase exacts`);
    verifier(fuite === 0, `${nom} : aucune réponse sur la page élève (lignes du temps vierges, blancs, pas de calcul)`);
    verifier(mots === 0 && emoji === 0, `${nom} : aucun mot négatif, aucun emoji sur la feuille`);
  }

  // Le rappel : relations de la leçon, puis le calcul d'une durée sur une ligne du temps
  for (const secondes of ['non', 'oui']) {
    const c = tirer(fd, { secondes }, 31);
    const m = doc(c, { methode: true }).querySelector('.bloc--methode');
    const t = txt(m);
    const relations = ['1 heure = 60 minutes', '1 demi-heure = 30 minutes', '1 quart d’heure = 15 minutes', '1 siècle = 100 ans', '1 millénaire = 1 000 ans', '1 millénaire = 10 siècles'];
    verifier(relations.every((r) => t.includes(r)) && t.includes('1 minute = 60 secondes') === (secondes === 'oui'), `durées secondes=${secondes} : le rappel reprend les relations de la leçon${secondes === 'oui' ? ' et 1 minute = 60 secondes' : ''}`);
    verifier(t.includes('je vais jusqu’à l’heure pile, puis j’ajoute les heures, puis les minutes') && t.includes('En tout : 1 h 35 min.') && t.includes('de 9 h 40 à 10 h : 20 min ; de 10 h à 11 h : 1 h ; de 11 h à 11 h 15 : 15 min'), `durées secondes=${secondes} : le rappel montre 9 h 40 → 11 h 15 en 1 h 35 min`);
    const svg = m.querySelector('svg.ligne-du-temps');
    verifier(svg && [...svg.querySelectorAll('.saut')].map((g) => g.getAttribute('data-libelle').replace(/ /g, ' ')).join() === '+ 20 min,+ 1 h,+ 15 min' && [...svg.querySelectorAll('.horaire')].map((x) => x.textContent.replace(/ /g, ' ')).join() === '9 h 40,10 h,11 h,11 h 15', `durées secondes=${secondes} : la ligne du temps du rappel (+ 20 min, + 1 h, + 15 min)`);
  }
  // La figure elle-même
  {
    const v = conteneur(ligneDuTemps({ debut: '9 h 40', fin: '11 h 15', etapes: [{ libelle: '+ 20 min', cible: '10 h' }, { libelle: '+ 1 h', cible: '11 h' }, { libelle: '+ 15 min', cible: '11 h 15' }] }));
    const xs = [...v.querySelectorAll('.saut text')].map((x) => +x.getAttribute('x'));
    verifier(v.querySelectorAll('.saut').length === 3 && v.querySelectorAll('.horaire').length === 4 && xs.every((x, i) => !i || x - xs[i - 1] > 60), 'ligneDuTemps : trois arcs annotés, quatre horaires, annotations espacées');
    verifier(conteneur(ligneDuTemps({ debut: '8 h' })).querySelectorAll('.saut').length === 0 && conteneur(ligneDuTemps({ debut: '8 h' })).querySelectorAll('.horaire').length === 1, 'ligneDuTemps : sans étape, une droite vierge avec son départ');
  }

  // Codes reproductibles et options
  for (const secondes of ['non', 'oui']) {
    const c = tirer(fd, { secondes });
    const r = decoder(c.code);
    verifier(r && r.fiche === fd && r.options.secondes === secondes && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c), `durées ${secondes} : le code ${c.code} redonne la même fiche`);
    verifier(rendre(fd, tirer(fd, { secondes }, 77), { corrige: true }) === rendre(fd, tirer(fd, { secondes }, 77), { corrige: true }), `durées ${secondes} : même graine, même HTML`);
    const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fd, { secondes }).code);
    verifier(vus.size > 190, `durées ${secondes} : codes variés (${vus.size} sur 200)`);
  }
  verifier(codeDe(fd, { secondes: 'non' }, 5) !== codeDe(fd, { secondes: 'oui' }, 5), 'durées : l’option change le code');

  // Les douze fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352,750168435,1150851747,649082766,1335819493,11888257,1584605419,857785706,538954699,1652536371,2192490432,1573601925', `durées : les douze fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 12).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures,ce2-masses-contenances', 'durées : ordre des douze premières fiches inchangé');
}

/* Solides : reconnaître, décrire, patrons du cube ---------------------------- */
{
  const fs = FICHES.find((f) => f.id === 'ce2-solides');
  console.log('— Solides : reconnaître, décrire, patrons du cube');
  verifier(FICHES.indexOf(fs) === 13, 'solides : fiche à l’index 13 de FICHES');
  verifier(fs.titre === 'Les solides : reconnaître, décrire, patrons du cube' && fs.emoji === '🧊' && fs.options.length === 0, 'solides : titre, emoji, aucune option');

  const NOMS = { cube: 'un cube', pave: 'un pavé droit', pyramide: 'une pyramide', boule: 'une boule', cylindre: 'un cylindre', cone: 'un cône' };
  // Comptes de la leçon (page 47) : faces, sommets, arêtes.
  const LECON = { cube: [6, 8, 12], pave: [6, 8, 12], 'pave-carre': [6, 8, 12], pyramide: [5, 5, 8] };
  // Ce qu'on affirme de chaque solide, écrit ici indépendamment du générateur.
  const VRAI = {
    cube: { faces: 6, aretes: 12, sommets: 8, facesCarrees: 6 }, pave: { faces: 6, aretes: 12, sommets: 8 },
    pyramide: { faces: 5, aretes: 8, sommets: 5, facesTriangulaires: 4, pointe: 1 }, boule: { aretes: 0, sommets: 0, facesPlanes: 0, pointe: 0 },
    cylindre: { facesPlanes: 2, sommets: 0, pointe: 0 }, cone: { facesPlanes: 1, pointe: 1 },
  };
  // Les onze patrons du cube, dessinés en texte ; on les compare à toute rotation ou symétrie près.
  const ART = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]].map(([h, b]) => [0, 1, 2].map((r) => [...'....'].map((_, x) => (r === 1 || (r === 0 && x === h) || (r === 2 && x === b) ? 'X' : '.')).join('')))
    .concat([['XX..', '.XXX', '.X..'], ['XX..', '.XXX', '..X.'], ['XX..', '.XXX', '...X'], ['XX..', '.XX.', '..XX'], ['XXX..', '..XXX']]);
  const casesDe = (art) => art.flatMap((l, y) => [...l].flatMap((c, x) => (c === 'X' ? [[x, y]] : [])));
  const normal = (c) => { const mx = Math.min(...c.map((p) => p[0])), my = Math.min(...c.map((p) => p[1])); return c.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
  const formes = (c) => { const out = []; let t = c; for (let m = 0; m < 2; m++) { for (let r = 0; r < 4; r++) { t = t.map(([x, y]) => [-y, x]); out.push(JSON.stringify(normal(t))); } t = t.map(([x, y]) => [-x, y]); } return out; };
  const PATRONS = new Set(ART.flatMap((a) => formes(casesDe(a))));
  const estUnPatron = (cases) => PATRONS.has(JSON.stringify(normal(cases)));
  const lireCases = (svg) => svg.getAttribute('data-cases').split(';').map((c) => c.split(',').map(Number));

  // Les dessins eux-mêmes
  verifier(Object.keys(NOMS).every((n) => solide(n).includes(`data-solide="${n}"`) && solide(n).includes('arete-cachee') === !['boule'].includes(n) || n === 'boule'), 'solide : les six solides se dessinent, arêtes cachées en pointillés');
  verifier(['cube', 'pave', 'pyramide', 'cylindre', 'cone', 'boule'].every((n) => /stroke-dasharray/.test(solide(n))), 'solide : des pointillés sur chaque solide');
  let patronsOk = 0, valides = 0, invalides = 0;
  for (let n = 0; n < NB_ASSEMBLAGES; n++) for (let q = 0; q < 4; q++) for (const miroir of [false, true]) {
    const { estPatron, cases, svg } = patronCube(n, { quart: q, miroir });
    const doc = new JSDOM(`<div>${svg}</div>`).window.document.querySelector('svg');
    if (estPatron === estUnPatron(cases) && estPatron === estUnPatron(lireCases(doc)) && cases.length === 6) patronsOk++;
    if (q === 0 && !miroir) { if (estPatron) valides++; else invalides++; }
  }
  verifier(patronsOk === NB_ASSEMBLAGES * 8, `patronCube : estPatron recalculé pour les ${NB_ASSEMBLAGES * 8} figures (tournées, retournées)`);
  verifier(valides === 11 && invalides >= 6, `patronCube : ${valides} patrons du cube et ${invalides} assemblages qui n’en sont pas`);

  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fs, c, o));
  const texte = (el) => el.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

  let nomsOk = 0, nomsTot = 0, tabOk = 0, tabTot = 0, patOk = 0, patTot = 0, vfOk = 0, vfTot = 0, comptes = 0, vierge = 0, ton = 0, nbPatrons = 0, mauvaisNb = 0;
  for (let i = 0; i < 40; i++) {
    const c = tirer(fs, {});
    const premiers = c.solides.slice(0, 6).map((s) => s.nom).sort().join();
    if (premiers !== Object.keys(NOMS).sort().join() || c.solides.length !== 8) mauvaisNb++;
    for (const methode of [true, false]) {
      const d = doc(c, { corrige: true, methode });
      const [eleve, corr] = d.querySelectorAll('.feuille');
      const attendu = { cellules: methode ? 6 : 8, lignes: methode ? 3 : 4, patrons: methode ? 6 : 8, affirmations: methode ? 4 : 6 };
      const nb = (page) => [page.querySelectorAll('.solide-cellule').length, page.querySelectorAll('tr[data-solide]').length, page.querySelectorAll('svg.patron').length, page.querySelectorAll('.affirmation').length].join();
      if (nb(eleve) === Object.values(attendu).join() && nb(corr) === nb(eleve)) comptes++;
      // ex. 1 : le nom écrit dans le corrigé est celui du solide dessiné
      for (const cell of corr.querySelectorAll('.solide-cellule')) {
        nomsTot++;
        if (texte(cell.querySelector('.reponse')) === NOMS[cell.querySelector('svg').getAttribute('data-solide')]) nomsOk++;
      }
      // ex. 2 : tableau de la leçon
      const lignes = [...corr.querySelectorAll('tr[data-solide]')];
      const ids = lignes.map((l) => l.getAttribute('data-solide'));
      for (const l of lignes) { tabTot++; if ([...l.querySelectorAll('.reponse')].map((x) => +texte(x)).join() === LECON[l.getAttribute('data-solide')].join()) tabOk++; }
      if (ids.join() !== (methode ? 'cube,pave,pyramide' : 'cube,pave,pave-carre,pyramide')) mauvaisNb++;
      // ex. 3 : entourés = marqués estPatron = patrons du cube
      const entoures = [...corr.querySelectorAll('.patron-cellule--entoure svg.patron')];
      const tous = [...corr.querySelectorAll('svg.patron')];
      patTot++;
      if (tous.every((s) => (s.getAttribute('data-patron') === 'oui') === estUnPatron(lireCases(s)))
        && entoures.length === tous.filter((s) => estUnPatron(lireCases(s))).length
        && entoures.every((s) => estUnPatron(lireCases(s)))) patOk++;
      if (entoures.length < 2 || entoures.length > 4) nbPatrons++;
      // ex. 4 : vrai ou faux recalculé
      [...corr.querySelectorAll('.affirmation')].forEach((li, k) => {
        const a = c.affirmations[k];
        const vrai = VRAI[a.solide][a.prop] === a.n;
        const coche = li.querySelector('.case-vf--cochee');
        vfTot++;
        if (a.vrai === vrai && coche && coche.getAttribute('data-choix') === (vrai ? 'V' : 'F') && li.querySelectorAll('.case-vf--cochee').length === 1
          && li.querySelector('.affirmation__justif') && (a.n === 0 || a.prop === 'pointe' || texte(li.querySelector('.affirmation__texte')).includes(` ${a.n} `))) vfOk++;
      });
      // rien d'écrit sur la page de l'enfant, ton positif, pas d'emoji
      const nu = eleve.querySelector('.rouge, .reponse, .case-vf--cochee, .patron-cellule--entoure, .affirmation__justif') === null
        && [...eleve.querySelectorAll('tr[data-solide] td')].every((td) => texte(td) === '')
        && [...eleve.querySelectorAll('.solide-nom')].every((x) => texte(x) === '')
        && !/aria-label="Un (cube|pavé|pyramide|boule|cylindre|cône)/.test([...eleve.querySelectorAll('.bloc:not(.bloc--methode) .solides-nommer')].map((x) => x.innerHTML).join());
      if (nu) vierge++;
      if (!/faux|erreur|✗|✘|✕|✖|raté/i.test(texte(d)) && !/\p{Extended_Pictographic}/u.test(texte(d))) ton++;
    }
  }
  verifier(mauvaisNb === 0, 'solides : six solides distincts, 8 en tout, lignes du tableau attendues');
  verifier(nomsOk === nomsTot, `solides : le nom du corrigé est celui du solide dessiné (${nomsOk}/${nomsTot})`);
  verifier(tabOk === tabTot, `solides : tableau du corrigé = valeurs de la leçon (${tabOk}/${tabTot})`);
  verifier(patOk === patTot && nbPatrons === 0, 'solides : patrons entourés = assemblages valides, 2 à 4 par fiche');
  verifier(vfOk === vfTot, `solides : vrai ou faux recalculé, bonne case cochée, phrase de justification (${vfOk}/${vfTot})`);
  verifier(comptes === 80, 'solides : mêmes comptes élève / corrigé, avec et sans méthode');
  verifier(vierge === 80, 'solides : aucune réponse sur la page élève');
  verifier(ton === 80, 'solides : pas de mot négatif ni d’emoji sur la feuille');

  const c0 = tirer(fs, {});
  const sans = doc(c0, { corrige: false, methode: false }), avec = doc(c0, { corrige: false, methode: true });
  verifier(avec.textContent.includes('Je me souviens de la méthode') && !sans.textContent.includes('Je me souviens de la méthode'), 'solides : le rappel se masque');
  const rappel = texte(avec.querySelector('.rappel-so'));
  verifier(['6 faces carrées, 12 arêtes et 8 sommets', '5 faces : 1 carré et 4 triangles, 8 arêtes et 5 sommets', '2 carrés et 4 rectangles', 'faces', 'arêtes', 'sommets'].every((m) => rappel.includes(m))
    && Object.values(NOMS).every((n) => rappel.includes(n)), 'solides : le rappel reprend les phrases et les nombres de la leçon');
  verifier(avec.querySelectorAll('.rappel-so svg').length === 7, 'solides : le rappel dessine les six solides et le cube repéré');

  for (let i = 0; i < 20; i++) {
    const c = tirer(fs, {});
    const r = decoder(c.code);
    if (!(r && r.fiche === fs && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c))) { verifier(false, `solides : le code ${c.code} ne redonne pas la même fiche`); break; }
  }
  verifier(true, 'solides : le code redonne la même fiche');
  verifier(rendre(fs, tirer(fs, {}, 77), { corrige: true }) === rendre(fs, tirer(fs, {}, 77), { corrige: true }), 'solides : même graine, même HTML');
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fs, {}).code);
  verifier(vus.size > 190, `solides : codes variés (${vus.size} sur 200)`);

  // Les treize fiches précédentes inchangées : empreinte du HTML à graine fixe, mesurée avant l’ajout
  const empreinte = (f, o) => { const t = tirer(f, o, 424242); return JSON.stringify(t) + rendre(f, t, { corrige: true, base: 'http://x/' }); };
  const somme = (x) => { let h = 5381; for (const ch of x) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }], ['ce2-durees', { secondes: 'non' }], ['ce2-durees', { secondes: 'oui' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2857615915,841554819,1341628403,3247079376,2467628440,3671073380,178792032,2718432813,1534335352,750168435,1150851747,649082766,1335819493,11888257,1584605419,857785706,538954699,1652536371,2192490432,1573601925,237366352,3253221856', `solides : les treize fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 13).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures,ce2-masses-contenances,ce2-durees', 'solides : ordre des treize premières fiches inchangé');
}

process.exit(echecs ? 1 : 0);
