// Mathoo — application monopage (CP, CE1, CE2).
// Règle d'or : on ne dit jamais à l'enfant qu'il a « faux ». On dit « pas encore »
// et on lui montre l'astuce, puis on lui redonne sa chance.

import { CLASSES, CLASSE_DEFAUT, classeParId, modulesDe, moduleParId, cle, serie } from './exercices.js';
import * as P from './progression.js';
import * as Son from './son.js';
import { zigo, phrase, carte, jardin, LIEUX, DECORS, decorParId } from './univers.js';
import * as A11y from './accessibilite.js';
import { FICHES, DOMAINES, fichesDe, ficheParId, optionsParDefaut, tirer, decoder, rendre as rendreFiche } from './fiches.js';
import { composer, rendrePanache, NOTIONS_MAX } from './panache.js';
import { visuel } from './visuels.js';
import { shuffle, pick, leurres } from './utils.js';

const app = document.getElementById('app');
const AVATARS = ['🦊', '🐼', '🐨', '🦁', '🐙', '🦉', '🐢', '🦄', '🐝', '🐬', '🦕', '🐧'];

const BRAVOS = [
  'Bravo, c’est exactement ça !', 'Super ! Tu as trouvé !', 'Génial, continue comme ça !',
  'Bien joué, champion·ne !', 'Parfait ! Une étoile de plus !', 'Excellent, tu assures !',
  'Oui ! Tu progresses vraiment !',
];
const ENCOURAGEMENTS = [
  'Pas encore — et c’est normal, on apprend !', 'Presque ! Regarde l’astuce :',
  'C’est en cherchant qu’on apprend. Voici le truc :', 'Bonne tentative ! On regarde ensemble :',
  'Tu y es presque, regarde :',
];

let vue = { nom: 'accueil' };
let session = null;
// { id, options, affichage: { corrige, methode, identite, nb }, contenus }
// Les contenus ne sont retirés que sur demande : le reste ne fait que changer l'affichage.
let fiche = null;
let panache = null;   // feuille panachée affichée à la place de la fiche simple (voir panache.js)

const classeCourante = () => classeParId(P.get().classe || CLASSE_DEFAUT);
const nomLieu = (moduleId, secours) => (LIEUX[moduleId] || {}).lieu || secours;

Son.setActif(P.get().son !== false);

// Réglages d'accessibilité : appliqués avant tout affichage.
let reglages = A11y.appliquer(P.get().reglages);
const nbQuestions = () => A11y.tailleSerie(reglages);

// Zigo dans sa bulle : il accompagne l'enfant sur tous les écrans.
function bulle(texte, humeur = 'normal', taille = 92) {
  return `
    <div class="compagnon">
      ${zigo(humeur, taille)}
      <div class="bulle">${texte}</div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Utilitaires d'affichage                                             */
/* ------------------------------------------------------------------ */

const echappe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function normalise(v) {
  return String(v).toLowerCase().trim()
    .replace(/’/g, "'")
    .replace(/\s| | /g, '')
    .replace(/€|cm|min|^l'|^le|^la|^d'/g, '');
}

// Lecture de l'énoncé à voix haute : précieux au CP, où la lecture est encore lente.
function lire(texte) {
  if (!('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const voix = new SpeechSynthesisUtterance(texte.replace(/\?$/, ' ?').replace(/×/g, ' fois ').replace(/−/g, ' moins ').replace(/\+/g, ' plus ').replace(/÷/g, ' divisé par '));
    voix.lang = 'fr-FR';
    voix.rate = 0.9;
    speechSynthesis.speak(voix);
  } catch { /* pas de synthèse vocale sur cet appareil : tant pis */ }
}

function confettis() {
  if (!A11y.animationsActives(reglages)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const couleurs = ['#6C5CE7', '#00B894', '#FDCB6E', '#E84393', '#0984E3', '#E17055'];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = pick(couleurs);
    c.style.animationDuration = 1.1 + Math.random() * 0.9 + 's';
    c.style.animationDelay = Math.random() * 0.25 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

function entete(sousTitre) {
  const e = P.get();
  return `
    <header class="entete">
      <div class="entete__avatar">${e.avatar || '🦊'}</div>
      <div class="entete__texte">
        <div class="entete__bonjour">Salut ${echappe(e.prenom || 'toi')} !</div>
        <div class="entete__sous">${sousTitre}</div>
      </div>
      <button class="pastille" data-aller="progres" title="Mes progrès">⭐ ${e.etoiles}</button>
    </header>`;
}

/* ------------------------------------------------------------------ */
/* Écran : profil (premier lancement)                                  */
/* ------------------------------------------------------------------ */

function vueProfil() {
  const e = P.get();
  app.innerHTML = `
    <div class="heros">
      <h1>Bienvenue dans Mathoo 🎉</h1>
      <p>Les maths du primaire, en jeu, à ton rythme. Ici, on n’a jamais « faux » : on a juste
      des choses qu’on n’a <strong>pas encore</strong> apprises.</p>
    </div>
    <div class="carte">
      <h2>Comment tu t’appelles ?</h2>
      <input class="champ" id="prenom" maxlength="14" placeholder="Ton prénom" value="${echappe(e.prenom)}" />

      <h2 style="margin-top:22px">Tu es en quelle classe ?</h2>
      <div class="classes">
        ${CLASSES.map((c) => `
          <button class="classe-choix" data-classe="${c.id}" aria-pressed="${c.id === (e.classe || CLASSE_DEFAUT)}">
            <span class="classe-choix__emoji">${c.emoji}</span>
            <span class="classe-choix__nom">${c.nom}</span>
            <span class="classe-choix__age">${c.age}</span>
          </button>`).join('')}
      </div>

      <h2 style="margin-top:22px">Choisis ton avatar</h2>
      <div class="avatars">
        ${AVATARS.map((a) => `<button class="avatar-choix" data-avatar="${a}" aria-pressed="${a === (e.avatar || '🦊')}">${a}</button>`).join('')}
      </div>
      <button class="btn btn--large btn--vert" id="commencer">C’est parti ! 🚀</button>
    </div>
    <div class="pied-page">
      <button class="btn btn--fantome" data-aller="reglages">⚙️ Réglages et confort de lecture</button>
    </div>`;

  let avatar = e.avatar || '🦊';
  let classe = e.classe || CLASSE_DEFAUT;

  const groupe = (sel, maj) => app.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => {
    maj(b);
    app.querySelectorAll(sel).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  groupe('[data-avatar]', (b) => { avatar = b.dataset.avatar; });
  groupe('[data-classe]', (b) => { classe = b.dataset.classe; });

  app.querySelector('#commencer').addEventListener('click', () => {
    const prenom = app.querySelector('#prenom').value.trim() || 'champion';
    P.setProfil({ prenom, avatar, classe });
    aller({ nom: 'accueil' });
  });
}

/* ------------------------------------------------------------------ */
/* Écran : accueil                                                     */
/* ------------------------------------------------------------------ */

function vueAccueil() {
  const e = P.get();
  const c = classeCourante();
  const serieTxt = e.serieJours > 1 ? `🔥 ${e.serieJours} jours d’affilée, bravo !` : 'Ton île t’attend !';

  app.innerHTML = `
    ${entete(serieTxt)}
    ${bulle(phrase('accueil'), 'joie')}
    <div class="carte-ile">
      <div class="carte-ile__bandeau">${c.emoji} L’île des Nombres — programme de ${c.nom}</div>
      ${carte(modulesDe(c.id), (id) => P.statsModule(cle(c.id, id)))}
      <p class="carte-ile__aide">Touche un endroit de la carte pour y aller.</p>
    </div>
    <div class="rangee-actions">
      <button class="btn btn--vert" data-jouer="melange">🎒 Faire le tour de l’île</button>
      <button class="btn btn--jaune" data-aller="jardin">🌻 Mon jardin</button>
      <button class="btn btn--jaune" data-aller="fiches">🖨️ Fiches à imprimer</button>
    </div>
    <div class="pied-page">
      <button class="btn btn--fantome" data-aller="progres">📊 Mes progrès</button>
      <button class="btn btn--fantome" data-aller="profil">✏️ Ma classe et mon avatar</button>
      <button class="btn btn--fantome" data-aller="reglages">⚙️ Réglages et confort de lecture</button>
      <button class="btn btn--fantome" id="son">${e.son === false ? '🔇 Sons coupés' : '🔊 Sons activés'}</button>
    </div>`;

  app.querySelector('#son').addEventListener('click', (ev) => {
    const actif = P.basculerSon();
    Son.setActif(actif);
    ev.currentTarget.textContent = actif ? '🔊 Sons activés' : '🔇 Sons coupés';
    if (actif) Son.jouer('clic');
  });
}

/* ------------------------------------------------------------------ */
/* Écran : le jardin de Zigo                                           */
/* ------------------------------------------------------------------ */

function vueJardin() {
  const e = P.get();
  const dispo = P.etoilesDisponibles();

  app.innerHTML = `
    ${entete(`Tu as ${dispo} étoile${dispo > 1 ? 's' : ''} à planter`)}
    ${bulle(phrase('jardin'), 'doux', 78)}
    <div class="carte" style="padding:0;overflow:hidden">
      ${jardin(e.jardin)}
    </div>
    ${e.jardin.length === 0 ? '<p class="note">Ton jardin est encore tout vide : gagne des étoiles et plante ta première fleur !</p>' : ''}
    <div class="section-titre">La boutique de graines</div>
    <div class="grille grille--boutique">
      ${DECORS.map((d) => {
        const possible = dispo >= d.prix;
        const nb = e.jardin.filter((x) => x === d.id).length;
        return `
        <button class="graine ${possible ? '' : 'graine--attente'}" data-decor="${d.id}">
          <span class="graine__emoji">${d.emoji}</span>
          <span class="graine__nom">${d.nom}</span>
          <span class="graine__prix">${possible ? `⭐ ${d.prix}` : `encore ${d.prix - dispo} ⭐`}</span>
          ${nb ? `<span class="graine__nb">×${nb}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    <div class="pied-page">
      <button class="btn btn--large btn--vert" data-jouer="melange">Gagner des étoiles ▶</button>
      <button class="btn btn--fantome" data-aller="accueil">← Retour à l’île</button>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Écran : fiches de révision à imprimer                               */
/* ------------------------------------------------------------------ */

// Le tunnel : 1 Que réviser (cases à cocher) → 2 Composer → 3 Imprimer et partager.
// L'état vit dans `fiche`, étendu :
//   id, options, affichage, contenus   la fiche simple (une seule notion cochée)
//   selection                          les identifiants des notions cochées
//   optionsNotions                     les options choisies, notion par notion
//   compo                              { miniRappel, rotation, graines } pour une feuille panachée
//   valide                             la composition correspond-elle à la sélection ?
//   arrivee                            ouvert par un lien ou un QR code (le retour remonte au pas 1)
// `retirer` : faut-il piocher de nouveaux exercices ? Non quand on change simplement
// l'affichage du corrigé — l'enfant garde exactement la fiche qu'il a sous les yeux.
const AFFICHAGE_DEFAUT = { corrige: true, methode: true, identite: true, eleve: true, nb: 1 };
const graineAlea = () => Math.floor(Math.random() * 36 ** 6);

function preparerFiche({ id, options, affichage, retirer = false, graines } = {}) {
  const f = ficheParId(id || (fiche && fiche.id)) || FICHES[0];
  const memeFiche = fiche && fiche.id === f.id;
  const opts = options || (memeFiche ? fiche.options : optionsParDefaut(f));
  const aff = { ...(fiche ? fiche.affichage : AFFICHAGE_DEFAUT), ...affichage };

  let contenus;
  if (graines) {
    contenus = graines.map((g) => tirer(f, opts, g));
    aff.nb = contenus.length;
  } else if (retirer || !memeFiche) {
    contenus = Array.from({ length: aff.nb }, () => tirer(f, opts));
  } else {
    // On garde les feuilles déjà affichées et on complète si l'on en demande plus.
    contenus = fiche.contenus.slice(0, aff.nb);
    while (contenus.length < aff.nb) contenus.push(tirer(f, opts));
  }
  fiche = {
    selection: [], optionsNotions: {}, compo: { miniRappel: false, rotation: false, graines: [] }, valide: false, arrivee: false,
    ...fiche, id: f.id, options: opts, affichage: aff, contenus,
  };
}

// Adresse de l'application, pour que le QR code de la fiche y ramène.
const baseURL = () => window.location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');

// Lien partageable vers une ou plusieurs feuilles. Tout tient dans l'adresse :
// aucun compte, aucun serveur, rien à stocker — et aucune donnée sur l'enfant.
function lienFiche({ codes, vue, methode, identite } = {}) {
  const p = new URLSearchParams();
  const liste = codes || (panache ? panache.codes : fiche.contenus.map((c) => c.code));
  p.set(liste.length > 1 ? 'fiches' : 'fiche', liste.join(','));
  if (vue) p.set('vue', vue);
  const aff = fiche.affichage;
  if (!panache && !(methode ?? aff.methode)) p.set('methode', '0');
  if (!(identite ?? aff.identite)) p.set('nom', '0');
  // Les virgules restent lisibles dans l'adresse : un lien se relit, se dicte, se colle.
  return `${baseURL()}?${p.toString().replace(/%2C/g, ',')}`;
}

const ficheHTML = () => (panache
  ? rendrePanache(panache.feuilles, { ...fiche.affichage, base: baseURL() })
  : rendreFiche(ficheParId(fiche.id), fiche.contenus, { ...fiche.affichage, base: baseURL() }));

const codesAffiches = () => (panache ? panache.codes : fiche.contenus.map((c) => c.code));

/* --- Composition ---------------------------------------------------- */

// Plusieurs feuilles qui « tournent » : chacune prend une fenêtre de la sélection, la suivante
// commence là où la précédente s'arrête (toutes les notions passent, cinq au plus par feuille).
function fenetre(ids, k) {
  const n = ids.length;
  const t = n > NOTIONS_MAX ? NOTIONS_MAX : Math.min(n, Math.max(2, Math.ceil(n / 2)));
  return Array.from({ length: t }, (_, i) => ids[(k * t + i) % n]);
}

// plans : [{ notions: [{ id, options }], graine, miniRappel }]
function construirePanache(plans) {
  const compos = plans.map((p) => composer({ notions: p.notions, graine: p.graine, miniRappel: p.miniRappel }));
  const codes = [...new Set(compos.map((c) => c.code))];
  const vus = new Map();
  compos.forEach((c) => c.notions.forEach((n) => vus.set(n.id, n)));
  const notions = FICHES.filter((f) => vus.has(f.id)).map((f) => vus.get(f.id));
  panache = { compos, feuilles: compos.flatMap((c) => c.feuilles), codes, code: codes[0], notions, miniRappel: compos[0].miniRappel };
}

const idsCoches = () => FICHES.map((f) => f.id).filter((id) => fiche.selection.includes(id));
const optionsDeNotion = (id) => ({ ...optionsParDefaut(ficheParId(id)), ...fiche.optionsNotions[id] });

// Fabrique la fiche ou la feuille panachée qui correspond à la sélection.
function composerSelection({ retirer = false } = {}) {
  const ids = idsCoches();
  if (ids.length === 1) {
    panache = null;
    preparerFiche({ id: ids[0], options: optionsDeNotion(ids[0]), retirer });
  } else {
    const c = fiche.compo;
    const nb = fiche.affichage.nb;
    if (retirer || c.graines.length !== nb) c.graines = Array.from({ length: nb }, graineAlea);
    construirePanache(c.graines.map((graine, k) => ({
      graine, miniRappel: c.miniRappel,
      notions: (c.rotation && nb > 1 ? fenetre(ids, k) : ids).map((id) => ({ id, options: optionsDeNotion(id) })),
    })));
  }
  fiche.valide = true;
}

// Ouvre ce que décrivent un ou plusieurs codes (QR code, lien, saisie) et en déduit la sélection :
// « Retour » remonte alors au pas 1 avec les bonnes cases cochées.
function ouvrirCodes(trouves, affichage) {
  if (trouves[0].panache) {
    preparerFiche({ affichage: { ...affichage, nb: trouves.length } });
    construirePanache(trouves.map((t) => ({ notions: t.notions, graine: t.graine, miniRappel: t.miniRappel })));
  } else {
    panache = null;
    preparerFiche({ id: trouves[0].fiche.id, options: trouves[0].options, graines: trouves.map((t) => t.graine), affichage });
  }
  const optionsNotions = {};
  const ids = new Set();
  const ensembles = new Set();
  for (const t of trouves) {
    const notions = t.panache ? t.notions : [{ id: t.fiche.id, options: t.options }];
    notions.forEach((n) => { ids.add(n.id); optionsNotions[n.id] = n.options; });
    ensembles.add(notions.map((n) => n.id).sort().join());
  }
  fiche.selection = [...ids];
  fiche.optionsNotions = optionsNotions;
  fiche.compo = { miniRappel: !!trouves[0].miniRappel, rotation: ensembles.size > 1, graines: trouves.map((t) => t.graine) };
  fiche.valide = true;
}

// Retrouve une fiche déjà imprimée à partir de son code (ou de son QR code).
function retrouverFiche(code) {
  const trouve = decoder(code);
  if (!trouve) return false;
  ouvrirCodes([trouve]);
  return true;
}

/* --- Pas et adresse -------------------------------------------------- */

// Le pas courant est dans l'adresse (?pas=2) : le bouton retour du navigateur marche.
const adressePas = (n) => `${window.location.pathname}?pas=${n}`;

// Un pas au-delà du premier n'a de sens qu'avec au moins une notion cochée.
function pasPossible(n) {
  return n > 1 && fiche && fiche.selection.length ? Math.min(3, n) : 1;
}

function afficherPas(n) {
  const pas = pasPossible(n);
  if (pas > 1) {
    if (!fiche.valide) composerSelection({ retirer: true });
    if (pas === 2) fiche.arrivee = false;
  }
  vue = { nom: 'fiches', pas };
  return pas;
}

function allerPas(n) {
  const pas = afficherPas(n);
  if (window.location.search !== `?pas=${pas}`) window.history.pushState({ pas }, '', adressePas(pas));
  rendre();
  window.scrollTo(0, 0);
}

// Le pas précédent ; depuis un lien ou un QR code, on remonte tout en haut, à la liste des notions.
const pasPrecedent = () => (vue.pas === 3 && fiche.arrivee ? 1 : vue.pas - 1);

window.addEventListener('popstate', () => {
  const pas = Number(new URLSearchParams(window.location.search).get('pas'));
  if (pas) {
    afficherPas(pas);
    rendre();
  } else if (vue.nom === 'fiches') {
    vue = { nom: 'accueil' };
    rendre();
  }
  window.scrollTo(0, 0);
});

// Un changement de réglage ne fait pas sauter la page.
function rafraichir() {
  const y = window.scrollY;
  vueFiches();
  window.scrollTo(0, y);
}

const URL_DEPOT = 'https://github.com/Eric-D/ZIGTOP/blob/main/';

const ETAPES = ['Que réviser', 'Composer', 'Imprimer'];

function ariane(pas) {
  const permis = fiche && fiche.selection.length > 0;
  return `
    <nav class="ariane" aria-label="Les trois pas">
      <ol>${ETAPES.map((nom, i) => `
        <li><button class="ariane__pas" data-pas="${i + 1}" ${i + 1 === pas ? 'aria-current="step"' : ''}
                    ${i > 0 && !permis ? 'disabled' : ''}><span class="ariane__num">${i + 1}</span> ${nom}</button></li>`).join('')}
      </ol>
    </nav>`;
}

const boutonRetour = (pas) => (pas > 1
  ? `<button class="btn btn--fantome retour" data-pas="${pasPrecedent()}">← Retour</button>`
  : '<button class="btn btn--fantome retour" data-aller="accueil">← Retour</button>');

const nomsNotions = () => (panache ? panache.notions : [{ id: fiche.id }]).map((n) => ficheParId(n.id).court).join(' · ');

function pasReviser(c, liste, disponibles) {
  const n = fiche.selection.length;
  return `
      ${bulle('Coche ce que tu veux réviser : une leçon, et je fabrique sa fiche ; plusieurs, et je les mélange sur une même feuille. Avec son corrigé !', 'curieux', 78)}
      ${disponibles.length ? '' : `<p class="note">Pas encore de fiche pour le ${c.nom} — voici celles qui existent aujourd’hui.</p>`}
      ${DOMAINES.map((dom) => {
        const lignes = liste.filter((f) => f.domaine === dom);
        if (!lignes.length) return '';
        return `
      <div class="section-titre">${dom}</div>
      <div class="liste-fiches">
        ${lignes.map((f) => {
          const coche = fiche.selection.includes(f.id);
          return `
          <div class="fiche ${coche ? 'fiche--active' : ''}">
            <label class="fiche__choix">
              <input type="checkbox" class="fiche__case" data-fiche="${f.id}" ${coche ? 'checked' : ''} />
              <span class="fiche__emoji">${f.emoji}</span>
              <span class="fiche__texte">
                <span class="fiche__titre">${f.titre}</span>
                <span class="fiche__pages">p. ${f.pages}</span>
                <span class="fiche__objectif">${f.objectif}</span>
              </span>
            </label>
            <a class="fiche__lecon" href="${URL_DEPOT}${f.lecon}" target="_blank" rel="noopener">leçon</a>
            ${coche && (f.options || []).length ? `
            <div class="fiche__options">${f.options.map((o) => `
              <div class="reglage">
                <div class="reglage__libelle">${o.libelle}</div>
                <div class="reglage__options">${o.valeurs.map((v) => `
                  <button class="option" data-fiche-id="${f.id}" data-fiche-option="${o.id}" data-valeur="${v.v}"
                          aria-pressed="${optionsDeNotion(f.id)[o.id] === v.v}">${v.nom}</button>`).join('')}
                </div>
              </div>`).join('')}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
      }).join('')}
      <div class="barre-pas barre-pas--collante">
        <div class="barre-pas__compte" id="compte-notions" aria-live="polite">${n
          ? `${n} notion${n > 1 ? 's' : ''} choisie${n > 1 ? 's' : ''}` : 'Coche une ou plusieurs notions'}</div>
        <button class="btn btn--vert" data-pas="2" ${n ? '' : 'disabled'}>Continuer →</button>
      </div>
      <div class="pied-page"><button class="btn btn--fantome" data-aller="accueil">← Retour à l’île</button></div>`;
}

function pasComposer() {
  const aff = fiche.affichage;
  const n = fiche.selection.length;
  const c = fiche.compo;
  const bascule = (attr, id, titre, oui, non, vrai, aide) => `
    <div class="reglage">
      <div class="reglage__libelle">${titre}</div>
      <div class="reglage__options">
        <button class="option" data-${attr}="${id}" data-valeur="${oui[0]}" aria-pressed="${vrai}">${oui[1]}</button>
        <button class="option" data-${attr}="${id}" data-valeur="${non[0]}" aria-pressed="${!vrai}">${non[1]}</button>
      </div>
      ${aide ? `<div class="reglage__aide">${aide}</div>` : ''}
    </div>`;
  const codes = codesAffiches();
  return `
      <div class="section-titre">Composer ta feuille</div>
      <div class="carte reglages">
        <div class="reglage">
          <div class="reglage__libelle">${n > 1 ? 'Révision' : 'Fiche'} : ${nomsNotions()}</div>
          <div class="reglage__aide">${n > 1
            ? 'Un exercice par notion, pour t’entraîner à reconnaître la bonne méthode.'
            : 'La fiche complète : le rappel, puis des exercices du plus guidé au plus ouvert.'}</div>
        </div>
        ${n > 1
          ? bascule('compo', 'mini', 'Mini-rappel', ['oui', 'Avec'], ['non', 'Sans'], c.miniRappel,
            'Une ligne de rappel par exercice, en haut de la feuille.')
          : bascule('affichage', 'methode', 'Rappel de la méthode', ['oui', 'Avec'], ['non', 'Sans'], aff.methode,
            'Sans le rappel, la place libérée sert à plus d’exercices.')}
        <div class="reglage">
          <div class="reglage__libelle">Nombre de feuilles</div>
          <div class="reglage__options">
            ${[1, 2, 4, 6].map((k) => `
              <button class="option" data-nb-feuilles="${k}" aria-pressed="${aff.nb === k}">${k}</button>`).join('')}
          </div>
          <div class="reglage__aide">Chaque feuille a ses propres exercices et son propre code.</div>
        </div>
        ${n > 1 && aff.nb > 1 ? bascule('compo', 'rotation', 'Les feuilles', ['memes', 'Reprennent les mêmes notions'], ['tournent', 'Tournent sur les notions'], !c.rotation,
          '« Tournent » : chaque feuille prend quelques notions de ta sélection, la suivante prend les autres.') : ''}
      </div>

      <div class="section-titre">${codes.length > 1 ? 'Les codes' : 'Le code'} de ta composition</div>
      <div class="carte code-composition">
        <div class="code-grand" id="code-composition">${codes.map((k) => `<span>${k}</span>`).join('')}</div>
        <div class="reglage__aide">Ce code redonne exactement les mêmes exercices, et leur corrigé : note-le, ou garde-le sur la feuille imprimée.</div>
      </div>
      <div class="barre-fiche">
        <button class="btn btn--jaune" id="regenerer">🎲 Autres exercices</button>
      </div>
      <div class="barre-pas">
        <div class="barre-pas__compte">${panache ? panache.feuilles.length : fiche.contenus.length} feuille${(panache ? panache.feuilles.length : fiche.contenus.length) > 1 ? 's' : ''}</div>
        <button class="btn btn--vert" data-pas="3">Continuer →</button>
      </div>`;
}

function pasImprimer() {
  const aff = fiche.affichage;
  const bascule = (id, titre, oui, non, aide) => `
    <div class="reglage">
      <div class="reglage__libelle">${titre}</div>
      <div class="reglage__options">
        <button class="option" data-affichage="${id}" data-valeur="oui" aria-pressed="${aff[id]}">${oui}</button>
        <button class="option" data-affichage="${id}" data-valeur="non" aria-pressed="${!aff[id]}">${non}</button>
      </div>
      ${aide ? `<div class="reglage__aide">${aide}</div>` : ''}
    </div>`;
  const codes = codesAffiches();
  const n = (panache ? panache.feuilles.length : fiche.contenus.length) * ((aff.eleve ? 1 : 0) + (aff.corrige || !aff.eleve ? 1 : 0));
  return `
      <div class="section-titre">Réglages de la fiche</div>
      <div class="carte reglages">
        ${bascule('identite', 'Ligne « Nom / Date »', 'Avec', 'Sans', '')}
        ${bascule('corrige', 'Corrigé', 'Avec', 'Sans', 'Les corrigés s’impriment après les pages élève, à garder par l’adulte.')}
      </div>

      <div class="barre-fiche">
        <button class="btn btn--vert" id="imprimer">🖨️ Imprimer</button>
      </div>
      <div class="section-titre">Partager</div>
      <div class="carte reglages">
        <div class="reglage">
          <div class="reglage__libelle">Le corrigé, par un simple lien</div>
          <div class="reglage__aide">Tout est contenu dans l’adresse : la personne qui reçoit le lien
            voit la correction sans compte, sans installation, même des mois plus tard. Aucun prénom,
            aucune donnée sur l’enfant n’y figure.</div>
          <div class="lien-partage">
            <span class="lien-partage__etiquette">Corrigé seul</span>
            <input class="champ" id="lien-corrige" readonly value="${lienFiche({ vue: 'corrige' })}"
                   aria-label="Lien vers le corrigé" />
            <button class="btn" data-copier="lien-corrige">Copier</button>
          </div>
          <div class="lien-partage">
            <span class="lien-partage__etiquette">Fiche + corrigé</span>
            <input class="champ" id="lien-fiche" readonly value="${lienFiche()}"
                   aria-label="Lien vers la fiche complète" />
            <button class="btn btn--jaune" data-copier="lien-fiche">Copier</button>
          </div>
          <div class="reglage__aide" id="message-copie"></div>
        </div>
        <div class="reglage">
          <div class="reglage__libelle">Affichage</div>
          <div class="reglage__options">
            <button class="option" data-affichage="eleve" data-valeur="oui" aria-pressed="${aff.eleve}">Fiche et corrigé</button>
            <button class="option" data-affichage="eleve" data-valeur="non" aria-pressed="${!aff.eleve}">Corrigé seul</button>
          </div>
          <div class="reglage__aide">« Corrigé seul », c’est exactement ce que voit la personne à qui
            tu envoies le lien du corrigé.</div>
        </div>
      </div>

      <div class="section-titre">Retrouver une fiche</div>
      <div class="carte reglages">
        <div class="reglage">
          <div class="reglage__libelle">Retrouver une fiche déjà imprimée</div>
          <div class="recherche-code">
            <input class="champ" id="code-fiche" maxlength="40" placeholder="Code : ${codes[0]}"
                   aria-label="Code de la fiche à retrouver" />
            <button class="btn" id="retrouver">Retrouver</button>
          </div>
          <div class="reglage__aide" id="message-code">Chaque fiche imprimée porte un code et un QR code :
            ils redonnent exactement les mêmes exercices, et leur corrigé.
            ${codes.length > 1 ? `Ces feuilles-ci : <strong>${codes.join('</strong>, <strong>')}</strong>.`
              : `${panache ? 'Cette feuille panachée' : 'Cette fiche-ci'} est la <strong>${codes[0]}</strong>.`}</div>
        </div>
      </div>
      <p class="note">Aperçu ci-dessous : c’est exactement ce qui sortira de l’imprimante
        (${n} page${n > 1 ? 's' : ''}).</p>
      <div class="pied-page"><button class="btn btn--fantome" data-aller="accueil">← Retour à l’île</button></div>`;
}

function vueFiches() {
  const c = classeCourante();
  const disponibles = fichesDe(c.id);
  const liste = disponibles.length ? disponibles : FICHES;
  if (!fiche) preparerFiche({ id: liste[0].id });
  const pas = pasPossible(vue.pas || 1);
  if (pas > 1 && !fiche.valide) composerSelection({ retirer: true });
  vue = { nom: 'fiches', pas };

  const corps = [pasReviser.bind(null, c, liste, disponibles), pasComposer, pasImprimer][pas - 1]();
  app.innerHTML = `
    <div class="no-print tunnel" data-etape="${pas}">
      ${entete('Une fiche à imprimer, puis un crayon !')}
      <div class="tunnel__haut">${boutonRetour(pas)}${ariane(pas)}</div>
      ${corps}
    </div>
    ${pas === 3 ? `<div id="impression">${ficheHTML()}</div>` : ''}`;
  if (pas !== 3) return;

  app.querySelector('#imprimer').addEventListener('click', () => window.print());
  app.querySelectorAll('[data-copier]').forEach((b) => b.addEventListener('click', async () => {
    const champ = app.querySelector(`#${b.dataset.copier}`);
    const message = app.querySelector('#message-copie');
    try {
      await navigator.clipboard.writeText(champ.value);
      message.textContent = 'Lien copié ! Tu peux le coller dans un message.';
    } catch {
      // Sans presse-papier (navigateur ancien, page non sécurisée), on sélectionne le texte.
      champ.focus();
      champ.select();
      message.textContent = 'Le lien est sélectionné : copie-le avec Ctrl+C.';
    }
    Son.jouer('clic');
  }));
  app.querySelector('#retrouver').addEventListener('click', () => {
    const saisie = app.querySelector('#code-fiche').value.trim();
    if (!saisie) return;
    if (retrouverFiche(saisie)) {
      Son.jouer('achat');
      vueFiches();
    } else {
      app.querySelector('#message-code').innerHTML =
        `Ce code n’est pas reconnu : vérifie les lettres et les chiffres (par exemple ${codesAffiches()[0]}).`;
    }
  });
  app.querySelector('#code-fiche').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') app.querySelector('#retrouver').click();
  });
}

/* ------------------------------------------------------------------ */
/* Écran : réglages d'accessibilité                                    */
/* ------------------------------------------------------------------ */

function vueReglages() {
  const e = P.get();
  app.innerHTML = `
    ${entete('Règle l’application comme tu es à l’aise')}
    ${bulle('Ici, tu choisis ce qui t’aide : des lettres plus espacées, moins d’animations, la lecture à voix haute… Il n’y a pas de bon ou de mauvais réglage.', 'doux', 78)}
    ${A11y.panneau(reglages)}
    <div class="section-titre">Sons</div>
    <div class="carte reglages">
      <div class="reglage">
        <div class="reglage__libelle">Petites musiques</div>
        <div class="reglage__options">
          <button class="option" id="son" aria-pressed="${e.son !== false}">${e.son === false ? 'Coupés' : 'Activés'}</button>
        </div>
        <div class="reglage__aide">Aucun son n’annonce une réponse ratée : il n’y a que des sons joyeux ou curieux.</div>
      </div>
    </div>
    <div class="pied-page">
      <button class="btn btn--large btn--vert" data-aller="accueil">C’est bon pour moi ✔</button>
    </div>`;

  app.querySelector('#son').addEventListener('click', (ev) => {
    const actif = P.basculerSon();
    Son.setActif(actif);
    ev.currentTarget.textContent = actif ? 'Activés' : 'Coupés';
    ev.currentTarget.setAttribute('aria-pressed', String(actif));
    if (actif) Son.jouer('clic');
  });
}

/* ------------------------------------------------------------------ */
/* Écran : session d'exercices                                         */
/* ------------------------------------------------------------------ */

function demarrerSession(choix) {
  const c = classeCourante();
  const tous = modulesDe(c.id).map((m) => m.id);
  const ids = choix === 'melange' ? shuffle(tous).slice(0, 5) : [choix];
  session = {
    classeId: c.id,
    ids,
    exercices: serie(c.id, ids, nbQuestions(), (moduleId) => P.difficulte(cle(c.id, moduleId))),
    index: 0,
    etoiles: 0,
    essaisSurQuestion: 0,
    saisie: '',
    retour: null,
  };
  P.marquerJour();
  aller({ nom: 'session' });
}

function vueSession() {
  const s = session;
  if (!s || s.index >= s.exercices.length) return vueBilan();

  const ex = s.exercices[s.index];
  const mod = moduleParId(s.classeId, ex.moduleId);

  const points = s.exercices.map((_, i) =>
    `<i class="${i < s.index ? 'ok' : i === s.index ? 'actif' : ''}"></i>`).join('');

  const propositions = ex.type === 'choix' ? ex.choix : propositionsAuto(ex);
  const zoneReponse = propositions
    ? `<div class="choix">
         ${propositions.map((c) => `<button class="btn" data-choix="${echappe(c)}">${echappe(c)}</button>`).join('')}
       </div>`
    : `<div class="ardoise ${s.saisie ? '' : 'vide'}" id="ardoise">${s.saisie || '?'}</div>
       <div class="clavier">
         ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="touche" data-touche="${n}">${n}</button>`).join('')}
         <button class="touche touche--action" data-touche="effacer">⌫</button>
         <button class="touche" data-touche="0">0</button>
         <button class="touche touche--valider" data-touche="ok">OK</button>
       </div>`;

  app.innerHTML = `
    <header class="entete">
      <button class="btn btn--fantome" data-aller="accueil">← Retour</button>
      <div class="entete__texte" style="text-align:right">
        <div class="entete__bonjour">⭐ ${s.etoiles}</div>
      </div>
    </header>
    <div class="barre-progres">${points}</div>
    <div class="carte question">
      <div class="question__module">${mod.emoji} ${nomLieu(ex.moduleId, mod.titre)} — question ${s.index + 1} sur ${s.exercices.length}</div>
      <div class="question__texte">${echappe(ex.enonce)}</div>
      <button class="btn btn--fantome" id="ecouter" title="Écouter la question">🔊 Écouter</button>
    </div>
    ${s.retour ? blocRetour(s.retour, ex) : zoneReponse}`;

  // Lecture automatique de l'énoncé, pour qui la lecture est un obstacle.
  if (!s.retour && reglages.voix === 'auto') lire(ex.enonce);
}

// Quand l'enfant a du mal à écrire, on transforme les questions à saisie en choix.
function propositionsAuto(ex) {
  if (reglages.saisie !== 'choix') return null;
  const n = Number(ex.reponse);
  if (!Number.isInteger(n)) return null;
  if (!ex.choixAuto) {
    const ecart = Math.max(3, Math.round(Math.abs(n) * 0.25));
    ex.choixAuto = leurres(n, 3, ecart, 0).map(String);
  }
  return ex.choixAuto;
}

function blocRetour(r, ex) {
  const dessin = reglages.visuels !== 'non' && ex ? visuel(ex.visuel) : '';
  if (r.type === 'bravo') {
    return `<div class="retour retour--bravo">
        ${zigo('joie', 62)}
        <div class="retour__titre">🎉 ${r.titre}</div>
        <div class="retour__aide">${echappe(r.aide || '')}</div>
      </div>
      <button class="btn btn--large btn--vert" id="suivant">Question suivante →</button>`;
  }
  return `<div class="retour retour--astuce">
      ${zigo('curieux', 62)}
      <div class="retour__titre">💡 ${r.titre}</div>
      <div class="retour__aide">${echappe(r.aide)}${dessin ? `<div class="retour__dessin">${dessin}</div>` : ''}</div>
    </div>
    <button class="btn btn--large" id="suivant">${r.encore ? 'J’ai compris, je réessaie 💪' : 'Continuer →'}</button>`;
}

function valider(valeur) {
  const s = session;
  const ex = s.exercices[s.index];
  if (valeur === '' || valeur == null) return;

  const juste = normalise(valeur) === normalise(ex.reponse);
  const cleMod = cle(s.classeId, ex.moduleId);
  s.essaisSurQuestion += 1;

  if (juste) {
    const premierCoup = s.essaisSurQuestion === 1;
    if (premierCoup) s.etoiles += 1;
    P.enregistrerReponse(cleMod, premierCoup);
    Son.jouer('juste');
    confettis();
    s.retour = {
      type: 'bravo',
      titre: premierCoup ? pick(BRAVOS) : 'Tu as réussi, et c’est ça qui compte !',
      aide: premierCoup ? '' : 'Tu as cherché, tu as compris : bravo pour la persévérance.',
    };
  } else if (s.essaisSurQuestion === 1) {
    // Première tentative : on explique et on redonne la main, sans rien compter.
    Son.jouer('astuce');
    s.retour = { type: 'astuce', titre: pick(ENCOURAGEMENTS), aide: ex.aide, encore: true };
  } else {
    P.enregistrerReponse(cleMod, false);
    s.retour = {
      type: 'astuce',
      titre: 'On garde celle-ci pour la prochaine fois !',
      aide: `La réponse était : ${ex.reponse}. ${ex.aide}`,
      encore: false,
    };
  }
  s.saisie = '';
  vueSession();
}

function suivant() {
  const s = session;
  const r = s.retour;
  s.retour = null;
  if (r && r.type === 'astuce' && r.encore) {
    vueSession();   // deuxième chance sur la même question
    return;
  }
  s.index += 1;
  s.essaisSurQuestion = 0;
  s.saisie = '';
  if (s.index >= s.exercices.length) aller({ nom: 'bilan' });
  else vueSession();
}

/* ------------------------------------------------------------------ */
/* Écran : bilan                                                       */
/* ------------------------------------------------------------------ */

function vueBilan() {
  const s = session || { etoiles: 0, exercices: [], ids: [] };
  const nb = s.exercices.length || nbQuestions();
  const nouveaux = P.verifierBadges();
  if (s.etoiles > 0) confettis();
  Son.jouer(nouveaux.length ? 'badge' : 'juste');

  const phrase = s.etoiles === nb
    ? 'Sans faute ! Tu maîtrises vraiment 🏅'
    : s.etoiles >= nb * 0.7
      ? 'Très beau travail, tu progresses à toute vitesse !'
      : s.etoiles >= nb * 0.4
        ? 'Bien joué ! Chaque exercice t’a fait apprendre quelque chose.'
        : 'Tu as travaillé jusqu’au bout : c’est le plus important. Ton cerveau a grandi aujourd’hui 🌱';

  app.innerHTML = `
    <div class="carte bilan">
      ${zigo(s.etoiles >= nb * 0.7 ? 'joie' : 'doux', 96)}
      <div class="bilan__etoiles">${s.etoiles ? '⭐'.repeat(Math.min(10, s.etoiles)) : '🌱'}</div>
      <div class="bilan__phrase">${phrase}</div>
      <div class="bilan__detail">${s.etoiles} étoile${s.etoiles > 1 ? 's' : ''} gagnée${s.etoiles > 1 ? 's' : ''} sur ${nb} exercices.</div>
    </div>
    ${nouveaux.length ? `
      <div class="section-titre">Nouveau${nouveaux.length > 1 ? 'x' : ''} badge${nouveaux.length > 1 ? 's' : ''} !</div>
      <div class="badges">${nouveaux.map((b) => `<span class="badge">${b.emoji} ${b.titre}</span>`).join('')}</div>` : ''}
    <div style="display:grid;gap:12px;margin-top:20px">
      <button class="btn btn--large btn--vert" data-jouer="${s.ids.length === 1 ? s.ids[0] : 'melange'}">Encore une série ! 🔁</button>
      <button class="btn btn--large btn--jaune" data-aller="accueil">Choisir un autre thème</button>
      <button class="btn btn--fantome" data-aller="progres">Voir mes progrès</button>
    </div>`;
  session = null;
}

/* ------------------------------------------------------------------ */
/* Écran : progrès                                                     */
/* ------------------------------------------------------------------ */

function vueProgres() {
  const e = P.get();
  const c = classeCourante();
  app.innerHTML = `
    ${entete('Regarde tout ce que tu as appris !')}
    <div class="carte">
      <h2>Mes trésors</h2>
      <div class="ligne-stat"><span class="ligne-stat__nom">⭐ Étoiles gagnées</span><strong>${e.etoiles}</strong></div>
      <div class="ligne-stat"><span class="ligne-stat__nom">🔥 Jours d’affilée</span><strong>${e.serieJours || 0}</strong></div>
      <div class="ligne-stat"><span class="ligne-stat__nom">📅 Jours d’entraînement</span><strong>${e.jours.length}</strong></div>
      ${CLASSES.filter((x) => P.etoilesClasse(x.id) > 0).map((x) =>
        `<div class="ligne-stat"><span class="ligne-stat__nom">${x.emoji} Étoiles en ${x.nom}</span><strong>${P.etoilesClasse(x.id)}</strong></div>`).join('')}
    </div>
    <div class="section-titre">Mes badges</div>
    <div class="badges">
      ${P.tousLesBadges().map((b) => `<span class="badge ${b.gagne ? '' : 'verrouille'}">${b.gagne ? b.emoji : '🔒'} ${b.titre}</span>`).join('')}
    </div>
    <div class="section-titre">Thème par thème — ${c.emoji} ${c.nom}</div>
    <div class="carte">
      ${modulesDe(c.id).map((m) => {
        const s = P.statsModule(cle(c.id, m.id));
        const niv = P.difficulte(cle(c.id, m.id));
        return `<div class="ligne-stat">
          <span>${m.emoji}</span>
          <span class="ligne-stat__nom">${m.titre}</span>
          <span class="niveau" style="--couleur:${m.couleur}">${[1, 2, 3].map((i) => `<i class="${i <= niv ? 'on' : ''}"></i>`).join('')}</span>
          <strong>⭐ ${s.etoiles}</strong>
        </div>`;
      }).join('')}
      <p style="color:var(--encre-douce);font-size:.9rem">Les points de couleur montrent la difficulté des exercices proposés : elle
      monte toute seule quand tu réussis bien.</p>
    </div>
    <div class="pied-page">
      <button class="btn btn--large btn--vert" data-jouer="melange">Jouer ▶</button>
      <button class="btn btn--fantome" data-aller="accueil">← Accueil</button>
      <button class="btn btn--fantome" id="reset">Espace parent : remettre à zéro</button>
    </div>`;

  app.querySelector('#reset').addEventListener('click', () => {
    if (confirm('Effacer tous les progrès enregistrés sur cet appareil ?')) {
      P.reinitialiser();
      aller({ nom: 'profil' });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Routage et évènements                                               */
/* ------------------------------------------------------------------ */

function aller(v) {
  if (v.nom === 'fiches') {
    // On entre dans le tunnel par son premier pas, et le bouton retour du navigateur le quitte.
    vue = { nom: 'fiches', pas: 1 };
    if (window.location.search !== '?pas=1') window.history.pushState({ pas: 1 }, '', adressePas(1));
  } else {
    vue = v;
    if (window.location.search.includes('pas=')) window.history.replaceState(null, '', window.location.pathname);
  }
  rendre();
  window.scrollTo(0, 0);
}

function rendre() {
  const e = P.get();
  // Les réglages restent accessibles avant même d'avoir créé un profil (un parent peut
  // vouloir préparer le confort de lecture), et un lien partagé vers une fiche ou un
  // corrigé s'ouvre aussi tel quel : la personne qui le reçoit n'a pas de profil ici.
  const libres = ['profil', 'reglages', 'fiches'];
  if ((!e.prenom || !e.classe) && !libres.includes(vue.nom)) vue = { nom: 'profil' };
  ({
    profil: vueProfil,
    accueil: vueAccueil,
    session: vueSession,
    bilan: vueBilan,
    progres: vueProgres,
    jardin: vueJardin,
    reglages: vueReglages,
    fiches: vueFiches,
  }[vue.nom] || vueAccueil)();
}

function majArdoise() {
  const ardoise = app.querySelector('#ardoise');
  if (!ardoise) return;
  ardoise.textContent = session.saisie || '?';
  ardoise.classList.toggle('vide', !session.saisie);
}

app.addEventListener('click', (ev) => {
  const cible = ev.target.closest('[data-aller],[data-jouer],[data-touche],[data-choix],[data-decor],[data-reglage],[data-pas],[data-fiche],[data-fiche-option],[data-affichage],[data-nb-feuilles],[data-compo],#regenerer,#suivant,#ecouter');
  if (!cible) return;

  if (cible.dataset.pas) return allerPas(Number(cible.dataset.pas));
  if (cible.dataset.fiche) {
    const id = cible.dataset.fiche;
    fiche.selection = fiche.selection.includes(id) ? fiche.selection.filter((x) => x !== id) : [...fiche.selection, id];
    fiche.valide = false;
    rafraichir();
    const case_ = app.querySelector(`[data-fiche="${id}"]`);
    if (case_ && document.activeElement !== case_) case_.focus({ preventScroll: true });
    return;
  }
  if (cible.dataset.ficheOption) {
    const id = cible.dataset.ficheId;
    fiche.optionsNotions[id] = { ...optionsDeNotion(id), [cible.dataset.ficheOption]: cible.dataset.valeur };
    fiche.valide = false;
    return rafraichir();
  }
  if (cible.dataset.affichage) {
    preparerFiche({ affichage: { [cible.dataset.affichage]: cible.dataset.valeur === 'oui' } });
    return rafraichir();
  }
  if (cible.dataset.nbFeuilles) {
    preparerFiche({ affichage: { nb: Number(cible.dataset.nbFeuilles) } });
    composerSelection();
    return rafraichir();
  }
  if (cible.dataset.compo) {
    if (cible.dataset.compo === 'mini') fiche.compo.miniRappel = cible.dataset.valeur === 'oui';
    else fiche.compo.rotation = cible.dataset.valeur === 'tournent';
    composerSelection({ retirer: false });
    return rafraichir();
  }
  if (cible.id === 'regenerer') {
    Son.jouer('clic');
    composerSelection({ retirer: true });
    return rafraichir();
  }

  if (cible.dataset.reglage) {
    reglages = A11y.appliquer(P.setReglage(cible.dataset.reglage, cible.dataset.valeur));
    Son.jouer('clic');
    return vueReglages();
  }

  if (cible.dataset.decor) {
    const d = decorParId(cible.dataset.decor);
    if (P.acheterDecor(d.id, d.prix)) {
      Son.jouer('achat');
      P.verifierBadges();
      vueJardin();
    } else {
      // On ne bloque pas sèchement : Zigo explique qu'il faut encore quelques étoiles.
      const manque = d.prix - P.etoilesDisponibles();
      app.querySelector('.bulle').textContent = `Il te manque encore ${manque} étoile${manque > 1 ? 's' : ''} pour ${d.nom.toLowerCase()} — tu y es presque !`;
    }
    return;
  }
  if (cible.id === 'suivant') return suivant();
  if (cible.id === 'ecouter') return lire(app.querySelector('.question__texte').textContent);
  if (cible.dataset.aller) return aller({ nom: cible.dataset.aller });
  if (cible.dataset.jouer) { Son.jouer('clic'); return demarrerSession(cible.dataset.jouer); }
  if (cible.dataset.choix != null) return valider(cible.dataset.choix);

  const t = cible.dataset.touche;
  if (!session) return;
  if (t === 'ok') return valider(session.saisie);
  if (t === 'effacer') session.saisie = session.saisie.slice(0, -1);
  else if (session.saisie.length < 6) session.saisie += t;
  majArdoise();
});

// Les lieux de la carte sont des éléments SVG : on les rend activables au clavier.
app.addEventListener('keydown', (ev) => {
  const lieu = ev.target.closest?.('[data-jouer]');
  if (lieu && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    Son.jouer('clic');
    demarrerSession(lieu.dataset.jouer);
  }
});

// Clavier physique (ordinateur)
window.addEventListener('keydown', (ev) => {
  if (vue.nom !== 'session' || !session) return;
  if (session.retour) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); suivant(); }
    return;
  }
  if (/^[0-9]$/.test(ev.key) && session.saisie.length < 6) session.saisie += ev.key;
  else if (ev.key === 'Backspace') session.saisie = session.saisie.slice(0, -1);
  else if (ev.key === 'Enter') return valider(session.saisie);
  else return;
  majArdoise();
});

// Ouverture par URL : QR code d'une fiche imprimée, ou lien partagé.
//   ?fiche=02G0-UTSC              une feuille
//   ?fiches=02G0-UTSC,02R5-Y0DG   plusieurs feuilles
//   ?fiche=Z003-0...              une feuille panachée (code commençant par Z)
//   &vue=corrige                  le corrigé seul (lien à partager, sans compte)
//   &methode=0 &nom=0             l'affichage exact de la feuille imprimée
function ouvrirDepuisURL() {
  const p = new URLSearchParams(window.location.search);
  // ?pas=2 : le tunnel à ce pas (le premier si rien n'est encore coché).
  if (p.get('pas') && !p.get('fiche') && !p.get('fiches')) {
    vue = { nom: 'fiches', pas: 1 };
    window.history.replaceState({ pas: 1 }, '', adressePas(1));
    return true;
  }
  const codes = (p.get('fiches') || p.get('fiche') || '').split(',').map((c) => c.trim()).filter(Boolean).slice(0, 12);
  if (!codes.length) return false;

  const trouves = codes.map(decoder).filter(Boolean);
  if (!trouves.length || trouves.some((t) => t.panache !== trouves[0].panache || t.fiche !== trouves[0].fiche)) return false;

  const affichage = {
    methode: p.get('methode') !== '0',
    identite: p.get('nom') !== '0',
    // vue=eleve : les exercices seuls. vue=corrige : la correction seule.
    // Sans précision (ancien lien), on montre les deux.
    corrige: p.get('vue') !== 'eleve',
    eleve: p.get('vue') !== 'corrige',
  };
  // Un lien ou un QR code arrive directement au pas 3, avec l'aperçu.
  ouvrirCodes(trouves, affichage);
  fiche.arrivee = true;
  vue = { nom: 'fiches', pas: 3 };
  window.history.replaceState({ pas: 3 }, '', adressePas(3));
  return true;
}

ouvrirDepuisURL();

rendre();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
