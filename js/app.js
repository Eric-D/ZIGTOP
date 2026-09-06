// Mathoo CE2 — application monopage.
// Règle d'or : on ne dit jamais à l'enfant qu'il a « faux ». On dit « pas encore »
// et on lui montre l'astuce, puis on lui redonne sa chance.

import { MODULES, moduleParId, serie } from './exercices.js';
import * as P from './progression.js';
import { shuffle, pick } from './utils.js';

const app = document.getElementById('app');
const NB_QUESTIONS = 10;
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

/* ------------------------------------------------------------------ */
/* Utilitaires d'affichage                                             */
/* ------------------------------------------------------------------ */

const echappe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function normalise(v) {
  return String(v).toLowerCase().trim()
    .replace(/’/g, "'")
    .replace(/\s| | /g, '')
    .replace(/€|cm|min|^l'|^le|^la/g, '');
}

function confettis() {
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
      <p>Les maths du CE2, en jeu, à ton rythme. Ici, on n’a jamais « faux » : on a juste
      des choses qu’on n’a <strong>pas encore</strong> apprises.</p>
    </div>
    <div class="carte">
      <h2>Comment tu t’appelles ?</h2>
      <input class="champ" id="prenom" maxlength="14" placeholder="Ton prénom" value="${echappe(e.prenom)}" />
      <h2 style="margin-top:22px">Choisis ton avatar</h2>
      <div class="avatars">
        ${AVATARS.map((a) => `<button class="avatar-choix" data-avatar="${a}" aria-pressed="${a === (e.avatar || '🦊')}">${a}</button>`).join('')}
      </div>
      <button class="btn btn--large btn--vert" id="commencer">C’est parti ! 🚀</button>
    </div>`;

  let avatar = e.avatar || '🦊';
  app.querySelectorAll('[data-avatar]').forEach((b) => b.addEventListener('click', () => {
    avatar = b.dataset.avatar;
    app.querySelectorAll('[data-avatar]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  app.querySelector('#commencer').addEventListener('click', () => {
    const prenom = app.querySelector('#prenom').value.trim() || 'champion';
    P.setProfil(prenom, avatar);
    aller({ nom: 'accueil' });
  });
}

/* ------------------------------------------------------------------ */
/* Écran : accueil                                                     */
/* ------------------------------------------------------------------ */

function vueAccueil() {
  const e = P.get();
  const serieTxt = e.serieJours > 1 ? `🔥 ${e.serieJours} jours d’affilée, bravo !` : 'Prêt·e pour quelques exercices ?';

  app.innerHTML = `
    ${entete(serieTxt)}
    <div class="heros">
      <h1>Entraînement du jour</h1>
      <p>${NB_QUESTIONS} exercices piochés partout, adaptés à ton niveau.</p>
      <button class="btn" data-jouer="melange">Jouer ▶</button>
    </div>
    <div class="section-titre">Choisis un thème</div>
    <div class="grille">
      ${MODULES.map((m) => {
        const s = P.statsModule(m.id);
        const niv = P.difficulte(m.id);
        return `
        <button class="module" style="--couleur:${m.couleur}" data-jouer="${m.id}">
          <div class="module__emoji">${m.emoji}</div>
          <div class="module__titre">${m.titre}</div>
          <div class="module__pied">
            <span>⭐ ${s.etoiles}</span>
            <span class="niveau" title="Niveau ${niv}">
              ${[1, 2, 3].map((i) => `<i class="${i <= niv ? 'on' : ''}"></i>`).join('')}
            </span>
          </div>
        </button>`;
      }).join('')}
    </div>
    <div class="pied-page">
      <button class="btn btn--fantome" data-aller="progres">📊 Mes progrès</button>
      <button class="btn btn--fantome" data-aller="profil">✏️ Changer mon profil</button>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Écran : session d'exercices                                         */
/* ------------------------------------------------------------------ */

function demarrerSession(choix) {
  const ids = choix === 'melange'
    ? shuffle(MODULES.map((m) => m.id)).slice(0, 5)
    : [choix];
  session = {
    ids,
    exercices: serie(ids, NB_QUESTIONS, P.difficulte),
    index: 0,
    etoiles: 0,
    essaisSurQuestion: 0,
    saisie: '',
    retour: null,
    reussisDuPremierCoup: 0,
    revus: 0,
  };
  P.marquerJour();
  aller({ nom: 'session' });
}

function vueSession() {
  const s = session;
  if (!s || s.index >= s.exercices.length) return vueBilan();

  const ex = s.exercices[s.index];
  const mod = moduleParId(ex.moduleId);

  const points = s.exercices.map((_, i) =>
    `<i class="${i < s.index ? 'ok' : i === s.index ? 'actif' : ''}"></i>`).join('');

  const zoneReponse = ex.type === 'choix'
    ? `<div class="choix">
         ${ex.choix.map((c) => `<button class="btn" data-choix="${echappe(c)}">${echappe(c)}</button>`).join('')}
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
      <div class="question__module">${mod.emoji} ${mod.titre} — question ${s.index + 1} sur ${s.exercices.length}</div>
      <div class="question__texte">${echappe(ex.enonce)}</div>
    </div>
    ${s.retour ? blocRetour(s.retour) : zoneReponse}`;

  if (s.retour) {
    app.querySelector('#suivant')?.focus();
  }
}

function blocRetour(r) {
  if (r.type === 'bravo') {
    return `<div class="retour retour--bravo">
        <div class="retour__titre">🎉 ${r.titre}</div>
        <div class="retour__aide">${echappe(r.aide || '')}</div>
      </div>
      <button class="btn btn--large btn--vert" id="suivant">Question suivante →</button>`;
  }
  return `<div class="retour retour--astuce">
      <div class="retour__titre">💡 ${r.titre}</div>
      <div class="retour__aide">${echappe(r.aide)}</div>
    </div>
    <button class="btn btn--large" id="suivant">${r.encore ? 'J’ai compris, je réessaie 💪' : 'Continuer →'}</button>`;
}

function valider(valeur) {
  const s = session;
  const ex = s.exercices[s.index];
  if (valeur === '' || valeur == null) return;

  const juste = normalise(valeur) === normalise(ex.reponse);
  s.essaisSurQuestion += 1;

  if (juste) {
    const premierCoup = s.essaisSurQuestion === 1;
    if (premierCoup) { s.etoiles += 1; s.reussisDuPremierCoup += 1; }
    P.enregistrerReponse(ex.moduleId, premierCoup);
    confettis();
    s.retour = {
      type: 'bravo',
      titre: premierCoup ? pick(BRAVOS) : 'Tu as réussi, et c’est ça qui compte !',
      aide: premierCoup ? '' : 'Tu as cherché, tu as compris : bravo pour la persévérance.',
    };
  } else if (s.essaisSurQuestion === 1) {
    // Première tentative : on explique et on redonne la main, sans rien compter.
    s.retour = { type: 'astuce', titre: pick(ENCOURAGEMENTS), aide: ex.aide, encore: true };
  } else {
    P.enregistrerReponse(ex.moduleId, false);
    s.revus += 1;
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
    // On rejoue la même question : deuxième chance.
    vueSession();
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
  const s = session || { etoiles: 0, exercices: [], reussisDuPremierCoup: 0, ids: [] };
  const nb = s.exercices.length || NB_QUESTIONS;
  const nouveaux = P.verifierBadges();
  if (s.etoiles > 0) confettis();

  const phrase = s.etoiles === nb
    ? 'Sans faute ! Tu maîtrises vraiment 🏅'
    : s.etoiles >= nb * 0.7
      ? 'Très beau travail, tu progresses à toute vitesse !'
      : s.etoiles >= nb * 0.4
        ? 'Bien joué ! Chaque exercice t’a fait apprendre quelque chose.'
        : 'Tu as travaillé jusqu’au bout : c’est le plus important. Ton cerveau a grandi aujourd’hui 🌱';

  app.innerHTML = `
    <div class="carte bilan">
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
  const total = Object.values(e.modules).reduce((n, m) => n + m.etoiles, 0);
  app.innerHTML = `
    ${entete('Regarde tout ce que tu as appris !')}
    <div class="carte">
      <h2>Mes trésors</h2>
      <div class="ligne-stat"><span class="ligne-stat__nom">⭐ Étoiles gagnées</span><strong>${e.etoiles}</strong></div>
      <div class="ligne-stat"><span class="ligne-stat__nom">🔥 Jours d’affilée</span><strong>${e.serieJours || 0}</strong></div>
      <div class="ligne-stat"><span class="ligne-stat__nom">📅 Jours d’entraînement</span><strong>${e.jours.length}</strong></div>
    </div>
    <div class="section-titre">Mes badges</div>
    <div class="badges">
      ${P.tousLesBadges().map((b) => `<span class="badge ${b.gagne ? '' : 'verrouille'}">${b.gagne ? b.emoji : '🔒'} ${b.titre}</span>`).join('')}
    </div>
    <div class="section-titre">Thème par thème</div>
    <div class="carte">
      ${MODULES.map((m) => {
        const s = P.statsModule(m.id);
        const niv = P.difficulte(m.id);
        return `<div class="ligne-stat">
          <span>${m.emoji}</span>
          <span class="ligne-stat__nom">${m.titre}</span>
          <span class="niveau" style="--couleur:${m.couleur}">${[1, 2, 3].map((i) => `<i class="${i <= niv ? 'on' : ''}"></i>`).join('')}</span>
          <strong>⭐ ${s.etoiles}</strong>
        </div>`;
      }).join('')}
      <p style="color:var(--encre-douce);font-size:.9rem">Les points de couleur montrent la difficulté des exercices proposés : elle
      monte toute seule quand tu réussis bien. ${total ? '' : 'Fais une première série pour la voir bouger !'}</p>
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
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function rendre() {
  if (!P.get().prenom && vue.nom !== 'profil') vue = { nom: 'profil' };
  ({
    profil: vueProfil,
    accueil: vueAccueil,
    session: vueSession,
    bilan: vueBilan,
    progres: vueProgres,
  }[vue.nom] || vueAccueil)();
}

app.addEventListener('click', (ev) => {
  const cible = ev.target.closest('[data-aller],[data-jouer],[data-touche],[data-choix],#suivant');
  if (!cible) return;

  if (cible.id === 'suivant') return suivant();
  if (cible.dataset.aller) return aller({ nom: cible.dataset.aller });
  if (cible.dataset.jouer) return demarrerSession(cible.dataset.jouer);
  if (cible.dataset.choix != null) return valider(cible.dataset.choix);

  const t = cible.dataset.touche;
  if (!session) return;
  if (t === 'ok') return valider(session.saisie);
  if (t === 'effacer') session.saisie = session.saisie.slice(0, -1);
  else if (session.saisie.length < 6) session.saisie += t;
  const ardoise = app.querySelector('#ardoise');
  if (ardoise) {
    ardoise.textContent = session.saisie || '?';
    ardoise.classList.toggle('vide', !session.saisie);
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
  const ardoise = app.querySelector('#ardoise');
  if (ardoise) {
    ardoise.textContent = session.saisie || '?';
    ardoise.classList.toggle('vide', !session.saisie);
  }
});

rendre();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
