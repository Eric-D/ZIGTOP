// Une fiche imprimée ne se corrige pas après coup : le corrigé doit être juste,
// les retenues bien placées, et la fiche ne doit pas changer toute seule.
import { JSDOM } from 'jsdom';
import { FICHES, tirer, rendre, decoder, codeDe, optionsParDefaut } from '../js/fiches.js';
import { matrice } from '../js/qr.js';

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

process.exit(echecs ? 1 : 0);
