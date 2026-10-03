// Une fiche imprimée ne se corrige pas après coup : le corrigé doit être juste,
// les retenues bien placées, et la fiche ne doit pas changer toute seule.
import { JSDOM } from 'jsdom';
import { FICHES, tirer, rendre, decoder, codeDe, optionsParDefaut } from '../js/fiches.js';
import { matrice } from '../js/qr.js';
import { fmt } from '../js/utils.js';

let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };
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

process.exit(echecs ? 1 : 0);
