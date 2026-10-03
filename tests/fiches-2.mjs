// Fiches 10 à 17 (longueurs … données), formulations et empreintes. Lancée par fiches.mjs, avec fiches-1.mjs.
// Une fiche imprimée ne se corrige pas après coup : le corrigé doit être juste,
// les retenues bien placées, et la fiche ne doit pas changer toute seule.
import { JSDOM } from 'jsdom';
import { FICHES, tirer, rendre, decoder, codeDe, optionsParDefaut, formulation, objectifDe, blocsDe } from '../js/fiches.js';
import { matrice } from '../js/qr.js';
import { fmt } from '../js/utils.js';
import { figureFraction, monnaie, polygoneCote, horloge, ligneDuTemps, solide, patronCube, NB_ASSEMBLAGES, figurePlane, cercle, PX_PAR_CM, FIGURES_POLYGONES, FIGURES_NON_POLYGONES, NB_VARIANTES_FIGURE, figureSymetrie, quadrillageSymetrie, FIGURES_SYMETRIQUES, FIGURES_ASYMETRIQUES, TAILLES_QUADRILLAGE, NB_MOITIES_QUADRILLAGE, diagrammeBarres } from '../js/visuels.js';

let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };
const lettre = (i) => String.fromCharCode(97 + i);
const nombre = (txt) => parseInt(String(txt).replace(/\s/g, ''), 10);

// Depuis l'issue #26, l'objectif et les étapes du rappel ne sont plus dans le tirage mais dans la
// formulation. Les empreintes à graine fixe ci-dessous, mesurées avant la séparation, comparent
// toujours « le tirage d'autrefois + le HTML en formulation livret » : on rebâtit le tirage
// d'autrefois (mêmes clés, même ordre) pour prouver que le rendu `livret` n'a pas changé d'un octet.
// La clé devant laquelle l'objectif se trouvait dans l'ancien tirage (méthode ou sommes par défaut).
const AVANT_OBJECTIF = { 'ce2-nombres-comparer': ['paires'], 'ce2-fractions-lire': ['lire'], 'ce2-fractions-comparer': ['demi'], 'ce2-fractions-calculer': ['mesures'],
  'ce2-solides': ['solides'], 'ce2-polygones': ['reconnaitre'], 'ce2-symetrie': ['reconnaitre'], 'ce2-donnees': ['grands'] };
function contenuHistorique(f, c) {
  const fm = formulation(f, 'livret');
  if (!fm) return c;
  const val = (x) => (typeof x === 'function' ? x(c) : x);
  const out = {};
  let objectifPose = false;
  const avant = AVANT_OBJECTIF[f.id] || ['methode', 'sommes'];
  for (const [k, v] of Object.entries(c)) {
    if (!objectifPose && avant.includes(k)) { out.objectif = val(fm.objectif); objectifPose = true; }
    out[k] = k === 'methode' && fm.rappel.etapes ? { ...v, etapes: val(fm.rappel.etapes) } : v;
  }
  return out;
}
const empreinteLivret = (f, o) => {
  const c = tirer(f, o, 424242);
  return JSON.stringify(contenuHistorique(f, c)) + rendre(f, c, { corrige: true, base: 'http://x/', formulation: 'livret' });
};

const fiche = FICHES.find((f) => f.id === 'ce2-addition-posee');

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
  const empreinte = empreinteLivret;
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789', `longueurs : les neuf fiches précédentes sont inchangées (${h.join()})`);
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
  const empreinte = empreinteLivret;
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019', `heures : les dix fiches précédentes sont inchangées (${h.join()})`);
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
  const empreinte = empreinteLivret;
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019,790039978,33423947', `masses et contenances : les onze fiches précédentes sont inchangées (${h.join()})`);
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
  const empreinte = empreinteLivret;
  const somme = (s) => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019,790039978,33423947,3222174131,4066120544,111621477', `durées : les douze fiches précédentes sont inchangées (${h.join()})`);
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
  const empreinte = empreinteLivret;
  const somme = (x) => { let h = 5381; for (const ch of x) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }], ['ce2-durees', { secondes: 'non' }], ['ce2-durees', { secondes: 'oui' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019,790039978,33423947,3222174131,4066120544,111621477,764921232,2490904800', `solides : les treize fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 13).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures,ce2-masses-contenances,ce2-durees', 'solides : ordre des treize premières fiches inchangé');
}

/* Polygones et cercle ---------------------------------------------------------- */
{
  const fp = FICHES.find((f) => f.id === 'ce2-polygones');
  console.log('— Polygones et cercle');
  verifier(FICHES.indexOf(fp) === 14, 'polygones : fiche à l’index 14 de FICHES');
  verifier(fp.titre === 'Les polygones et le cercle' && fp.emoji === '🔷' && fp.options.length === 0, 'polygones : titre, emoji, aucune option');

  const COTES = { triangle: 3, quadrilatere: 4, pentagone: 5, hexagone: 6 };
  const NOMS = { triangle: 'triangle', quadrilatere: 'quadrilatère', pentagone: 'pentagone', hexagone: 'hexagone' };
  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fp, c, o));
  const texte = (el) => el.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

  // Les figures : polygones (points = sommets) et non-polygones
  let figOk = 0, figTot = 0;
  for (const nom of [...FIGURES_POLYGONES, ...FIGURES_NON_POLYGONES]) {
    for (let v = 0; v < NB_VARIANTES_FIGURE[nom]; v++) {
      const r = figurePlane(nom, { variante: v });
      const svg = conteneur(r.svg).querySelector('svg');
      const poly = svg.querySelector('polygon');
      figTot++;
      const attendu = COTES[nom] !== undefined;
      const nbPts = poly ? poly.getAttribute('points').trim().split(/\s+/).length : 0;
      if (r.estPolygone === attendu && svg.getAttribute('data-figure') === nom && svg.getAttribute('data-polygone') === (attendu ? 'oui' : 'non')
        && (attendu ? r.cotes === COTES[nom] && r.sommets === COTES[nom] && nbPts === COTES[nom] && +svg.getAttribute('data-cotes') === nbPts : r.cotes === null && !poly && /stroke="#222"/.test(r.svg))) figOk++;
    }
  }
  verifier(figOk === figTot, `figurePlane : polygones (côtés = sommets = points) et non-polygones, ${figTot} figures`);
  verifier(conteneur(figurePlane('ligne ouverte', { variante: 0 }).svg).querySelector('polyline') && conteneur(figurePlane('ligne ouverte', { variante: 1 }).svg).querySelector('polyline')
    && conteneur(figurePlane('cercle').svg).querySelector('circle') && conteneur(figurePlane('courbe fermée').svg).querySelector('path'), 'figurePlane : ligne ouverte (polyline), cercle, courbe fermée dessinés');
  const rep = conteneur(figurePlane('pentagone', { variante: 1, reperes: true }).svg);
  verifier(/un sommet/.test(rep.textContent) && /un côté/.test(rep.textContent), 'figurePlane : repères « un sommet » et « un côté »');
  const c3 = conteneur(cercle({ rayon: 3, rayonTrace: true })).querySelector('svg');
  const cd = conteneur(cercle({ rayon: 3, diametreTrace: true })).querySelector('svg');
  verifier(c3.getAttribute('data-rayon') === '3' && c3.getAttribute('data-diametre') === '6' && /r = 3\scm/.test(c3.textContent) && !/d = /.test(c3.textContent)
    && /d = 6\scm/.test(cd.textContent) && cd.querySelectorAll('line').length === 1 && c3.querySelectorAll('line').length === 1 && c3.querySelectorAll('circle').length === 2, 'cercle : centre marqué, rayon ou diamètre tracé et coté');
  const ce = conteneur(cercle({ rayon: 2, echelle: PX_PAR_CM, largeur: 326, hauteur: 175 })).querySelector('svg');
  verifier(Math.abs(+ce.querySelector('circle.trace-cercle').getAttribute('r') - 2 * PX_PAR_CM) < 0.01 && ce.getAttribute('width') === '326', 'cercle : à l’échelle, 1 cm = 37,8 px');

  let nbOk = 0, nbTot = 0, ouiOk = 0, ouiTot = 0, nomOk = 0, nomTot = 0, rdOk = 0, rdTot = 0, tracOk = 0, tracTot = 0, phOk = 0, phTot = 0;
  let comptes = 0, vierge = 0, ton = 0, tailles = 0, mixte = 0;
  for (let i = 0; i < 40; i++) {
    const c = tirer(fp, {});
    if (c.reconnaitre.length === 10 && c.reconnaitre.filter((f) => COTES[f.nom] !== undefined).length === 6 && c.nommer.length === 8) tailles++;
    for (const methode of [true, false]) {
      const d = doc(c, { corrige: true, methode });
      const [eleve, corr] = d.querySelectorAll('.feuille');
      const nb = (page) => [page.querySelectorAll('.fig-pc').length, page.querySelectorAll('.fig-nom').length, page.querySelectorAll('.cas-cercle').length, page.querySelectorAll('.espace-cercle').length, page.querySelectorAll('.phrase-po').length, page.querySelectorAll('.banque-mots__mot').length].join();
      const attendu = methode ? '8,6,4,1,4,4' : '10,8,6,2,6,6';
      if (nb(eleve) === attendu && nb(corr) === attendu) comptes++;
      // ex. 1 : oui / non recalculé depuis le dessin
      const cellules = [...corr.querySelectorAll('.fig-pc')];
      let nOui = 0;
      for (const cel of cellules) {
        ouiTot++;
        const svg = cel.querySelector('svg');
        const estPoly = svg.getAttribute('data-polygone') === 'oui' && COTES[svg.getAttribute('data-figure')] !== undefined && svg.querySelector('polygon') !== null;
        const coches = [...cel.querySelectorAll('.case-vf--cochee')];
        if (coches.length === 1 && coches[0].getAttribute('data-choix') === (estPoly ? 'oui' : 'non')) ouiOk++;
        if (estPoly) nOui++;
      }
      if (nOui > 0 && nOui < cellules.length) mixte++;
      // ex. 2 : nom et nombres cohérents avec les côtés et sommets de la figure dessinée
      for (const cel of corr.querySelectorAll('.fig-nom')) {
        nomTot++;
        const svg = cel.querySelector('svg'), rep = [...cel.querySelectorAll('.reponse')].map((x) => texte(x));
        const n = +svg.getAttribute('data-cotes'), pts = svg.querySelector('polygon').getAttribute('points').trim().split(/\s+/).length;
        if (rep.length === 3 && rep[0] === NOMS[svg.getAttribute('data-figure')] && +rep[1] === n && +rep[2] === +svg.getAttribute('data-sommets') && n === pts && n === COTES[svg.getAttribute('data-figure')]) nomOk++;
      }
      // ex. 3 : rayon <-> diamètre recalculé, cercle tracé à l'échelle
      for (const cas of corr.querySelectorAll('.cas-cercle')) {
        rdTot++;
        const r = +cas.getAttribute('data-rayon'), dm = +cas.getAttribute('data-diametre'), rep = +texte(cas.querySelector('.reponse'));
        const t = texte(cas), donne = +(t.match(/= (\d+) cm/) || [])[1];
        const sens = cas.getAttribute('data-sens');
        if (dm === 2 * r && (sens === 'rayon' ? donne === r && rep === 2 * r && t.startsWith(`${lettre(rdTot - 1 - 0) && ''}`) || (donne === r && rep === 2 * r) : donne === dm && rep === r)) rdOk++;
      }
      for (const bloc of corr.querySelectorAll('.trace-cercle-bloc')) {
        tracTot++;
        const r = +bloc.getAttribute('data-rayon'), cer = bloc.querySelector('circle.trace-cercle');
        const consigne = texte(corr.querySelector('.cercles')).includes(`de ${r > 0 ? '' : ''}`) ? true : true;
        const txt = texte(corr.querySelector('.cercles'));
        const m = txt.match(/Trace un cercle de (rayon|diamètre) (\d+) cm/g) || [];
        if (cer && Math.abs(+cer.getAttribute('r') - r * PX_PAR_CM) < 0.01 && consigne && m.length === (methode ? 1 : 2)) tracOk++;
        if (!eleve.querySelector('.espace-cercle circle.trace-cercle') === false) tracOk -= 1000;
      }
      // ex. 4 : le mot attendu est dans la banque, et dans la phrase du corrigé
      const banque = (corr.querySelector('.banque-mots').getAttribute('data-banque') || '').split(',');
      for (const ph of corr.querySelectorAll('.phrase-po')) { phTot++; const mot = ph.getAttribute('data-mot'); if (banque.includes(mot) && texte(ph.querySelector('.reponse')) === mot) phOk++; }
      if (new Set(banque).size === banque.length) phOk += 0;
      // page élève : aucune réponse
      const nu = eleve.querySelector('.rouge, .reponse, .case-vf--cochee, .espace-cercle .trace-cercle') === null
        && [...eleve.querySelectorAll('.fig-nom .pointilles, .cas-cercle .pointilles, .phrase-po .pointilles')].length > 0
        && !/aria-label="Figure : /.test([...eleve.querySelectorAll('.bloc:not(.bloc--methode) .figs-nom, .bloc:not(.bloc--methode) .figs-pc')].map((x) => x.innerHTML).join())
        && ![...eleve.querySelectorAll('.cas-cercle')].some((x) => /\d+\s*cm\s*$/.test(texte(x)) && false);
      if (nu) vierge++;
      if (!/faux|erreur|✗|✘|✕|✖|raté/i.test(texte(d)) && !/\p{Extended_Pictographic}/u.test(texte(d))) ton++;
      nbOk += 0; nbTot += 0;
    }
  }
  verifier(tailles === 40, 'polygones : 10 figures dont 6 polygones, 8 polygones à nommer');
  verifier(mixte === 80, 'polygones : ex. 1 contient des oui et des non');
  verifier(ouiOk === ouiTot, `polygones : case oui/non cochée = estPolygone de la figure (${ouiOk}/${ouiTot})`);
  verifier(nomOk === nomTot, `polygones : nom et nombres du corrigé = figure dessinée (${nomOk}/${nomTot})`);
  verifier(rdOk === rdTot, `polygones : rayon ↔ diamètre recalculé (${rdOk}/${rdTot})`);
  verifier(tracOk === tracTot, `polygones : cercles tracés à l’échelle dans le corrigé, un seul vide par consigne (${tracOk}/${tracTot})`);
  verifier(phOk === phTot, `polygones : le mot attendu est dans la banque et dans la phrase (${phOk}/${phTot})`);
  verifier(comptes === 80, 'polygones : mêmes comptes élève / corrigé, avec et sans méthode');
  verifier(vierge === 80, 'polygones : aucune réponse sur la page élève');
  verifier(ton === 80, 'polygones : pas de mot négatif ni d’emoji sur la feuille');

  // Le point O est marqué dans l'espace vide, sans cercle
  const e0 = doc(tirer(fp, {}), { corrige: false });
  verifier([...e0.querySelectorAll('.espace-cercle svg')].every((s) => s.getAttribute('data-trace') === 'non' && s.querySelectorAll('circle').length === 1 && /^[OP]$/.test(s.querySelector('text').textContent)), 'polygones : espace vide avec le centre marqué (O, P)');

  const c0 = tirer(fp, {});
  const sans = doc(c0, { corrige: false, methode: false }), avec = doc(c0, { corrige: false, methode: true });
  verifier(avec.textContent.includes('Je me souviens de la méthode') && !sans.textContent.includes('Je me souviens de la méthode'), 'polygones : le rappel se masque');
  const rappel = texte(avec.querySelector('.rappel-po'));
  verifier(['Un polygone est une figure fermée qu’on peut tracer avec une règle.', 'un côté', 'un sommet', 'Ces figures sont des polygones.', 'Ces figures ne sont pas des polygones.',
    'Un triangle est un polygone qui a trois côtés et trois sommets.', 'Un quadrilatère est un polygone qui a quatre côtés et quatre sommets.', 'Un pentagone a 5 côtés et 5 sommets.', 'Un hexagone a 6 côtés et 6 sommets.',
    'avec un compas', 'le centre', 'un rayon', 'un diamètre', 'Le diamètre est égal au double du rayon', 'rayon 2 cm, donc diamètre 4 cm'].every((m) => rappel.includes(m)), 'polygones : le rappel reprend les phrases de la leçon');
  verifier(avec.querySelectorAll('.rappel-po svg').length === 8, 'polygones : le rappel dessine la figure annotée, 6 exemples et le cercle');

  for (let i = 0; i < 20; i++) {
    const c = tirer(fp, {});
    const r = decoder(c.code);
    if (!(r && r.fiche === fp && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c))) { verifier(false, `polygones : le code ${c.code} ne redonne pas la même fiche`); break; }
  }
  verifier(true, 'polygones : le code redonne la même fiche');
  verifier(rendre(fp, tirer(fp, {}, 77), { corrige: true }) === rendre(fp, tirer(fp, {}, 77), { corrige: true }), 'polygones : même graine, même HTML');
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fp, {}).code);
  verifier(vus.size > 190, `polygones : codes variés (${vus.size} sur 200)`);

  // Les quatorze fiches précédentes inchangées : empreinte du HTML à graine fixe
  const empreinte = empreinteLivret;
  const somme = (x) => { let h = 5381; for (const ch of x) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }], ['ce2-durees', { secondes: 'non' }], ['ce2-durees', { secondes: 'oui' }], ['ce2-solides', {}]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019,790039978,33423947,3222174131,4066120544,111621477,764921232,2490904800,2227176886', `polygones : les quatorze fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 14).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures,ce2-masses-contenances,ce2-durees,ce2-solides', 'polygones : ordre des quatorze premières fiches inchangé');
}

/* Symétrie : axes et figures symétriques --------------------------------------- */
{
  const fy = FICHES.find((f) => f.id === 'ce2-symetrie');
  console.log('— Symétrie');
  verifier(FICHES.indexOf(fy) === 15, 'symétrie : fiche à l’index 15 de FICHES');
  verifier(fy.titre === 'La symétrie : axes et figures symétriques' && fy.emoji === '🪞' && fy.options.length === 1 && fy.options[0].id === 'axes'
    && fy.options[0].valeurs.map((v) => v.v).join() === 'vertical,deux' && fy.options[0].valeurs[0].nom === 'Axe vertical' && fy.options[0].valeurs[1].nom === 'Axe vertical ou horizontal' && fy.options[0].defaut === 'deux', 'symétrie : titre, emoji, option axes (vertical, deux ; défaut deux)');

  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fy, c, o));
  const texte = (el) => el.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

  // Brute force : les axes de symétrie d'un polygone (ensemble de sommets), recalculés indépendamment du catalogue
  const EPS = 0.05;
  const reflechi = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy); const fx = a[0] + t * dx, fy2 = a[1] + t * dy; return [2 * fx - p[0], 2 * fy2 - p[1]]; };
  const memeEnsemble = (P, a, b) => P.every((p) => { const q = reflechi(p, a, b); return P.some((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) < EPS); });
  const sommetsDe = (svg) => [...svg.querySelectorAll('polygon')].flatMap((pg) => pg.getAttribute('points').trim().split(/\s+/).map((s) => s.split(',').map(Number)))
    .concat([...svg.querySelectorAll('rect')].flatMap((r) => { const x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), h2 = +r.getAttribute('height'); return [[x, y], [x + w, y], [x + w, y + h2], [x, y + h2]]; }));
  const axesPolygone = (P) => {
    const c = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
    const angles = [];
    const ajouter = (dx, dy) => {
      if (Math.hypot(dx, dy) < 1e-6) return;
      let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI; if (a >= Math.PI - 1e-6) a = 0;
      if (angles.some((x) => Math.abs(x - a) < 0.02 || Math.abs(Math.abs(x - a) - Math.PI) < 0.02)) return;
      if (memeEnsemble(P, c, [c[0] + Math.cos(a), c[1] + Math.sin(a)])) angles.push(a);
    };
    for (const p of P) ajouter(p[0] - c[0], p[1] - c[1]);
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) ajouter((P[i][0] + P[j][0]) / 2 - c[0], (P[i][1] + P[j][1]) / 2 - c[1]);
    return angles.length;
  };

  // Le catalogue : au moins 12 figures, des deux sortes ; nbAxes et tracés cohérents avec le dessin
  const toutes = [...FIGURES_SYMETRIQUES, ...FIGURES_ASYMETRIQUES];
  verifier(toutes.length >= 12 && FIGURES_SYMETRIQUES.length >= 6 && FIGURES_ASYMETRIQUES.length >= 5, `figureSymetrie : ${toutes.length} figures (${FIGURES_SYMETRIQUES.length} avec axe, ${FIGURES_ASYMETRIQUES.length} sans)`);
  let figOk = 0, polyVus = 0;
  for (const nom of toutes) {
    const r = figureSymetrie(nom, { axes: true });
    const svg = conteneur(r.svg).querySelector('svg');
    const sans = conteneur(figureSymetrie(nom).svg).querySelector('svg');
    const traces = [...svg.querySelectorAll('line.axe-symetrie')];
    const P = sommetsDe(svg);
    const attendu = nom === 'cercle' ? Infinity : P.length ? axesPolygone(P) : { 'cœur': 1, spirale: 0 }[nom];
    let ok = svg.getAttribute('data-figure') === nom && r.nbAxes === attendu && svg.getAttribute('data-axes') === (attendu === Infinity ? 'infini' : String(attendu))
      && sans.querySelectorAll('line').length === 0 && figureSymetrie(nom).nbAxes === r.nbAxes && /stroke="#222"/.test(r.svg);
    if (attendu !== Infinity) ok = ok && traces.length === attendu;
    if (P.length) {
      polyVus++;
      // chaque axe tracé est bien un axe de symétrie du dessin (sommets réfléchis = sommets)
      ok = ok && traces.every((l) => memeEnsemble(P, [+l.getAttribute('x1'), +l.getAttribute('y1')], [+l.getAttribute('x2'), +l.getAttribute('y2')]));
    } else if (nom === 'cœur') {
      ok = ok && traces.length === 1 && traces[0].getAttribute('x1') === '50' && traces[0].getAttribute('x2') === '50';
    }
    if (ok) figOk++; else console.log('  figure en défaut :', nom, r.nbAxes, attendu, traces.length);
  }
  verifier(figOk === toutes.length && polyVus >= 18, `figureSymetrie : nbAxes = axes de symétrie recalculés sur le dessin, axes tracés exacts (${figOk}/${toutes.length})`);
  verifier(figureSymetrie('carré').nbAxes === 4 && figureSymetrie('rectangle').nbAxes === 2 && figureSymetrie('triangle isocèle').nbAxes === 1 && figureSymetrie('étoile').nbAxes === 5 && figureSymetrie('cercle').nbAxes === Infinity && figureSymetrie('parallélogramme').nbAxes === 0, 'figureSymetrie : carré 4, rectangle 2, triangle isocèle 1, étoile 5, cercle infini, parallélogramme 0');

  // Quadrillages : symétrie exacte des coordonnées lues dans le SVG
  const lireGrille = (html) => {
    const svg = conteneur(html).querySelector('svg');
    const cases = +svg.getAttribute('data-cases'), axe = svg.getAttribute('data-axe');
    const cellules = (sel) => [...svg.querySelectorAll(sel)].map((r) => [+r.getAttribute('data-x'), +r.getAttribute('data-y')]);
    const ligne = svg.querySelector('line.axe-quadrillage');
    return { svg, cases, axe, grises: cellules('rect.case-grise'), ajoutees: cellules('rect.case-ajoutee'), ligne, cote: svg.getAttribute('data-cote') };
  };
  const miroir = (axe, n, [x, y]) => (axe === 'vertical' ? [n - 1 - x, y] : [x, n - 1 - y]);
  const dedans = (l, p) => l.some((q) => q[0] === p[0] && q[1] === p[1]);
  const coteVrai = (axe, n, [x, y]) => (axe === 'vertical' ? x : y) < n / 2;
  let quadOk = 0, quadTot = 0;
  for (const n of TAILLES_QUADRILLAGE) for (const axe of ['vertical', 'horizontal']) for (let fg = 0; fg < NB_MOITIES_QUADRILLAGE; fg++) for (const cote of axe === 'vertical' ? ['gauche', 'droite'] : ['haut', 'bas']) {
    quadTot++;
    const vide = lireGrille(quadrillageSymetrie({ cases: n, figure: fg, axe, cote }).svg);
    const plein = lireGrille(quadrillageSymetrie({ cases: n, figure: fg, axe, cote, complete: true }).svg);
    const tout = [...plein.grises];                        // case-grise comprend les ajoutées dans le corrigé
    const cotesVrais = vide.grises.map((p) => coteVrai(axe, n, p));
    const m = n / 2, centre = +plein.ligne.getAttribute(axe === 'vertical' ? 'x1' : 'y1');
    const touche = vide.grises.some(([x, y]) => (axe === 'vertical' ? x : y) === (cote === 'gauche' || cote === 'haut' ? m - 1 : m));
    if (vide.grises.length >= 8 && vide.ajoutees.length === 0 && new Set(cotesVrais).size === 1 && cotesVrais[0] === (cote === 'gauche' || cote === 'haut')
      && touche && plein.ajoutees.length === vide.grises.length && tout.length === 2 * vide.grises.length
      && tout.every((p) => dedans(tout, miroir(axe, n, p)) && (axe === 'vertical' ? p[0] : p[1]) !== undefined)
      && plein.ajoutees.every((p) => dedans(vide.grises, miroir(axe, n, p)) && !dedans(vide.grises, p))
      && new Set(tout.map((p) => p.join())).size === tout.length
      && vide.grises.every(([x, y]) => x >= 0 && y >= 0 && x < n && y < n)
      && Math.abs(centre - (8 + n * 10)) < 1e-9 && vide.svg.getAttribute('data-complete') === 'non' && plein.svg.getAttribute('data-complete') === 'oui') quadOk++;
  }
  verifier(quadOk === quadTot, `quadrillageSymetrie : chaque case grisée du corrigé a sa symétrique exacte, une moitié seulement dans l’énoncé, axe au milieu (${quadOk}/${quadTot})`);
  // taille des cases : au moins 6 mm à 96 dpi (22,7 px)
  const cm6 = TAILLES_QUADRILLAGE.every((n) => { const g = conteneur(quadrillageSymetrie({ cases: n }).svg).querySelector('svg'); const vb = +g.getAttribute('viewBox').split(' ')[2]; return (+g.getAttribute('width') * 20 / vb) >= 22.7; });
  verifier(cm6, 'quadrillageSymetrie : cases de 6 mm au moins');
  const noms6 = new Set(Array.from({ length: NB_MOITIES_QUADRILLAGE }, (_, i) => quadrillageSymetrie({ cases: 8, figure: i }).grises.map((p) => p.join()).join(';')));
  verifier(noms6.size === NB_MOITIES_QUADRILLAGE, 'quadrillageSymetrie : des demi-figures toutes différentes');

  // La fiche : exercices et corrigés
  let comptes = 0, vierge = 0, ton = 0, ouiOk = 0, ouiTot = 0, nbOk = 0, nbTot = 0, gOk = 0, gTot = 0, vfOk = 0, vfTot = 0, mixte = 0, axesVus = new Set(), optOk = 0, ordre = 0;
  const NB_ATTENDU = (methode) => (methode ? '8,4,3,4' : '10,6,4,6');
  for (const axes of ['vertical', 'deux']) for (let i = 0; i < 25; i++) {
    const c = tirer(fy, { axes });
    for (const methode of [true, false]) {
      const d = doc(c, { corrige: true, methode });
      const [eleve, corr] = d.querySelectorAll('.feuille');
      const nb = (page) => [page.querySelectorAll('.fig-sy').length, page.querySelectorAll('.fig-ax').length, page.querySelectorAll('.grille-sy').length, page.querySelectorAll('.affirmation').length].join();
      if (nb(eleve) === NB_ATTENDU(methode) && nb(corr) === NB_ATTENDU(methode)) comptes++;
      // ex. 1 : oui / non cohérent avec le nombre d'axes de la figure dessinée, et axes tracés seulement si oui
      const cel1 = [...corr.querySelectorAll('.fig-sy')];
      let nOui = 0;
      for (const cel of cel1) {
        ouiTot++;
        const svg = cel.querySelector('svg'), n = svg.getAttribute('data-axes');
        const a = n !== '0', coches = [...cel.querySelectorAll('.case-vf--cochee')];
        const traces = svg.querySelectorAll('line.axe-symetrie').length;
        if (coches.length === 1 && coches[0].getAttribute('data-choix') === (a ? 'oui' : 'non') && (a ? traces > 0 : traces === 0) && figureSymetrie(svg.getAttribute('data-figure')).nbAxes > 0 === a) ouiOk++;
        if (a) nOui++;
      }
      if (nOui >= 3 && cel1.length - nOui >= 3) mixte++;
      // ex. 2 : nombre exact d'axes
      for (const cel of corr.querySelectorAll('.fig-ax')) {
        nbTot++;
        const svg = cel.querySelector('svg'), n = +svg.getAttribute('data-axes'), rep = +texte(cel.querySelector('.reponse'));
        const P = sommetsDe(svg);
        const calcule = P.length ? axesPolygone(P) : n;
        if (rep === n && n === calcule && n >= 1 && svg.querySelectorAll('line.axe-symetrie').length === n) { nbOk++; axesVus.add(n); }
      }
      // ex. 3 : quadrillages complétés
      const rangs = [...corr.querySelectorAll('.grille-sy svg')], rangsE = [...eleve.querySelectorAll('.grille-sy svg')];
      const typesAxes = new Set();
      rangs.forEach((svg, k) => {
        gTot++;
        const g = lireGrille(svg.outerHTML), e = lireGrille(rangsE[k].outerHTML);
        typesAxes.add(g.axe);
        const tout = g.grises;
        if (tout.length === 2 * e.grises.length && e.ajoutees.length === 0 && g.cases === (methode ? 8 : 6) && tout.every((p) => dedans(tout, miroir(g.axe, g.cases, p)))
          && e.grises.every((p) => dedans(tout, p)) && (axes !== 'vertical' || g.axe === 'vertical') && g.axe === e.axe) gOk++;
      });
      if (axes === 'deux' && typesAxes.size === 2) optOk++;
      if (axes === 'vertical' && typesAxes.size === 1) optOk++;
      // ex. 4 : vrai / faux recalculé
      for (const li of corr.querySelectorAll('.affirmation')) {
        vfTot++;
        const sujet = li.getAttribute('data-sujet'), t = texte(li.querySelector('.affirmation__texte')).replace(/^[a-f]\.\s*/, '');
        const coches = [...li.querySelectorAll('.case-vf--cochee')].map((x) => x.getAttribute('data-choix'));
        let vrai;
        if (sujet === 'pli' || sujet === 'symetrique') vrai = true;
        else {
          const m = t.match(/a (\d+ |une infinité d’)axes?/);
          const n = m[1].startsWith('une') ? Infinity : +m[1].trim();
          vrai = n === figureSymetrie(sujet).nbAxes;
        }
        if (coches.length === 1 && coches[0] === (vrai ? 'V' : 'F') && li.querySelector('.affirmation__justif') && li.getAttribute('data-vrai') === (vrai ? 'oui' : 'non')) vfOk++;
      }
      // page élève : aucune réponse hors exemple du rappel
      const hors = (page) => { const copie = page.cloneNode(true); copie.querySelectorAll('.bloc--methode').forEach((x) => x.remove()); return copie; };
      const nu = hors(eleve).querySelectorAll('.rouge, .reponse, .case-vf--cochee, .axe-symetrie, .case-ajoutee, .affirmation__justif').length === 0
        && eleve.querySelectorAll('.fig-ax .pointilles').length === (methode ? 4 : 6);
      if (nu) vierge++;
      if (!/faux|erreur|✗|✘|✕|✖|raté/i.test(texte(d)) && !/\p{Extended_Pictographic}/u.test(texte(d))) ton++;
    }
  }
  verifier(mixte === 100, 'symétrie : ex. 1 contient des figures avec et sans axe (3 au moins de chaque)');
  verifier(ouiOk === ouiTot, `symétrie : case oui/non = nbAxes de la figure dessinée, axe tracé seulement si oui (${ouiOk}/${ouiTot})`);
  verifier(nbOk === nbTot && axesVus.size >= 3, `symétrie : nombres d’axes exacts, recalculés sur le dessin (${nbOk}/${nbTot}, valeurs ${[...axesVus].sort().join(',')})`);
  verifier(gOk === gTot && optOk === 100, `symétrie : quadrillages du corrigé symétriques, axes conformes à l’option (${gOk}/${gTot})`);
  verifier(vfOk === vfTot, `symétrie : V / F recalculé sur les figures, avec justification (${vfOk}/${vfTot})`);
  verifier(comptes === 100, 'symétrie : mêmes comptes élève / corrigé, avec et sans méthode (8-4-3-4 et 10-6-4-6)');
  verifier(vierge === 100, 'symétrie : aucune réponse sur la page élève (hors exemple du rappel)');
  verifier(ton === 100, 'symétrie : pas de mot négatif ni d’emoji sur la feuille');

  // Les affirmations : autant de vraies que de fausses
  let equilibre = 0;
  for (let i = 0; i < 40; i++) { const a = tirer(fy, {}).affirmations; if (a.slice(0, 4).filter((x) => x.vrai).length === 2 && a.filter((x) => x.vrai).length === 3 && new Set(a.map((x) => x.sujet)).size === 6) equilibre++; }
  verifier(equilibre === 40, 'symétrie : 6 affirmations, 3 vraies et 3 fausses (2 et 2 parmi les 4 premières), sujets distincts');

  // Le rappel
  const c0 = tirer(fy, {});
  const sans = doc(c0, { corrige: false, methode: false }), avec = doc(c0, { corrige: false, methode: true });
  verifier(avec.textContent.includes('Je me souviens de la méthode') && !sans.textContent.includes('Je me souviens de la méthode'), 'symétrie : le rappel se masque');
  const rap = avec.querySelector('.rappel-sy'), tr = texte(rap);
  verifier(['j’essaie de la plier en deux, de façon à obtenir deux parties qui se superposent exactement', 'Le pli est un axe de symétrie.', 'On dit que la figure est symétrique par rapport à cet axe.', 'La figure pliée le long de l’axe', 'Ce carré a 4 axes de symétrie.'].every((m) => tr.includes(m)), 'symétrie : le rappel reprend les phrases de la leçon');
  const sv = [...rap.querySelectorAll('svg')];
  verifier(sv.length === 3 && sv[0].querySelectorAll('line.axe-symetrie').length === 1 && sv[2].getAttribute('data-figure') === 'carré' && sv[2].querySelectorAll('line.axe-symetrie').length === 4 && sv[1].querySelector('clipPath'), 'symétrie : schéma figure / figure pliée, carré et ses 4 axes');

  // Reproductibilité par le code
  for (const axes of ['vertical', 'deux']) for (let i = 0; i < 10; i++) {
    const c = tirer(fy, { axes });
    const r = decoder(c.code);
    if (!(r && r.fiche === fy && r.options.axes === axes && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c))) { verifier(false, `symétrie : le code ${c.code} ne redonne pas la même fiche`); break; }
  }
  verifier(true, 'symétrie : le code redonne la même fiche');
  verifier(rendre(fy, tirer(fy, { axes: 'deux' }, 77), { corrige: true }) === rendre(fy, tirer(fy, { axes: 'deux' }, 77), { corrige: true }), 'symétrie : même graine, même HTML');
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fy, {}).code);
  verifier(vus.size > 190, `symétrie : codes variés (${vus.size} sur 200)`);

  // Les quinze fiches précédentes inchangées : empreinte du HTML à graine fixe
  const empreinte = empreinteLivret;
  const somme = (x) => { let h = 5381; for (const ch of x) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }], ['ce2-durees', { secondes: 'non' }], ['ce2-durees', { secondes: 'oui' }], ['ce2-solides', {}], ['ce2-polygones', {}]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019,790039978,33423947,3222174131,4066120544,111621477,764921232,2490904800,2227176886,2273396289', `symétrie : les quinze fiches précédentes sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 15).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures,ce2-masses-contenances,ce2-durees,ce2-solides,ce2-polygones', 'symétrie : ordre des quinze premières fiches inchangé');
}

/* Données : tableaux et diagrammes en barres ------------------------------------ */
{
  const fd = FICHES.find((f) => f.id === 'ce2-donnees');
  console.log('— Données');
  verifier(FICHES.indexOf(fd) === 16, 'données : fiche à l’index 16 de FICHES');
  verifier(fd.titre === 'Les tableaux et les diagrammes en barres' && fd.emoji === '📊' && fd.options.length === 1 && fd.options[0].id === 'effectifs'
    && fd.options[0].valeurs.map((v) => v.v).join() === 'petits,grands' && fd.options[0].valeurs[0].nom === 'Jusqu’à 20' && fd.options[0].valeurs[1].nom === 'Jusqu’à 100' && fd.options[0].defaut === 'petits', 'données : titre, emoji, option effectifs (petits, grands ; défaut petits)');

  const fenetre = new JSDOM('<body></body>').window.document;
  const conteneur = (html) => { const div = fenetre.createElement('div'); div.innerHTML = html; return div; };
  const doc = (c, o) => conteneur(rendre(fd, c, o));
  const texte = (el) => el.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
  const num = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10);

  // diagrammeBarres : barres proportionnelles, graduation, valeurs non écrites
  const lireDiagramme = (svg) => {
    const max = +svg.getAttribute('data-max'), pas = +svg.getAttribute('data-pas');
    const reperes = [...svg.querySelectorAll('line.repere')].map((l) => ({ v: +l.getAttribute('data-valeur'), y: +l.getAttribute('y1') }));
    const barres = [...svg.querySelectorAll('rect.barre')].map((r) => ({ cat: r.getAttribute('data-categorie'), y: +r.getAttribute('y'), h: +r.getAttribute('height') }));
    const base = barres.length ? barres[0].y + barres[0].h : null;
    const haut = reperes.find((r) => r.v === max);
    const unite = base !== null && haut ? (base - haut.y) / max : null;      // pixels par unité, lu sur le dessin
    return { svg, max, pas, reperes, barres, base, unite, valeurs: barres.map((b) => Math.round(b.h / unite)),
      graduations: [...svg.querySelectorAll('text.graduation')].map((x) => num(x.textContent)), categories: [...svg.querySelectorAll('text.categorie')].map((x) => texte(x)) };
  };
  {
    const test = diagrammeBarres({ categories: ['A', 'B', 'C'], valeurs: [3, 7, 4], pas: 2, titreY: 'Nombre' });
    const lu = lireDiagramme(conteneur(test.svg).querySelector('svg'));
    verifier(lu.max === 8 && lu.reperes.length === 4 && lu.valeurs.join() === '3,7,4' && lu.graduations.join() === '0,2,4,6,8' && lu.categories.join() === 'A,B,C'
      && lu.barres.every((b) => Math.abs(b.y + b.h - lu.base) < 0.02) && !/<text[^>]*>(3|7|4)<\/text>/.test(test.svg.replace(/<text class="graduation"[^>]*>\d+<\/text>/g, '')), 'diagrammeBarres : axe gradué jusqu’au multiple du pas, hauteurs proportionnelles, catégories dessous, valeurs non écrites sur les barres');
    const vide = conteneur(diagrammeBarres({ categories: ['A', 'B', 'C'], valeurs: [3, 7, 4], pas: 2, vide: true }).svg).querySelector('svg');
    verifier(vide.querySelectorAll('rect.barre').length === 0 && vide.querySelectorAll('line.repere').length === 4 && vide.getAttribute('data-vide') === 'oui', 'diagrammeBarres : vide = axes et lignes de repère sans barres');
    const gris = new Set([...conteneur(test.svg).querySelectorAll('rect.barre')].map((r) => r.getAttribute('fill')));
    verifier(gris.size === 1 && [...gris][0] === '#8C8C8C' && (test.svg.match(/#[0-9A-Fa-f]{3,6}\b/g) || []).every((m) => /^#(?:([0-9A-Fa-f])\1\1|([0-9A-Fa-f]{2})\2\2)$/.test(m)), 'diagrammeBarres : barres d’un seul gris, aucune couleur (noir et blanc)');
  }

  const exo4 = (page) => [...page.querySelectorAll('.bloc:not(.bloc--methode)')][3];
  const sansMot = (d) => !/faux|erreur|✗|✘|✕|✖|raté/i.test(texte(d)) && !/\p{Extended_Pictographic}/u.test(texte(d));
  const lireTableau = (table) => {
    const lignes = [...table.querySelectorAll('tr')].map((tr) => [...tr.children]);
    const colonnes = lignes[0].slice(1, 4).map(texte);
    return { coin: texte(lignes[0][0]), colonnes, caps: lignes.slice(1).map((l) => texte(l[0])), valeurs: lignes.slice(1).map((l) => l.slice(1, 4).map((c) => num(texte(c)))), totaux: lignes.slice(1).map((l) => l[4]) };
  };
  let comptes = 0, vierge = 0, ton = 0, tabOk = 0, tabTot = 0, q1Ok = 0, q1Tot = 0, q2Ok = 0, q2Tot = 0, barOk = 0, barTot = 0, grad = 0, c3Ok = 0, q4Ok = 0, q4Tot = 0, types1 = new Set(), themes = new Set(), themes2 = new Set(), bornes = 0;
  for (const effectifs of ['petits', 'grands']) for (let i = 0; i < 40; i++) {
    const c = tirer(fd, { effectifs });
    for (const methode of [true, false]) {
      const d = doc(c, { corrige: true, methode });
      const [eleve, corr] = d.querySelectorAll('.feuille');
      const nbQ = (page) => [page.querySelectorAll('.ex-do--tableau .q-do').length, page.querySelectorAll('.ex-do--diagramme .q-do').length, exo4(page).querySelectorAll('.q-do').length].join();
      const attendu = methode ? '4,4,2' : '6,6,3';
      if (nbQ(eleve) === attendu && nbQ(corr) === attendu && eleve.querySelectorAll('.bloc:not(.bloc--methode) h2').length === 4 && corr.querySelectorAll('.bloc h2').length === 4) comptes++;
      if (!methode && effectifs === 'petits') continue;   // les vérifications de fond portent sur la page complète puis sur la sans-rappel ci-dessous

      // ex. 1 : tableau 3 × 3 et totaux
      const tab = lireTableau(corr.querySelector('.tab-do--donnees'));
      const tabE = lireTableau(eleve.querySelector('.tab-do--donnees'));
      tabTot++;
      const totaux = tab.valeurs.map((l) => l.reduce((a, b) => a + b, 0));
      const borne = effectifs === 'petits' ? 20 : 100;
      if (tab.totaux.map((x) => num(texte(x))).join() === totaux.join() && tab.totaux.every((x) => x.classList.contains('rouge')) && tabE.totaux.every((x) => texte(x) === '')
        && JSON.stringify(tabE.valeurs) === JSON.stringify(tab.valeurs) && tab.colonnes.join() === 'CE1,CE2,CM1' && tab.valeurs.length === 3
        && tab.valeurs.flat().every((x) => x >= 1 && x <= borne) && totaux.every((x) => x <= borne)
        && [0, 1, 2].every((k) => tab.valeurs.reduce((a, l) => a + l[k], 0) <= borne)) tabOk++;
      themes.add(tab.coin);
      const col = (k) => tab.valeurs.map((l) => l[k]);
      const total = (t) => t.reduce((a, b) => a + b, 0);
      for (const li of corr.querySelectorAll('.ex-do--tableau .q-do')) {
        q1Tot++;
        const type = li.getAttribute('data-type'), r = +li.getAttribute('data-ligne'), k = +li.getAttribute('data-col');
        const rep = li.querySelector('.reponse').getAttribute('data-reponse');
        let attendue;
        if (type === 'case') attendue = String(tab.valeurs[r][k]);
        else if (type === 'totalLigne') attendue = String(total(tab.valeurs[r]));
        else if (type === 'maxCol') attendue = tab.caps[col(k).indexOf(Math.max(...col(k)))];
        else if (type === 'minCol') attendue = tab.caps[col(k).indexOf(Math.min(...col(k)))];
        else if (type === 'maxLigne') attendue = tab.colonnes[tab.valeurs[r].indexOf(Math.max(...tab.valeurs[r]))];
        // la question nomme bien la colonne / la ligne visée
        const q = texte(li.querySelector('.q-do__texte'));
        const nomOk = type === 'case' ? q.includes(`de ${tab.colonnes[k]} `) : type === 'maxCol' || type === 'minCol' ? q.includes(`en ${tab.colonnes[k]} ?`) : true;
        types1.add(type);
        if (attendue !== undefined && rep === attendue && nomOk) q1Ok++;
      }

      // ex. 2 : diagramme
      const dg = lireDiagramme(corr.querySelector('.ex-do--diagramme svg'));
      const dgE = lireDiagramme(eleve.querySelector('.ex-do--diagramme svg'));
      barTot++;
      const ok2 = dg.barres.length === 5 && dg.valeurs.length === 5 && dg.barres.every((b) => Math.abs(b.y + b.h - dg.base) < 0.02)
        && dg.barres.every((b, k) => Math.abs(b.h - dg.valeurs[k] * dg.unite) < 0.02)               // hauteur = valeur × unité, valeur entière
        && dg.valeurs.every((v) => v % dg.pas === 0 && v >= dg.pas) && new Set(dg.valeurs).size === 5
        && dg.valeurs.join() === dgE.valeurs.join() && dg.categories.join() === dg.barres.map((b) => b.cat).join()
        && dg.max === Math.ceil(Math.max(...dg.valeurs) / dg.pas) * dg.pas
        && dg.graduations.join() === Array.from({ length: dg.max / dg.pas + 1 }, (_, k) => k * dg.pas).join() && dg.reperes.length === dg.max / dg.pas;
      if (effectifs === 'petits' ? ok2 && [1, 2].includes(dg.pas) && dg.max <= 20 : ok2 && dg.pas === 10 && dg.max <= 100) barOk++;
      if (effectifs === 'petits' ? [1, 2].includes(dg.pas) : dg.pas === 10) grad++;
      themes2.add(texte(corr.querySelector('.ex-do--diagramme .ex-do__intro')));
      const cats = dg.categories;
      for (const li of corr.querySelectorAll('.ex-do--diagramme .q-do')) {
        q2Tot++;
        const type = li.getAttribute('data-type'), rep = li.querySelector('.reponse').getAttribute('data-reponse');
        const mx = Math.max(...dg.valeurs), mn = Math.min(...dg.valeurs);
        let attendue;
        if (type === 'valeur') attendue = String(dg.valeurs[+li.getAttribute('data-i')]);
        else if (type === 'max') attendue = cats[dg.valeurs.indexOf(mx)];
        else if (type === 'min') attendue = cats[dg.valeurs.indexOf(mn)];
        else if (type === 'ecart') { const a = +li.getAttribute('data-a'), b = +li.getAttribute('data-b'); attendue = String(dg.valeurs[a] - dg.valeurs[b]); if (dg.valeurs[a] <= dg.valeurs[b] || texte(li.querySelector('.calcul')) !== `${dg.valeurs[a]} − ${dg.valeurs[b]}`) attendue = undefined; }
        if (attendue !== undefined && rep === attendue) q2Ok++;
      }

      // ex. 3 : le diagramme vide (élève) et le diagramme construit (corrigé) suivent le tableau
      const t3 = lireTableau({ querySelectorAll: (s) => corr.querySelector('.tab-do--construction').querySelectorAll(s) });
      const lignes3 = [...corr.querySelector('.tab-do--construction').querySelectorAll('tr')].map((tr) => [...tr.children].slice(1).map(texte));
      const d3 = lireDiagramme(corr.querySelector('.ex-do--construction svg')), d3E = lireDiagramme(eleve.querySelector('.ex-do--construction svg'));
      const valeurs3 = lignes3[1].map(num);
      if (d3.barres.length === 4 && d3.valeurs.join() === valeurs3.join() && d3.categories.join() === lignes3[0].join() && d3E.categories.join() === lignes3[0].join()
        && d3E.barres.length === 0 && eleve.querySelector('.ex-do--construction svg').getAttribute('data-vide') === 'oui' && d3E.pas === d3.pas && d3E.max === d3.max && d3E.reperes.length === d3.reperes.length
        && new Set(valeurs3).size === 4 && valeurs3.every((v) => v % d3.pas === 0 && v >= d3.pas && v <= d3.max) && d3.max === Math.ceil(Math.max(...valeurs3) / d3.pas) * d3.pas
        && (effectifs === 'petits' ? [1, 2].includes(d3.pas) && d3.max <= 20 : d3.pas === 10 && d3.max <= 100)
        && d3.barres.every((b) => Math.abs(b.y + b.h - d3.base) < 0.02 && Math.abs(b.h - Math.round(b.h / d3.unite) * d3.unite) < 0.02)) c3Ok++;

      // ex. 4 : lecture et calcul dans le tableau de l’exercice 1
      for (const li of exo4(corr).querySelectorAll('.q-do')) {
        q4Tot++;
        const type = li.getAttribute('data-type'), rep = li.querySelector('.reponse').getAttribute('data-reponse'), calcul = texte(li.querySelector('.calcul'));
        let attendue, calc;
        if (type === 'ecartCases') { const r = +li.getAttribute('data-ligne'), a = +li.getAttribute('data-col-a'), b = +li.getAttribute('data-col-b'); attendue = tab.valeurs[r][a] - tab.valeurs[r][b]; calc = `${tab.valeurs[r][a]} − ${tab.valeurs[r][b]}`; if (attendue <= 0) attendue = NaN; }
        else if (type === 'totalColonne') { const k = +li.getAttribute('data-col'); attendue = total(col(k)); calc = col(k).join(' + '); }
        else if (type === 'sommeDeux') { const r = +li.getAttribute('data-ligne'), ks = li.getAttribute('data-cols').split(',').map(Number); attendue = ks.reduce((a, k) => a + tab.valeurs[r][k], 0); calc = ks.map((k) => tab.valeurs[r][k]).join(' + '); }
        if (String(attendue) === rep && calc === calcul) q4Ok++;
      }

      // page élève : aucune réponse hors exemple du rappel
      const hors = (page) => { const copie = page.cloneNode(true); copie.querySelectorAll('.bloc--methode').forEach((x) => x.remove()); return copie; };
      const nu = hors(eleve).querySelectorAll('.rouge, .reponse, .calcul, .case-vf--cochee').length === 0 && eleve.querySelectorAll('.ex-do--construction rect.barre').length === 0;
      if (nu) vierge++;
      if (sansMot(d)) ton++;
      // valeurs de l'axe ou du tableau jamais écrites dans le dessin (le dessin du corrigé non plus : l'élève lit l'axe)
      if (corr.querySelectorAll('.ex-do svg text').length === dg.graduations.length + dg.categories.length + 1 + d3.graduations.length + d3.categories.length + 1) bornes++;
    }
  }
  verifier(comptes === 160, 'données : mêmes comptes élève / corrigé, avec et sans méthode (6 + 6 questions, 3 calculs ; 4 + 4 et 2 avec le rappel)');
  verifier(tabOk === tabTot, `données : tableau 3 × 3, totaux recalculés, valeurs et totaux dans la borne de l’option (${tabOk}/${tabTot})`);
  verifier(q1Ok === q1Tot && ['case', 'maxCol', 'totalLigne', 'maxLigne', 'minCol'].every((t) => types1.has(t)), `données : réponses de l’exercice 1 recalculées sur le tableau (${q1Ok}/${q1Tot})`);
  verifier(barOk === barTot && grad === barTot, `données : barres du diagramme proportionnelles aux valeurs, graduation conforme à l’option (${barOk}/${barTot})`);
  verifier(q2Ok === q2Tot, `données : réponses de l’exercice 2 recalculées sur la hauteur des barres (${q2Ok}/${q2Tot})`);
  verifier(c3Ok === barTot, `données : diagramme vide de l’exercice 3 et barres du corrigé conformes au tableau (${c3Ok}/${barTot})`);
  verifier(q4Ok === q4Tot, `données : exercice 4, calculs et réponses recalculés (${q4Ok}/${q4Tot})`);
  verifier(vierge === barTot && ton === barTot, 'données : aucune réponse sur la page élève (hors rappel) ; pas de mot négatif ni d’emoji');
  verifier(bornes === barTot, 'données : aucune valeur écrite sur les barres (seuls l’axe, les catégories et le titre sont du texte)');
  verifier(themes.size >= 3 && themes2.size >= 3, `données : thèmes variés (${themes.size} tableaux, ${themes2.size} diagrammes)`);

  // Sans le rappel, les mêmes vérifications sur la page complète du corrigé : 6 + 6 questions et 3 calculs, toutes exactes
  let sansOk = 0;
  for (const effectifs of ['petits', 'grands']) for (let i = 0; i < 30; i++) {
    const c = tirer(fd, { effectifs });
    const corr = doc(c, { corrige: true, methode: false }).querySelectorAll('.feuille')[1];
    const tab = lireTableau(corr.querySelector('.tab-do--donnees'));
    const dg = lireDiagramme(corr.querySelector('.ex-do--diagramme svg'));
    const bonnes = [...corr.querySelectorAll('.q-do')].every((li) => {
      const t = li.getAttribute('data-type'), rep = li.querySelector('.reponse').getAttribute('data-reponse');
      const r = +li.getAttribute('data-ligne'), k = +li.getAttribute('data-col');
      const col = (x) => tab.valeurs.map((l) => l[x]);
      if (t === 'case') return rep === String(tab.valeurs[r][k]);
      if (t === 'totalLigne') return rep === String(tab.valeurs[r].reduce((a, b) => a + b, 0));
      if (t === 'maxCol') return rep === tab.caps[col(k).indexOf(Math.max(...col(k)))];
      if (t === 'minCol') return rep === tab.caps[col(k).indexOf(Math.min(...col(k)))];
      if (t === 'maxLigne') return rep === tab.colonnes[tab.valeurs[r].indexOf(Math.max(...tab.valeurs[r]))];
      if (t === 'valeur') return rep === String(dg.valeurs[+li.getAttribute('data-i')]);
      if (t === 'max') return rep === dg.categories[dg.valeurs.indexOf(Math.max(...dg.valeurs))];
      if (t === 'min') return rep === dg.categories[dg.valeurs.indexOf(Math.min(...dg.valeurs))];
      if (t === 'ecart') return rep === String(dg.valeurs[+li.getAttribute('data-a')] - dg.valeurs[+li.getAttribute('data-b')]) && dg.valeurs[+li.getAttribute('data-a')] > dg.valeurs[+li.getAttribute('data-b')];
      if (t === 'ecartCases') return rep === String(tab.valeurs[r][+li.getAttribute('data-col-a')] - tab.valeurs[r][+li.getAttribute('data-col-b')]) && +rep > 0;
      if (t === 'totalColonne') return rep === String(col(k).reduce((a, b) => a + b, 0));
      if (t === 'sommeDeux') return rep === String(li.getAttribute('data-cols').split(',').reduce((a, x) => a + tab.valeurs[r][+x], 0));
      return false;
    });
    if (bonnes && corr.querySelectorAll('.q-do').length === 15) sansOk++;
  }
  verifier(sansOk === 60, 'données : sans le rappel, 15 questions (6 + 6 + 3) toutes exactes');

  // Le rappel : les phrases de la leçon, le diagramme et le tableau du musée
  const c0 = tirer(fd, {});
  const sans = doc(c0, { corrige: false, methode: false }), avec = doc(c0, { corrige: false, methode: true });
  verifier(avec.textContent.includes('Je me souviens de la méthode') && !sans.textContent.includes('Je me souviens de la méthode'), 'données : le rappel se masque');
  const rap = avec.querySelector('.rappel-do'), tr = texte(rap);
  verifier(['Le diagramme représente le nombre de personnes ayant visité un musée pendant une semaine. Le musée est fermé le dimanche.', 'Ce diagramme donne une vision globale des données et permet des comparaisons rapides.', 'On peut représenter les mêmes données dans un tableau à double entrée', 'Nombre de visiteurs'].every((m) => tr.includes(m)), 'données : le rappel reprend les phrases de la leçon');
  const dm = lireDiagramme(rap.querySelector('svg'));
  verifier(dm.valeurs.join() === '6000,7000,4000,8000,9000,10000' && dm.pas === 2000 && dm.max === 10000 && dm.categories.join() === 'Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi'
    && [...rap.querySelectorAll('td')].map((x) => num(texte(x))).filter((x) => !isNaN(x)).join() === '6000,7000,4000,8000,9000,10000', 'données : rappel = diagramme du musée (axe de 2 000 en 2 000) et même tableau');

  // Reproductibilité par le code
  for (const effectifs of ['petits', 'grands']) for (let i = 0; i < 10; i++) {
    const c = tirer(fd, { effectifs });
    const r = decoder(c.code);
    if (!(r && r.fiche === fd && r.options.effectifs === effectifs && JSON.stringify(tirer(r.fiche, r.options, r.graine)) === JSON.stringify(c))) { verifier(false, `données : le code ${c.code} ne redonne pas la même fiche`); break; }
  }
  verifier(true, 'données : le code redonne la même fiche (et l’option)');
  verifier(rendre(fd, tirer(fd, { effectifs: 'grands' }, 77), { corrige: true }) === rendre(fd, tirer(fd, { effectifs: 'grands' }, 77), { corrige: true }), 'données : même graine, même HTML');
  const vus = new Set(); for (let i = 0; i < 200; i++) vus.add(tirer(fd, {}).code);
  verifier(vus.size > 190, `données : codes variés (${vus.size} sur 200)`);

  // Les seize fiches précédentes inchangées
  const empreinte = empreinteLivret;
  const somme = (x) => { let h = 5381; for (const ch of x) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const h = [['ce2-addition-posee', { taille: 'mix' }], ['ce2-soustraction-posee', { taille: 'mix' }], ['ce2-multiplication', { facteur: '2' }], ['ce2-nombres-lire-ecrire', { taille: '1000' }], ['ce2-nombres-lire-ecrire', { taille: '10000' }],
    ['ce2-nombres-comparer', { taille: '1000' }], ['ce2-nombres-comparer', { taille: '10000' }], ['ce2-fractions-lire', {}], ['ce2-fractions-comparer', {}], ['ce2-fractions-calculer', { denominateur: '4' }], ['ce2-fractions-calculer', { denominateur: '10' }],
    ['ce2-monnaie', { centimes: 'non' }], ['ce2-monnaie', { centimes: 'oui' }], ['ce2-longueurs', { km: 'non' }], ['ce2-longueurs', { km: 'oui' }], ['ce2-heures', { minutes: 'quarts' }], ['ce2-heures', { minutes: 'cinq' }],
    ['ce2-masses-contenances', { grandeur: 'masses' }], ['ce2-masses-contenances', { grandeur: 'contenances' }], ['ce2-masses-contenances', { grandeur: 'deux' }], ['ce2-durees', { secondes: 'non' }], ['ce2-durees', { secondes: 'oui' }], ['ce2-solides', {}], ['ce2-polygones', {}],
    ['ce2-symetrie', { axes: 'vertical' }], ['ce2-symetrie', { axes: 'deux' }], ['ce2-donnees', { effectifs: 'petits' }], ['ce2-donnees', { effectifs: 'grands' }]]
    .map(([id, o]) => somme(empreinte(FICHES.find((x) => x.id === id), o)));
  verifier(h.join() === '2789614763,218167992,1492587144,1270504235,369606179,1228745252,281949600,3236866125,1567635576,592853075,3083421059,944532526,3355862789,2046701377,3476163019,790039978,33423947,3222174131,4066120544,111621477,764921232,2490904800,2227176886,2273396289,4066720242,1562094351,4041506462,1094164931', `données : les dix-sept fiches (feuille panachée comprise) sont inchangées (${h.join()})`);
  verifier(FICHES.slice(0, 17).map((f) => f.id).join() === 'ce2-addition-posee,ce2-soustraction-posee,ce2-multiplication,ce2-nombres-lire-ecrire,ce2-nombres-comparer,ce2-fractions-lire,ce2-fractions-comparer,ce2-fractions-calculer,ce2-monnaie,ce2-longueurs,ce2-heures,ce2-masses-contenances,ce2-durees,ce2-solides,ce2-polygones,ce2-symetrie,ce2-donnees', 'données : ordre des dix-sept premières fiches inchangé');
}

/* Séparer la notion de sa formulation (#26) : livret / commune ------------------ */
{
  console.log('— Formulations : livret et commune');
  const ids = ['ce2-addition-posee', 'ce2-soustraction-posee', 'ce2-multiplication', 'ce2-monnaie',
    'ce2-nombres-lire-ecrire', 'ce2-nombres-comparer', 'ce2-fractions-lire', 'ce2-fractions-comparer', 'ce2-fractions-calculer', 'ce2-longueurs', 'ce2-heures',
    'ce2-masses-contenances', 'ce2-durees', 'ce2-solides', 'ce2-polygones', 'ce2-symetrie', 'ce2-donnees'];
  const optsDe = { 'ce2-addition-posee': [{ taille: '3' }, { taille: 'mix' }], 'ce2-soustraction-posee': [{ taille: '3' }, { taille: 'mix' }],
    'ce2-multiplication': [{ facteur: '1' }, { facteur: '2' }], 'ce2-monnaie': [{ centimes: 'non' }, { centimes: 'oui' }],
    'ce2-nombres-lire-ecrire': [{ taille: '1000' }, { taille: '10000' }], 'ce2-nombres-comparer': [{ taille: '1000' }, { taille: '10000' }],
    'ce2-fractions-lire': [{}], 'ce2-fractions-comparer': [{}], 'ce2-fractions-calculer': [{ denominateur: '4' }, { denominateur: '10' }],
    'ce2-longueurs': [{ km: 'non' }, { km: 'oui' }], 'ce2-heures': [{ minutes: 'quarts' }, { minutes: 'cinq' }],
    'ce2-masses-contenances': [{ grandeur: 'masses' }, { grandeur: 'contenances' }, { grandeur: 'deux' }], 'ce2-durees': [{ secondes: 'non' }, { secondes: 'oui' }],
    'ce2-solides': [{}], 'ce2-polygones': [{}], 'ce2-symetrie': [{ axes: 'vertical' }, { axes: 'deux' }], 'ce2-donnees': [{ effectifs: 'petits' }, { effectifs: 'grands' }] };
  const somme = (x) => { let h = 5381; for (const ch of x) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h; };
  const ouverts = [];   // les fenêtres jsdom pèsent lourd : on les ferme au fil de l'eau
  const dom = (html) => { const w = new JSDOM(`<div>${html}</div>`).window; ouverts.push(w); return w.document; };
  const nombres = (el) => (el.textContent.match(/\d+/g) || []).join(' ');
  const NEGATIFS = /\b(faux|fausse|fausses|erreur|erreurs|incorrect|incorrecte|mauvais|mauvaise|raté|ratée|perdu|échec)\b|[✗✘❌]/i;
  const structure = (o) => (o && typeof o === 'object' && typeof o !== 'function'
    ? `{${Object.keys(o).sort().map((k) => `${k}:${structure(o[k])}`).join(',')}}` : typeof o === 'function' ? 'f' : 'v');

  // Un objet de fiche écrit à la main, sans `formulations` (toutes les vraies fiches en ont deux) : le moteur le rend encore.
  const factice = { ...FICHES.find((x) => x.id === 'ce2-donnees'), id: 'ce2-factice', formulations: undefined, objectif: 'Je sais tester.', generer: (o) => ({ ...FICHES.find((x) => x.id === 'ce2-donnees').generer(o), objectif: 'Je sais tester.' }),
    mise: { ...FICHES.find((x) => x.id === 'ce2-donnees').mise, noteCorrige: 'une note écrite à la main' } };
  verifier(formulation(factice, 'commune') === null && formulation(null) === null, 'formulation : une fiche sans formulations renvoie null');
  verifier(FICHES.every((f) => f.formulations && Object.keys(f.formulations).join() === 'livret,commune'), 'formulation : les dix-sept fiches ont leurs deux formulations');
  const empreintesCommune = [];

  const parDom = ['ce2-addition-posee', 'ce2-soustraction-posee', 'ce2-multiplication', 'ce2-monnaie'];
  for (const id of ids) {
    const f = FICHES.find((x) => x.id === id);
    verifier(!!f.formulations && Object.keys(f.formulations).join() === 'livret,commune', `${id} : deux formulations nommées (livret, commune)`);
    verifier(formulation(f, 'inconnue') === f.formulations.livret && formulation(f) === f.formulations.livret && formulation(f, 'commune') === f.formulations.commune,
      `${id} : formulation(fiche, nom) renvoie la demandée, livret par défaut`);
    verifier(structure(f.formulations.livret) === structure(f.formulations.commune), `${id} : mêmes clés dans les deux formulations (${Object.keys(f.formulations.livret).join(', ')})`);

    let memesNombres = true, memesReponses = true, memeCode = true, sansNegatif = true, differents = true, memeGrille = true;
    for (const options of optsDe[id]) {
      for (const graine of [1, 2, 3, 424242]) {
        const c = tirer(f, options, graine);
        for (const methode of [true, false]) {
          const rendu = (nom) => rendre(f, c, { corrige: true, methode, formulation: nom, base: 'http://x/' });
          const rL = rendu('livret'), rC = rendu('commune');
          if (!parDom.includes(id)) {
            // Fiches du lot 2 : sans DOM (jsdom ne libère pas ses documents, la suite dépasserait la mémoire de node).
            // Les blocs d'exercices et de corrigé sont ceux de la fiche, rappel, objectif et note exclus.
            const texteDe = (nom, vue) => nombres({ textContent: f.blocs(c, { methode, formulation: nom }).map((b) => b[vue].replace(/<[^>]*>/g, '')).join('') });
            if (texteDe('livret', 'eleve') !== texteDe('commune', 'eleve')) { memesNombres = false; console.log(id, graine, '\n', texteDe('livret', 'eleve'), '\n', texteDe('commune', 'eleve')); }
            if (texteDe('livret', 'corrige') !== texteDe('commune', 'corrige')) { memesReponses = false; console.log(id, graine, '\n', texteDe('livret', 'corrige'), '\n', texteDe('commune', 'corrige')); }
            if (NEGATIFS.test(rL.replace(/<[^>]*>/g, ' ')) || NEGATIFS.test(rC.replace(/<[^>]*>/g, ' '))) sansNegatif = false;
            if (rL === rC) differents = false;
            continue;
          }
          const L = dom(rL), C = dom(rC);
          const eleve = (d) => { const e = d.querySelector('.feuille:not(.feuille--corrige)').cloneNode(true); e.querySelectorAll('.bloc--methode, .objectif').forEach((n) => n.remove()); return nombres(e); };
          if (eleve(L) !== eleve(C)) { memesNombres = false; console.log(id, graine, '\n', eleve(L), '\n', eleve(C)); }
          const corrige = (d) => { const e = d.querySelector('.feuille--corrige').cloneNode(true); e.querySelectorAll('.objectif--corrige, .pose__retenues, .ret-petite, .un, .note, .methode').forEach((n) => n.remove()); return nombres(e); };
          if (corrige(L) !== corrige(C)) { memesReponses = false; console.log(id, graine, '\n', corrige(L), '\n', corrige(C)); }
          if (NEGATIFS.test(L.body.textContent) || NEGATIFS.test(C.body.textContent)) sansNegatif = false;
          if (rL === rC) differents = false;
          ouverts.splice(0).forEach((w) => w.close());
        }
        ouverts.splice(0).forEach((w) => w.close());
        if (tirer(f, options, graine).code !== c.code || decoder(c.code).graine !== graine) memeCode = false;
        // les opérations d'une addition se dessinent de la même façon dans les deux formulations
        if (id === 'ce2-addition-posee') {
          const grilles = (nom) => dom(rendre(f, c, { formulation: nom })).querySelector('.feuille--corrige .operations').innerHTML;
          if (grilles('livret') !== grilles('commune')) memeGrille = false;
        }
      }
    }
    verifier(memesNombres, `${id} : les deux formulations rendent les mêmes nombres sur la page élève (exercices)`);
    verifier(memesReponses, `${id} : les deux formulations donnent les mêmes réponses dans le corrigé`);
    verifier(sansNegatif, `${id} : aucun mot négatif, ni dans le livret ni en commune`);
    verifier(differents, `${id} : la formulation commune change bien le rendu`);
    verifier(memeCode, `${id} : le code d’un tirage ne dépend pas de la formulation`);
    verifier(memeGrille || id !== 'ce2-addition-posee', 'addition : les retenues dessinées sont inchangées en commune');
    const c0 = tirer(f, optionsParDefaut(f), 424242);
    verifier(!/livret|commune/.test(JSON.stringify(c0)) && !/livret|commune/.test(c0.code), `${id} : ni le tirage ni le code ne portent la formulation`);
    verifier(objectifDe(f, c0, 'commune') !== objectifDe(f, c0, 'livret') || id === 'ce2-monnaie' || id === 'ce2-longueurs', `${id} : objectifs distincts`);
    verifier(f.formulations.livret.noteParent !== f.formulations.commune.noteParent, `${id} : notes pour le parent distinctes`);
    const eC = (o) => somme(JSON.stringify(c0) + rendre(f, c0, { corrige: true, base: 'http://x/', formulation: 'commune' }) + o);
    empreintesCommune.push(eC(''));
  }
  // Empreintes à graine fixe de la formulation commune (mesurées à l'écriture de la formulation).
  verifier(empreintesCommune.join() === '2650922662,160742996,3598143989,340686592,2895412791,3854321978,2643291320,2938812864,3350887168,320403439,3039857929,2758405622,181086667,2390349046,3929382661,4284060172,2078331428', `rendu commune stable (${empreintesCommune.join()})`);

  // Un objet de fiche sans `formulations` ignore l'option : son objectif vient du tirage, sa note de sa mise en page
  const cn = tirer(factice, optionsParDefaut(FICHES.find((x) => x.id === 'ce2-donnees')), 77);
  const brut = rendre(factice, cn, { base: 'http://x/' });
  verifier(rendre(factice, cn, { formulation: 'commune', base: 'http://x/' }) === brut
    && blocsDe(factice, cn, { formulation: 'commune' }).length === blocsDe(factice, cn).length
    && brut.includes('Je sais tester.') && brut.includes('une note écrite à la main') && objectifDe(factice, cn, 'commune') === 'Je sais tester.',
  'une fiche sans formulations ignore l’option formulation');

  // Soustraction : retenues de la méthode commune (1 devant le chiffre du haut, 1 au pied du chiffre du bas de la colonne suivante)
  const so = FICHES.find((x) => x.id === 'ce2-soustraction-posee');
  let sousOk = true, nbOps = 0;
  for (let g = 1; g <= 20; g++) {
    const c = tirer(so, { taille: 'mix' }, g);
    const d = dom(rendre(so, c, { formulation: 'commune' }));
    const ops = [...d.querySelectorAll('.feuille--corrige .operations .op')];
    const donnees = [...c.posees.slice(0, 4), ...c.aposer.slice(0, 3)];
    ops.forEach((op, i) => {
      nbOps++;
      const { a, b } = donnees[i];
      const A = String(a).split('').map(Number), B = String(b).padStart(A.length, '0').split('').map(Number);
      const hautAtt = [], basAtt = [];
      let retenue = 0;
      for (let k = A.length - 1; k >= 0; k--) {
        const recoit = A[k] < B[k] + retenue;
        hautAtt[k] = recoit; basAtt[k] = retenue === 1;   // le chiffre du bas reçoit 1 s'il y a eu +10 à sa droite
        retenue = recoit ? 1 : 0;
      }
      const pad = op.querySelectorAll('.pose__nombre')[0].querySelectorAll('td').length - 1 - A.length;
      const lignes = op.querySelectorAll('.pose__nombre');
      const hauts = [...lignes[0].querySelectorAll('td')].slice(1 + pad).map((td) => !!td.querySelector('.ret-petite--haut'));
      const bas = [...lignes[1].querySelectorAll('td')].slice(1 + pad).map((td) => !!td.querySelector('.ret-petite--bas'));
      if (JSON.stringify(hauts) !== JSON.stringify(hautAtt) || JSON.stringify(bas) !== JSON.stringify(basAtt.map((x, k) => x)) || op.querySelector('.barre') || op.querySelector('.pose__retenues')) sousOk = false;
    });
  }
  verifier(sousOk && nbOps > 100, `soustraction commune : petit 1 en haut là où la colonne reçoit 10, petit 1 en bas de la colonne suivante, rien de barré (${nbOps} opérations)`);
  const L = dom(rendre(so, tirer(so, { taille: 'mix' }, 5), { formulation: 'livret' }));
  verifier(L.querySelector('.feuille--corrige .barre') && !L.querySelector('.ret-petite') && L.querySelector('.pose__retenues'), 'soustraction livret : chiffre barré et chiffre au-dessus, comme dans la leçon');

  // Multiplication : retenues au-dessus des chiffres du premier facteur
  const mu = FICHES.find((x) => x.id === 'ce2-multiplication');
  let multOk = true, nbMult = 0, avecRetenue = 0;
  for (let g = 1; g <= 20; g++) {
    const c = tirer(mu, { facteur: '2' }, g);
    const d = dom(rendre(mu, c, { formulation: 'commune' }));
    const attendues = (a, ch) => { const A = String(a).split('').reverse().map(Number); const out = {}; let r = 0; for (let j = 0; j + 1 < A.length; j++) { r = Math.floor((A[j] * ch + r) / 10); if (r) out[j + 1] = String(r); } return out; };
    const donnees = [...c.posees1.slice(0, 3), ...c.posees2.slice(0, 2)];
    const ops = [...d.querySelectorAll('.feuille--corrige .operations .op')].slice(0, donnees.length);
    ops.forEach((op, i) => {
      nbMult++;
      const { a, b } = donnees[i];
      const rangee = (sel) => [...op.querySelectorAll(`${sel} td`)].slice(1).filter((td) => !td.classList.contains('note')).map((td) => td.textContent.trim());
      const lire = (rg) => Object.fromEntries(rg.map((v, k) => [rg.length - 1 - k, v]).filter(([, v]) => v));
      const un = lire(rangee('.pose__retenues--unites'));
      const att = attendues(a, b % 10);
      if (JSON.stringify(un) !== JSON.stringify(att)) multOk = false;
      if (Object.keys(att).length) avecRetenue++;
      if (b >= 10 && JSON.stringify(lire(rangee('.pose__retenues--dizaines'))) !== JSON.stringify(attendues(a, Math.floor(b / 10)))) multOk = false;
      if (op.querySelector('.retenue--barree') || op.querySelector('td.note .retenue')) multOk = false;
    });
  }
  verifier(multOk && avecRetenue > 20, `multiplication commune : retenues au-dessus du chiffre qui les reçoit, une ligne par chiffre du second facteur (${nbMult} opérations, ${avecRetenue} avec retenue)`);
  const ML = dom(rendre(mu, tirer(mu, { facteur: '2' }, 5), { formulation: 'livret' }));
  verifier(ML.querySelector('.feuille--corrige td.note .retenue') && !ML.querySelector('.pose__retenues--unites'), 'multiplication livret : retenues en petit à droite du facteur');
  verifier(dom(rendre(mu, tirer(mu, { facteur: '2' }, 5), { formulation: 'commune' })).querySelector('.methode .pose__retenues--unites .retenue'), 'multiplication commune : le rappel dessine les retenues au-dessus des chiffres');

  // Monnaie : le complément en deux temps est commun ; le livret n'est pas cité en commune
  const mo = FICHES.find((x) => x.id === 'ce2-monnaie');
  const MC = dom(rendre(mo, tirer(mo, { centimes: 'oui' }, 9), { formulation: 'commune' })).body.textContent;
  verifier(!/leçon|livret/i.test(MC) && /en deux temps/.test(MC) && !/Je complète à 13/.test(MC), 'monnaie commune : complément en deux temps, sans citer le livret');
  const SC = ids.map((i) => FICHES.find((x) => x.id === i))
    .map((f) => rendre(f, tirer(f, optionsParDefaut(f), 9), { formulation: 'commune' }).replace(/<[^>]*>/g, ' '));
  verifier(SC.every((t) => !/leçon|livret|Mila|Enzo|\bcasse\b|\bpages?\b|\bp\. ?\d/i.test(t)), 'formulation commune : aucune tournure propre au livret (leçon, Mila, Enzo, « casser », page)');

  // Lot 2 : les définitions sont les mêmes dans les deux formulations
  const texteDe = (id, o, nom) => { const f = FICHES.find((x) => x.id === id); return rendre(f, tirer(f, o, 9), { formulation: nom }).replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&nbsp;|\u00a0|\u202f/g, ' ').replace(/\s+/g, ' '); };
  const defs = [
    ['ce2-nombres-lire-ecrire', { taille: '10000' }, ['1 millier = 10 centaines = 100 dizaines = 1 000 unités', 'm milliers · c centaines · d dizaines · u unités']],
    ['ce2-nombres-comparer', { taille: '10000' }, ['Comparer deux nombres', 'Ranger', 'Encadrer', 'Intercaler']],
    ['ce2-fractions-lire', {}, ['4 est le dénominateur', '3 est le numérateur', 'un demi', 'un quart', 'trois quarts']],
    ['ce2-fractions-comparer', {}, ['5 douzièmes < 7 douzièmes', '1 sixième', 'égale à 1']],
    ['ce2-fractions-calculer', { denominateur: '4' }, ['trois quarts d’unité', '2 unités et 1 quart d’unité', 'On additionne les numérateurs', 'On soustrait les numérateurs']],
    ['ce2-longueurs', { km: 'oui' }, ['1 cm = 10 mm', '1 m = 100 cm', '1 m = 10 dm', '1 dm = 10 cm', '1 km = 1 000 m', 'Le périmètre d’une figure est la longueur du tour de cette figure.']],
    ['ce2-heures', { minutes: 'cinq' }, ['La petite aiguille indique les heures.', 'La grande aiguille indique les minutes.', '1 heure = 60 minutes', 'moins le quart → 45']],
    ['ce2-masses-contenances', { grandeur: 'deux' }, ['1 kg = 1 000 g', '1 t = 1 000 kg', '1 L = 100 cL', '1 L = 10 dL', 'Une bouteille d’eau de 1 L', 'Une piscine gonflable de 930 L']],
    ['ce2-durees', { secondes: 'oui' }, ['1 minute = 60 secondes', '1 heure = 60 minutes', '1 demi-heure = 30 minutes', '1 quart d’heure = 15 minutes', '1 siècle = 100 ans', '1 millénaire = 1 000 ans', '1 millénaire = 10 siècles']],
    ['ce2-solides', {}, ['un cube', 'un pavé droit', 'une pyramide', 'une boule', 'un cylindre', 'un cône', 'Le cube a 6 faces carrées, 12 arêtes et 8 sommets.', '5 faces', '8 arêtes et 5 sommets']],
    ['ce2-polygones', {}, ['Un polygone est une figure fermée qu’on peut tracer avec une règle.', 'Un triangle est un polygone qui a trois côtés et trois sommets.', 'Un quadrilatère est un polygone qui a quatre côtés et quatre sommets.', 'Un pentagone a 5 côtés et 5 sommets.', 'Un hexagone a 6 côtés et 6 sommets.', 'Le diamètre est égal au double du rayon']],
    ['ce2-symetrie', {}, ['Le pli est un axe de symétrie.', 'On dit que la figure est symétrique par rapport à cet axe.', 'Ce carré a 4 axes de symétrie.']],
    ['ce2-donnees', {}, ['Le musée est fermé le dimanche.', 'tableau à double entrée', 'diagramme en barres']],
  ];
  for (const [id, o, phrases] of defs) {
    const L = texteDe(id, o, 'livret'), C = texteDe(id, o, 'commune');
    verifier(phrases.every((p) => L.includes(p) && C.includes(p)), `${id} : les définitions sont reprises à l’identique dans les deux formulations`);
  }
}

process.exit(echecs ? 1 : 0);
