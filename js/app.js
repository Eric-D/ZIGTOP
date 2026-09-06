// Mathoo — application monopage (CP, CE1, CE2).
// Règle d'or : on ne dit jamais à l'enfant qu'il a « faux ». On dit « pas encore »
// et on lui montre l'astuce, puis on lui redonne sa chance.

import { CLASSES, CLASSE_DEFAUT, classeParId, modulesDe, moduleParId, cle, serie } from './exercices.js';
import * as P from './progression.js';
import * as Son from './son.js';
import { zigo, phrase, carte, jardin, LIEUX, DECORS, decorParId } from './univers.js';
import * as A11y from './accessibilite.js';
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
  vue = v;
  rendre();
  window.scrollTo(0, 0);
}

function rendre() {
  const e = P.get();
  // Les réglages restent accessibles avant même d'avoir créé un profil :
  // un parent peut vouloir préparer le confort de lecture en premier.
  if ((!e.prenom || !e.classe) && vue.nom !== 'profil' && vue.nom !== 'reglages') vue = { nom: 'profil' };
  ({
    profil: vueProfil,
    accueil: vueAccueil,
    session: vueSession,
    bilan: vueBilan,
    progres: vueProgres,
    jardin: vueJardin,
    reglages: vueReglages,
  }[vue.nom] || vueAccueil)();
}

function majArdoise() {
  const ardoise = app.querySelector('#ardoise');
  if (!ardoise) return;
  ardoise.textContent = session.saisie || '?';
  ardoise.classList.toggle('vide', !session.saisie);
}

app.addEventListener('click', (ev) => {
  const cible = ev.target.closest('[data-aller],[data-jouer],[data-touche],[data-choix],[data-decor],[data-reglage],#suivant,#ecouter');
  if (!cible) return;

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

rendre();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
