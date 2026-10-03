// Feuille panachée : un exercice par notion, sur une A4, rouvrable par son code « Z… ».
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { FICHES, tirer, decoder, codeDe, codePanache, optionsParDefaut, blocsDe } from '../js/fiches.js';
import { composer, rendrePanache, graineDerivee, HAUTEUR_PAGE, NOTIONS_MAX } from '../js/panache.js';
import { HAUTEURS_BLOCS, HAUTEURS_PAGE, HAUTEURS_RAPPEL } from '../js/hauteurs-blocs.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };
const doc = (html) => new JSDOM(`<div>${html}</div>`).window.document;
const ids = FICHES.map((f) => f.id);

// Hasard à graine pour choisir des sélections reproductibles.
let etat = 20261003;
const alea = () => { etat = (Math.imul(etat, 1103515245) + 12345) >>> 0; return etat / 2 ** 32; };
const selection = (n) => {
  const pool = [...ids];
  const choisis = [];
  while (choisis.length < n) choisis.push(pool.splice(Math.floor(alea() * pool.length), 1)[0]);
  return choisis.map((id) => ({ id }));
};

/* 1. Les blocs réutilisables --------------------------------------- */

{
  let nombre = 0, exacts = 0, autonomes = 0, mesures = 0, titres = 0;
  for (const f of FICHES) {
    for (const methode of [true, false]) {
      const c = tirer(f, optionsParDefaut(f), 31);
      const blocs = f.blocs(c, { methode });
      const eleve = f.mise.exercices(c, methode), corrige = f.mise.corriges(c, methode);
      nombre += blocs.length === 4 ? 1 : 0;
      exacts += blocs.every((b) => eleve.includes(b.eleve) && corrige.includes(b.corrige)) ? 1 : 0;
      // chaque fragment est un bloc entier : les 4 fragments recollés redonnent la page, à l'espacement près
      if (blocs.map((b) => b.eleve).join('').replace(/\s+/g, '') !== eleve.replace(/\s+/g, '')) exacts--;
      titres += blocs.every((b, i) => b.titre === `Exercice ${i + 1}` && b.consigne.length > 3) ? 1 : 0;
    }
    const h = HAUTEURS_BLOCS[f.id];
    const b0 = f.blocs(tirer(f, optionsParDefaut(f), 5));
    mesures += h && h.eleve.length === b0.length && h.corrige.length === b0.length
      && [...h.eleve, ...h.corrige].every((x) => x > 40 && x < 400) ? 1 : 0;
    // le premier exercice ne renvoie à aucun autre : il peut voyager seul
    autonomes += !/exercice\s*\d/i.test(b0[0].eleve.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, '')) ? 1 : 0;
  }
  verifier(nombre === 2 * FICHES.length, `blocs : 4 exercices par fiche, avec et sans méthode (${nombre}/${2 * FICHES.length})`);
  verifier(exacts === 2 * FICHES.length, 'blocs : fragments exacts de ce que produisent exercices() et corriges()');
  verifier(titres === 2 * FICHES.length, 'blocs : titre « Exercice n » et consigne pour chaque bloc');
  verifier(mesures === FICHES.length, 'blocs : une hauteur mesurée (élève et corrigé) pour chaque bloc de chaque fiche');
  verifier(autonomes === FICHES.length, 'blocs : le premier exercice de chaque fiche ne renvoie à aucun autre');
  verifier(FICHES.every((f) => HAUTEURS_RAPPEL[f.id] > 0) && HAUTEURS_PAGE.enteteEleve > 50 && HAUTEURS_PAGE.enteteCorrige > 50, 'blocs : hauteurs des en-têtes et des mini-rappels présentes');
  const c = tirer(FICHES[0], {}, 1);
  verifier(blocsDe(FICHES[0], c)[0].hauteur === HAUTEURS_BLOCS[FICHES[0].id].eleve[0], 'blocs : la hauteur vient de la table mesurée');
}

/* 2. Le code « Z… » -------------------------------------------------- */

{
  const code = codePanache([{ id: 'ce2-soustraction-posee', options: { taille: '4' } }, { id: 'ce2-heures', options: { minutes: 'cinq' } }, { id: 'ce2-fractions-lire' }], 1234567, true);
  const brut = code.replace(/-/g, '');
  verifier(/^Z[0-9A-Z]{4}/.test(brut) && code.split('-').every((g, i, t) => i === t.length - 1 ? g.length <= 4 : g.length === 4), `code : préfixe Z, groupes de 4 (${code})`);
  // masque : fiches d'index 1, 5 et 10 → 2 + 32 + 1024 ; options : taille '4' → 1, (fractions-lire : aucune), minutes 'cinq' → 1
  verifier(parseInt(brut.slice(1, 5), 36) === 2 + 32 + 1024 && brut.slice(5, 7) === '11', 'code : masque des notions, puis une valeur par option (aucune pour une fiche sans option)');
  verifier(brut.length === 1 + 4 + 2 + 6 + 1 && brut.endsWith('1'), 'code : graine sur 6 caractères et mini-rappel en dernier');
  const r = decoder(code);
  verifier(r.panache === true && r.graine === 1234567 && r.miniRappel === true
    && JSON.stringify(r.notions) === JSON.stringify([{ id: 'ce2-soustraction-posee', options: { taille: '4' } }, { id: 'ce2-fractions-lire', options: {} }, { id: 'ce2-heures', options: { minutes: 'cinq' } }]),
  'code : décodé dans l’ordre de FICHES, options comprises');
  verifier(JSON.stringify(decoder(code.toLowerCase().replace(/-/g, ' '))) === JSON.stringify(r), 'code : minuscules, espaces et tirets sans importance');
  for (const mauvais of ['Z', 'Z0000-0000-0000', `${code}0`, code.slice(0, -2), 'Z017M-11AB-CDEF-X', `Z${'0'.repeat(11)}`]) {
    if (decoder(mauvais)) verifier(false, `code : « ${mauvais} » devrait être refusé`);
  }
  verifier(true, 'code : codes tronqués, trop longs, vides ou au mini-rappel invalide refusés');
  verifier(!decoder(`Z0${'Z'.repeat(3)}-00000A-0`), 'code : un masque qui désigne une fiche inexistante est refusé');
  // toutes les fiches ensemble : le masque tient sur 4 caractères
  const tout = ids.map((id) => ({ id }));
  verifier(decoder(codePanache(tout, 5, false)).notions.length === FICHES.length, `code : les ${FICHES.length} fiches ensemble se codent et se décodent`);

  // ancien format : décodé à l'identique
  const f = FICHES.find((x) => x.id === 'ce2-heures');
  const ancien = codeDe(f, { minutes: 'cinq' }, 99);
  const a = decoder(ancien);
  verifier(!a.panache && a.fiche === f && a.options.minutes === 'cinq' && a.graine === 99, `ancien format : ${ancien} toujours décodé`);
  const lu = decoder('02G0-UTSC');
  verifier(lu.fiche === FICHES[0] && lu.options.taille === 'mix' && lu.graine === parseInt('G0UTSC', 36), 'ancien format : 02G0-UTSC = addition posée, « Les deux », même graine');
  verifier(FICHES.every((x, i) => decoder(codeDe(x, optionsParDefaut(x), 7)).fiche === FICHES[i]), 'ancien format : chaque fiche se décode toujours (aucun ne commence par Z)');
  verifier(FICHES.length <= 20, 'le masque à 4 caractères couvre toutes les fiches (20 au plus)');
}

/* 3. Composition reproductible par le code ------------------------- */

{
  let memeHTML = 0, tot = 0, ordre = 0;
  for (let n = 2; n <= 5; n++) {
    for (let i = 0; i < 5; i++) {
      tot++;
      const notions = selection(n).map((x) => ({ ...x, options: optionsParDefaut(FICHES.find((f) => f.id === x.id)) }));
      const c = composer({ notions, graine: Math.floor(alea() * 36 ** 6), miniRappel: i % 2 === 0 });
      const d = decoder(c.code);
      const c2 = composer(d);
      const rendu = rendrePanache(c, { base: 'http://x/' });
      memeHTML += rendu === rendrePanache(c2, { base: 'http://x/' }) && rendu === rendrePanache(composer({ notions, graine: c.graine, miniRappel: i % 2 === 0 }), { base: 'http://x/' }) ? 1 : 0;
      ordre += c.feuilles.flatMap((f) => f.notions.map((x) => ids.indexOf(x.id))).every((x, k, t) => !k || x > t[k - 1]) ? 1 : 0;
    }
  }
  verifier(memeHTML === tot, `composition : même code, même HTML (${memeHTML}/${tot})`);
  verifier(ordre === tot, 'composition : les notions suivent l’ordre de FICHES');
  const base = [{ id: 'ce2-addition-posee' }, { id: 'ce2-heures' }];
  const a1 = composer({ notions: base, graine: 1000 }), a2 = composer({ notions: base, graine: 1001 });
  verifier(rendrePanache(a1) !== rendrePanache(a2), 'composition : une autre graine donne d’autres nombres');
  const avec3 = composer({ notions: [...base, { id: 'ce2-longueurs' }], graine: 1000 });
  verifier(a1.feuilles[0].blocs[0].eleve === avec3.feuilles[0].blocs[0].eleve, 'composition : une notion garde ses nombres quand on en ajoute une autre');
  const derivees = new Set(ids.map((_, i) => graineDerivee(77, i)));
  verifier(derivees.size === ids.length && [...derivees].every((g) => g >= 0 && g < 36 ** 6), 'composition : graines dérivées distinctes, sur 6 caractères base 36');
  const sansDoublon = composer({ notions: [{ id: 'ce2-heures' }, { id: 'ce2-heures' }, { id: 'ce2-monnaie', options: { centimes: 'bidon' } }], graine: 3 });
  verifier(sansDoublon.notions.length === 2 && sansDoublon.notions[0].options.centimes === optionsParDefaut(FICHES.find((f) => f.id === 'ce2-monnaie')).centimes,
    'composition : doublons écartés, option invalide remplacée par la valeur par défaut');
  const monnaie = composer({ notions: [{ id: 'ce2-monnaie', options: { centimes: 'oui' } }, { id: 'ce2-heures', options: { minutes: 'quarts' } }], graine: 9 });
  verifier(decoder(monnaie.code).notions.map((n) => JSON.stringify(n.options)).join() === '{"centimes":"oui"},{"minutes":"quarts"}', 'composition : les options propres de chaque notion voyagent dans le code');
}

/* 4. Corrigé = exercices affichés, numérotation, consignes --------- */

{
  let bons = 0, tot = 0, numerotes = 0, consignes = 0, uniques = 0, sansReponse = 0;
  for (let n = 2; n <= 5; n++) {
    for (let i = 0; i < 5; i++) {
      tot++;
      const c = composer({ notions: selection(n), graine: Math.floor(alea() * 36 ** 6), miniRappel: i % 2 === 1 });
      const d = doc(rendrePanache(c, { base: 'http://x/' }));
      const eleves = [...d.querySelectorAll('.feuille:not(.feuille--corrige)')], corriges = [...d.querySelectorAll('.feuille--corrige')];
      const titresDe = (el) => [...el.querySelectorAll('h2')].map((h) => h.textContent.replace(/\s+/g, ' ').trim());
      if (eleves.length === corriges.length && eleves.length === c.feuilles.length
        && eleves.every((e, k) => JSON.stringify(titresDe(e)) === JSON.stringify(titresDe(corriges[k])) && titresDe(e).length === c.feuilles[k].blocs.length)) bons++;
      if (eleves.every((e) => titresDe(e).every((t, k) => t.startsWith(`Exercice ${k + 1} — `) && t.length > 18))) numerotes++;
      if (eleves.every((e, k) => c.feuilles[k].blocs.every((b) => b.consigne.length > 3))) consignes++;
      // aucun identifiant en double sur une page (les dessins de plusieurs fiches cohabitent)
      if ([...eleves, ...corriges].every((p) => { const x = [...p.querySelectorAll('[id]')].map((e) => e.id); return new Set(x).size === x.length; })) uniques++;
      // la page élève ne contient pas de réponse en rouge, le corrigé en contient
      if (eleves.every((e) => !e.querySelector('.reponse, .rouge')) && corriges.every((e) => e.querySelector('.reponse, .rouge'))) sansReponse++;
    }
  }
  verifier(bons === tot, `rendu : corrigé = exercices affichés, mêmes titres dans le même ordre (${bons}/${tot})`);
  verifier(numerotes === tot, 'rendu : numérotation « Exercice 1 — consigne », « Exercice 2 — … » continue sur chaque feuille');
  verifier(consignes === tot, 'rendu : chaque bloc a sa consigne');
  verifier(uniques === tot, 'rendu : aucun identifiant en double sur une page');
  verifier(sansReponse === tot, 'rendu : pas de réponse sur la page élève, des réponses sur le corrigé');

  const c = composer({ notions: ['ce2-soustraction-posee', 'ce2-heures', 'ce2-longueurs', 'ce2-fractions-lire'].map((id) => ({ id })), graine: 424242, miniRappel: true });
  const d = doc(rendrePanache(c, { base: 'http://x/' }));
  const [eleve, corrige] = [...d.querySelectorAll('.feuille')];
  verifier(eleve.querySelector('.feuille__titre').textContent.trim() === 'Révision : soustraction posée · fractions : lire · longueurs · heures', `rendu : titre « ${eleve.querySelector('.feuille__titre').textContent.trim()} »`);
  verifier(eleve.querySelector('.feuille__domaine').textContent.includes('Révision') && eleve.querySelector('.feuille__code').textContent.trim() === c.code, 'rendu : domaine « Révision » et code de la feuille');
  verifier(eleve.querySelector('.feuille__qr svg') && eleve.innerHTML.includes('Nom :'), 'rendu : QR code et ligne Nom / Date sur la page élève');
  verifier(eleve.querySelectorAll('.rappels li').length === 4 && [...eleve.querySelectorAll('.rappels li')].every((li, k) => li.textContent.includes(c.feuilles[0].blocs[k].objectif)), 'rendu : une ligne de mini-rappel par notion (son objectif)');
  verifier(!corrige.querySelector('.rappels') && !corrige.innerHTML.includes('Nom :') && corrige.querySelector('.feuille__qr svg'), 'rendu : le corrigé n’a ni mini-rappel ni ligne Nom / Date, mais un QR code');
  const sansRappel = doc(rendrePanache(composer({ notions: c.notions, graine: 424242, miniRappel: false }))).querySelector('.feuille');
  verifier(!sansRappel.querySelector('.rappels'), 'rendu : sans mini-rappel, pas de lignes de rappel');
  const options = (o) => doc(rendrePanache(c, o)).querySelectorAll('.feuille').length;
  verifier(options({}) === 2 && options({ corrige: false }) === 1 && options({ eleve: false }) === 1 && !doc(rendrePanache(c, { eleve: false })).querySelector('.feuille:not(.feuille--corrige)'), 'rendu : mêmes options que rendre (corrige, eleve)');
  verifier(!doc(rendrePanache(c, { identite: false })).body.textContent.includes('Nom :'), 'rendu : identite: false retire la ligne Nom / Date');
  verifier(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(eleve.textContent + corrige.textContent), 'rendu : pas d’emoji sur la feuille');
}

/* 5. Budget de hauteur ---------------------------------------------- */

{
  let pages = 0, pires = 0, max5 = 0, maxCorrige = 0;
  for (let n = 2; n <= 5; n++) {
    for (let i = 0; i < 20; i++) {
      const c = composer({ notions: selection(n), graine: Math.floor(alea() * 36 ** 6), miniRappel: i % 2 === 0 });
      for (const f of c.feuilles) {
        pages++;
        const eleve = HAUTEURS_PAGE.enteteEleve + (f.miniRappel ? 6 : 0) + f.blocs.reduce((s, b) => s + b.hauteur + (f.miniRappel ? HAUTEURS_RAPPEL[b.ficheId] : 0), 0);
        const corrige = HAUTEURS_PAGE.enteteCorrige + f.blocs.reduce((s, b) => s + b.hauteurCorrige, 0);
        if (eleve <= HAUTEUR_PAGE && corrige <= HAUTEUR_PAGE) pires++;
        if (f.notions.length <= NOTIONS_MAX) max5++;
        if (f.notions.length === f.blocs.length) maxCorrige++;
      }
    }
  }
  verifier(pires === pages, `budget : la somme des hauteurs tient dans ${HAUTEUR_PAGE} px, page élève et corrigé (${pires}/${pages} feuilles, 2 à 5 notions × 20 tirages)`);
  verifier(max5 === pages && maxCorrige === pages, 'budget : jamais plus de 5 notions par feuille, un bloc par notion');

  // Les cinq blocs les plus hauts : une feuille ne déborde jamais, quitte à être coupée
  const hautes = [...ids].sort((a, b) => Math.max(...HAUTEURS_BLOCS[b].eleve.slice(0, 1)) - Math.max(...HAUTEURS_BLOCS[a].eleve.slice(0, 1))).slice(0, 5).map((id) => ({ id }));
  const lourde = composer({ notions: hautes, graine: 1, miniRappel: true });
  const somme = (f) => HAUTEURS_PAGE.enteteEleve + f.blocs.reduce((s, b) => s + b.hauteur, 0);
  verifier(lourde.feuilles.every((f) => f.blocs.length === 1 || somme(f) <= HAUTEUR_PAGE), 'budget : même avec les cinq blocs les plus hauts, rien ne déborde');

  // Mini-rappel retiré avant de reporter : on construit une sélection où il fait déborder
  let retire = null;
  for (let essai = 0; essai < 300 && !retire; essai++) {
    const notions = selection(5);
    const avec = composer({ notions, graine: essai, miniRappel: true });
    const sans = composer({ notions, graine: essai, miniRappel: false });
    if (avec.feuilles.length === 1 && !avec.feuilles[0].miniRappel && sans.feuilles.length === 1) retire = avec;
  }
  verifier(!!retire && !doc(rendrePanache(retire)).querySelector('.rappels'), 'budget : quand le mini-rappel fait déborder, il est retiré avant de reporter une notion');

  // Huit notions : plusieurs feuilles
  const huit = FICHES.slice(0, 8).map((f) => ({ id: f.id }));
  const h = composer({ notions: huit, graine: 8, miniRappel: true });
  const toutes = h.feuilles.flatMap((f) => f.notions.map((n) => n.id));
  verifier(h.feuilles.length >= 2 && h.feuilles.length <= 3 && toutes.join() === huit.map((x) => x.id).join(), `report : 8 notions sur ${h.feuilles.length} feuilles, chacune une seule fois et dans l’ordre`);
  const dh = doc(rendrePanache(h, { base: 'http://x/' }));
  const nbPages = dh.querySelectorAll('.feuille').length;
  verifier(nbPages === 2 * h.feuilles.length && dh.querySelectorAll('.feuille--corrige').length === h.feuilles.length
    && [...dh.querySelectorAll('.feuille')].slice(0, h.feuilles.length).every((p) => !p.classList.contains('feuille--corrige')),
  'report : élève 1, élève 2, …, puis les corrigés');
  verifier(h.feuilles.every((f) => f.code === h.code) && [...dh.querySelectorAll('.feuille__code')].every((e) => e.textContent.trim() === h.code), 'report : toutes les feuilles portent le même code');
  verifier(dh.querySelector('.feuille__domaine').textContent.includes(`feuille 1 sur ${h.feuilles.length}`), 'report : « feuille 1 sur n » dans l’en-tête');
  verifier(h.feuilles.every((f) => f.blocs.length <= NOTIONS_MAX), 'report : jamais plus de 5 notions par feuille');
  const douze = composer({ notions: ids.map((id) => ({ id })), graine: 12, miniRappel: false });
  verifier(douze.feuilles.length >= 4 && douze.feuilles.flatMap((f) => f.notions).length === FICHES.length, `report : les ${FICHES.length} notions se répartissent sur ${douze.feuilles.length} feuilles`);
}

/* 6. Dans l'application -------------------------------------------- */

async function ouvrir(recherche, profil) {
  const dom = new JSDOM(HTML, { url: `http://localhost/index.html${recherche}` });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  if (profil) window.localStorage.setItem('mathoo.v1', JSON.stringify(profil));
  await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  return window.document;
}

{
  const compo = composer({ notions: ['ce2-soustraction-posee', 'ce2-heures', 'ce2-longueurs', 'ce2-fractions-lire'].map((id) => ({ id })), graine: 555, miniRappel: true });
  const attendu = (opts) => doc(rendrePanache(compo, opts));

  // Lien du corrigé, sans profil
  let d = await ouvrir(`?fiche=${compo.code}&vue=corrige`, null);
  let feuilles = d.querySelectorAll('.feuille');
  verifier(feuilles.length === compo.feuilles.length && [...feuilles].every((f) => f.classList.contains('feuille--corrige')), 'appli : ?fiche=Z…&vue=corrige ouvre les corrigés seuls');
  verifier(!d.querySelector('#commencer') && !d.body.textContent.includes('Nom :'), 'appli : sans profil, sans écran de création ; pas de ligne Nom / Date sur le corrigé');
  verifier(d.querySelector('.feuille__code').textContent.trim() === compo.code, 'appli : c’est bien la même feuille panachée');
  verifier([...d.querySelectorAll('.feuille h2')].map((h) => h.textContent).join() === [...attendu({ eleve: false }).querySelectorAll('.feuille h2')].map((h) => h.textContent).join(), 'appli : mêmes exercices que la composition directe');
  verifier(!d.querySelector('[data-fiche-option]') && !d.querySelector('[data-nb-feuilles]') && !d.querySelector('[data-affichage="methode"]'), 'appli : les réglages propres aux fiches simples sont masqués');

  // Lien de la feuille de l'enfant
  d = await ouvrir(`?fiche=${compo.code}&vue=eleve`, null);
  feuilles = d.querySelectorAll('.feuille');
  verifier(feuilles.length === compo.feuilles.length && !d.querySelector('.feuille--corrige') && d.querySelectorAll('.reponse').length === 0, 'appli : ?vue=eleve : les exercices seuls, sans réponse');
  verifier(d.querySelector('.feuille__qr').innerHTML.length > 500 && d.querySelectorAll('.rappels li').length === 4, 'appli : QR code et mini-rappels présents');

  // Écran des fiches avec profil : liens, corrigé, réglages Nom / Date
  const profil = { prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [], serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {} };
  d = await ouvrir(`?fiche=${compo.code}`, profil);
  const clic = (sel) => d.querySelector(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  verifier(d.querySelectorAll('.feuille').length === 2 * compo.feuilles.length, 'appli : sans précision, feuille et corrigé');
  const lienCorrige = d.querySelector('#lien-corrige').value, lienFiche = d.querySelector('#lien-fiche').value;
  verifier(lienCorrige.includes(`fiche=${compo.code}`) && lienCorrige.includes('vue=corrige') && lienFiche.includes(`fiche=${compo.code}`) && !lienFiche.includes('methode'), `appli : les liens portent le code Z (${lienCorrige.replace('http://localhost/', '…/')})`);
  verifier(!lienCorrige.includes('Lina'), 'appli : aucune donnée personnelle dans le lien');
  clic('[data-affichage="identite"][data-valeur="non"]');
  verifier(!d.querySelector('#impression').textContent.includes('Nom :') && d.querySelectorAll('.feuille').length === 2, 'appli : réglage Nom / Date : la ligne disparaît, la feuille reste panachée');
  clic('[data-affichage="corrige"][data-valeur="non"]');
  verifier(d.querySelectorAll('.feuille').length === 1 && d.querySelector('.feuille__code').textContent.trim() === compo.code, 'appli : réglage Corrigé : sans corrigé, même feuille');
  clic('[data-affichage="eleve"][data-valeur="non"]');
  verifier(d.querySelector('.feuille--corrige') && !d.querySelector('.feuille:not(.feuille--corrige)'), 'appli : « Corrigé seul » ne montre que les corrigés');
  clic('[data-affichage="eleve"][data-valeur="oui"]');
  clic('.ariane__pas[data-pas="2"]');
  clic('#regenerer');
  clic('[data-pas="3"]:not(.ariane__pas)');
  verifier(d.querySelector('.feuille__code').textContent.trim() !== compo.code && decoder(d.querySelector('.feuille__code').textContent).panache === true, 'appli : « Autres exercices » refait une feuille panachée (nouvelle graine)');

  // Retrouver par la saisie du code, puis revenir aux fiches simples
  d.querySelector('#code-fiche').value = compo.code.toLowerCase();
  clic('#retrouver');
  verifier(d.querySelector('.feuille__code').textContent.trim() === compo.code, 'appli : la saisie du code Z… retrouve la feuille panachée');
  const ancien = tirer(FICHES[0], optionsParDefaut(FICHES[0]), 4242).code;
  d.querySelector('#code-fiche').value = ancien;
  clic('#retrouver');
  verifier(d.querySelector('.feuille__code').textContent.trim() === ancien && !d.querySelector('.feuille--panache'), 'appli : un ancien code retrouve la fiche simple');
  d.querySelector('#code-fiche').value = compo.code;
  clic('#retrouver');
  clic('.ariane__pas[data-pas="1"]');
  const cochees = [...d.querySelectorAll('[data-fiche]:checked')];
  verifier(cochees.length === 4, 'appli : « Retour » recoche les quatre notions de la feuille panachée');
  cochees.slice(1).forEach((c) => clic(`[data-fiche="${c.dataset.fiche}"]`));
  clic('.barre-pas [data-pas]'); clic('[data-pas="3"]:not(.ariane__pas)');
  verifier(!decoder(d.querySelector('.feuille__code').textContent).panache && !d.querySelector('.feuille--panache'), 'appli : une seule notion cochée redonne la fiche simple');

  // Ancien lien toujours valable
  d = await ouvrir(`?fiche=${ancien}&vue=corrige`, null);
  verifier(d.querySelectorAll('.feuille--corrige').length === 1 && d.querySelector('.feuille__code').textContent.trim() === ancien, 'appli : un lien à une fiche de l’ancien format s’ouvre toujours');
  d = await ouvrir(`?fiche=Z999-ZZZZ-ZZZZ`, null);
  verifier(!d.querySelector('.feuille'), 'appli : un code Z invalide n’ouvre rien');
}

process.exit(echecs ? 1 : 0);
