// L'univers de Mathoo : la mascotte Zigo, la carte de l'île et le jardin à décorer.
// Tout est dessiné en SVG et en emoji, sans aucune image externe : l'application
// reste minuscule et fonctionne hors connexion.

import { pick } from './utils.js';

/* ------------------------------------------------------------------ */
/* Zigo, la mascotte                                                   */
/* ------------------------------------------------------------------ */

// Petite créature ronde à antenne. `humeur` change les yeux et la bouche.
export function zigo(humeur = 'normal', taille = 92) {
  const yeux = {
    normal: '<circle cx="-11" cy="-4" r="5"/><circle cx="11" cy="-4" r="5"/>',
    joie: '<path d="M-17 -6 q6 -8 12 0" fill="none" stroke="#2D3436" stroke-width="3.4" stroke-linecap="round"/>'
        + '<path d="M5 -6 q6 -8 12 0" fill="none" stroke="#2D3436" stroke-width="3.4" stroke-linecap="round"/>',
    curieux: '<circle cx="-11" cy="-4" r="5"/><circle cx="12" cy="-5" r="6"/>',
    doux: '<circle cx="-11" cy="-3" r="4"/><circle cx="11" cy="-3" r="4"/>',
  }[humeur] || '<circle cx="-11" cy="-4" r="5"/><circle cx="11" cy="-4" r="5"/>';

  const bouche = {
    joie: '<path d="M-13 8 q13 14 26 0 q-13 6 -26 0" fill="#E84393"/>',
    curieux: '<circle cx="0" cy="11" r="5" fill="#E84393"/>',
    doux: '<path d="M-9 10 q9 7 18 0" fill="none" stroke="#E84393" stroke-width="3.4" stroke-linecap="round"/>',
  }[humeur] || '<path d="M-10 9 q10 10 20 0" fill="none" stroke="#E84393" stroke-width="3.6" stroke-linecap="round"/>';

  return `
  <svg class="zigo" viewBox="0 0 140 150" width="${taille}" height="${taille * 150 / 140}" role="img" aria-label="Zigo">
    <defs>
      <radialGradient id="zg" cx="35%" cy="28%">
        <stop offset="0" stop-color="#8FE3D0"/>
        <stop offset="1" stop-color="#00B894"/>
      </radialGradient>
    </defs>
    <ellipse class="zigo__ombre" cx="70" cy="139" rx="34" ry="7" fill="rgba(45,52,54,.16)"/>
    <g class="zigo__corps">
      <path d="M70 18 v-9" stroke="#00B894" stroke-width="5" stroke-linecap="round"/>
      <path class="zigo__etoile" d="M70 2 l3.4 6.8 7.6 1.1 -5.5 5.3 1.3 7.5 -6.8 -3.6 -6.8 3.6 1.3 -7.5 -5.5 -5.3 7.6 -1.1z" fill="#FDCB6E"/>
      <ellipse cx="70" cy="80" rx="52" ry="50" fill="url(#zg)"/>
      <ellipse cx="26" cy="86" rx="11" ry="16" fill="#00B894" transform="rotate(-18 26 86)"/>
      <ellipse cx="114" cy="86" rx="11" ry="16" fill="#00B894" transform="rotate(18 114 86)"/>
      <ellipse cx="70" cy="92" rx="34" ry="28" fill="#FFF9F0" opacity=".85"/>
      <g transform="translate(70 74)" fill="#2D3436">${yeux}${bouche}</g>
      <circle cx="-24" cy="0" r="7" fill="#FF8FB1" opacity=".55" transform="translate(70 88)"/>
      <circle cx="24" cy="0" r="7" fill="#FF8FB1" opacity=".55" transform="translate(70 88)"/>
    </g>
  </svg>`;
}

export const PHRASES = {
  accueil: [
    'Bienvenue sur l’île des Nombres ! Où veux-tu aller ?',
    'Salut ! Choisis un endroit sur la carte, je te suis.',
    'J’ai préparé plein d’énigmes rien que pour toi !',
    'Chaque étoile gagnée fait pousser quelque chose dans ton jardin 🌱',
    'Tu veux essayer un endroit que tu ne connais pas encore ?',
  ],
  jardin: [
    'Regarde comme ton jardin devient beau !',
    'Avec tes étoiles, tu peux planter de nouvelles choses.',
    'C’est ton jardin à toi : personne d’autre ne décide.',
  ],
  progres: [
    'Regarde tout le chemin que tu as fait !',
    'Je note tous tes progrès dans mon carnet.',
  ],
};

export const phrase = (ou) => pick(PHRASES[ou] || PHRASES.accueil);

/* ------------------------------------------------------------------ */
/* La carte de l'île                                                   */
/* ------------------------------------------------------------------ */

// Chaque thème devient un lieu à visiter. Les identifiants correspondent aux
// modules des catalogues (js/niveaux/*.js) ; un thème inconnu reçoit un lieu neutre.
export const LIEUX = {
  nombres: { lieu: 'La Tour des Nombres', batiment: 'tour' },
  addition: { lieu: 'L’Atelier de Plus', batiment: 'atelier' },
  soustraction: { lieu: 'La Grotte de Moins', batiment: 'grotte' },
  tables: { lieu: 'L’Observatoire', batiment: 'observatoire' },
  multiplication: { lieu: 'La Fabrique', batiment: 'atelier' },
  division: { lieu: 'Le Verger', batiment: 'verger' },
  partages: { lieu: 'Le Verger', batiment: 'verger' },
  mental: { lieu: 'La Piste Éclair', batiment: 'phare' },
  suites: { lieu: 'L’Escalier Magique', batiment: 'escalier' },
  problemes: { lieu: 'Le Marché', batiment: 'marche' },
  mesures: { lieu: 'Le Beffroi', batiment: 'beffroi' },
  geometrie: { lieu: 'La Carrière', batiment: 'carriere' },
};

// Emplacements sur la carte (viewBox 800×680) : trois rangées bien espacées, pour que
// les panneaux ne se marchent jamais dessus, même avec dix lieux.
const POSITIONS = [
  [128, 240], [330, 205], [530, 240], [710, 210],
  [128, 420], [330, 385], [530, 420], [710, 390],
  [230, 600], [560, 600],
];

function batiment(type, couleur) {
  const toit = {
    tour: `<rect x="-26" y="-70" width="52" height="70" rx="8" fill="${couleur}"/>
           <path d="M-32 -70 h64 l-32 -34z" fill="#2D3436" opacity=".75"/>
           <rect x="-12" y="-52" width="24" height="22" rx="4" fill="#FFF9F0" opacity=".9"/>`,
    atelier: `<rect x="-34" y="-52" width="68" height="52" rx="8" fill="${couleur}"/>
              <path d="M-42 -52 h84 l-42 -30z" fill="#2D3436" opacity=".75"/>
              <rect x="14" y="-96" width="12" height="30" rx="4" fill="#2D3436" opacity=".6"/>`,
    grotte: `<path d="M-40 0 q6 -56 40 -56 q34 0 40 56z" fill="${couleur}"/>
             <path d="M-16 0 q0 -28 16 -28 q16 0 16 28z" fill="#2D3436" opacity=".7"/>`,
    observatoire: `<rect x="-30" y="-58" width="60" height="58" rx="8" fill="${couleur}"/>
                   <path d="M-38 -58 q38 -40 76 0z" fill="#FFF9F0" opacity=".92"/>
                   <path d="M6 -78 l34 -20 6 12 -34 20z" fill="#2D3436" opacity=".75"/>`,
    verger: `<rect x="-8" y="-30" width="16" height="30" rx="4" fill="#8B5A2B"/>
             <circle cx="0" cy="-52" r="32" fill="${couleur}"/>
             <circle cx="-22" cy="-36" r="18" fill="${couleur}"/>
             <circle cx="22" cy="-36" r="18" fill="${couleur}"/>`,
    phare: `<path d="M-20 0 l6 -74 h28 l6 74z" fill="${couleur}"/>
            <rect x="-18" y="-40" width="36" height="12" fill="#FFF9F0" opacity=".8"/>
            <circle cx="0" cy="-82" r="12" fill="#FDCB6E"/>`,
    escalier: `<g fill="${couleur}">
                 <rect x="-42" y="-14" width="28" height="14"/>
                 <rect x="-14" y="-32" width="28" height="32"/>
                 <rect x="14" y="-52" width="28" height="52"/>
               </g>`,
    marche: `<rect x="-38" y="-40" width="76" height="40" rx="6" fill="#FFF9F0"/>
             <path d="M-46 -40 h92 l-8 -22 h-76z" fill="${couleur}"/>
             <path d="M-46 -40 h92" stroke="#2D3436" stroke-width="3" opacity=".5"/>`,
    beffroi: `<rect x="-24" y="-72" width="48" height="72" rx="6" fill="${couleur}"/>
              <path d="M-30 -72 h60 l-30 -28z" fill="#2D3436" opacity=".75"/>
              <circle cx="0" cy="-46" r="16" fill="#FFF9F0"/>
              <path d="M0 -46 v-10 M0 -46 l8 5" stroke="#2D3436" stroke-width="3" stroke-linecap="round"/>`,
    carriere: `<path d="M-38 0 l14 -40 h20 l-8 40z" fill="${couleur}"/>
               <path d="M-2 0 l16 -52 24 52z" fill="${couleur}" opacity=".8"/>
               <circle cx="-6" cy="-58" r="12" fill="#FFF9F0" opacity=".9"/>`,
  };
  return toit[type] || toit.atelier;
}

// `modules` : les modules de la classe. `stats(id)` renvoie { etoiles, niveau }.
export function carte(modules, stats) {
  const lieux = modules.slice(0, POSITIONS.length).map((m, i) => {
    const [x, y] = POSITIONS[i];
    const info = LIEUX[m.id] || { lieu: m.titre, batiment: 'atelier' };
    const s = stats(m.id);
    // Le panneau s'élargit selon la longueur du nom, sans jamais déborder sur le voisin.
    const largeur = Math.min(196, Math.max(112, info.lieu.length * 8.4 + 36));
    // Décalage pour qu'un panneau proche du bord reste entièrement visible.
    const dx = Math.max(8 + largeur / 2 - x, Math.min(792 - largeur / 2 - x, 0));
    return `
      <g class="lieu" data-jouer="${m.id}" transform="translate(${x} ${y})" tabindex="0" role="button"
         aria-label="${info.lieu} — ${m.titre}">
        <ellipse class="lieu__socle" cx="0" cy="6" rx="46" ry="12" fill="#2D3436" opacity=".12"/>
        <g class="lieu__batiment">${batiment(info.batiment, m.couleur)}</g>
        <g class="lieu__panneau" transform="translate(${dx} 30)">
          <rect x="${-largeur / 2}" y="-16" width="${largeur}" height="32" rx="16"
                fill="#FFF9F0" stroke="${m.couleur}" stroke-width="3"/>
          <text x="0" y="6" text-anchor="middle" font-size="14.5" font-weight="700" fill="#2D3436">${m.emoji} ${info.lieu}</text>
        </g>
        ${s.etoiles ? `<g transform="translate(${Math.min(46, 780 - x)} -68)">
          <circle r="17" fill="#FDCB6E" stroke="#FFF9F0" stroke-width="3"/>
          <text y="6" text-anchor="middle" font-size="15" font-weight="800" fill="#2D3436">${s.etoiles > 99 ? '99+' : s.etoiles}</text>
        </g>` : ''}
      </g>`;
  }).join('');

  return `
  <svg class="carte" viewBox="0 0 800 680" role="group" aria-label="La carte de l’île des Nombres">
    <defs>
      <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#BFE8FF"/><stop offset="1" stop-color="#E8F8E5"/>
      </linearGradient>
      <linearGradient id="herbe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#A8E6A1"/><stop offset="1" stop-color="#6FCF7C"/>
      </linearGradient>
    </defs>
    <rect width="800" height="680" fill="url(#ciel)"/>
    <g opacity=".85" fill="#fff">
      <ellipse cx="120" cy="60" rx="46" ry="24"/><ellipse cx="165" cy="66" rx="34" ry="18"/>
      <ellipse cx="640" cy="52" rx="52" ry="26"/><ellipse cx="592" cy="62" rx="32" ry="17"/>
    </g>
    <path d="M0 120 q120 -40 260 0 q140 40 280 0 q140 -40 260 10 V680 H0z" fill="url(#herbe)"/>
    <path d="M60 300 q160 40 300 0 q160 -40 320 10" fill="none"
          stroke="#F6E3B4" stroke-width="24" stroke-linecap="round" opacity=".9"/>
    <path d="M80 480 q180 40 320 0 q160 -40 300 10" fill="none"
          stroke="#F6E3B4" stroke-width="24" stroke-linecap="round" opacity=".9"/>
    <path d="M400 300 q-40 90 0 180" fill="none" stroke="#F6E3B4" stroke-width="22" stroke-linecap="round" opacity=".9"/>
    <g fill="#4CAF50" opacity=".85">
      <circle cx="52" cy="330" r="16"/><circle cx="768" cy="500" r="15"/><circle cx="430" cy="520" r="13"/>
      <circle cx="60" cy="640" r="18"/><circle cx="750" cy="640" r="16"/>
    </g>
    <ellipse cx="400" cy="655" rx="120" ry="22" fill="#7FD1F0" opacity=".8"/>
    ${lieux}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Le jardin de Zigo : on dépense les étoiles pour le décorer          */
/* ------------------------------------------------------------------ */

export const DECORS = [
  { id: 'fleur', nom: 'Une fleur', emoji: '🌷', prix: 3 },
  { id: 'tournesol', nom: 'Un tournesol', emoji: '🌻', prix: 5 },
  { id: 'arbuste', nom: 'Un arbuste', emoji: '🌳', prix: 8 },
  { id: 'champignon', nom: 'Un champignon', emoji: '🍄', prix: 10 },
  { id: 'papillon', nom: 'Un papillon', emoji: '🦋', prix: 12 },
  { id: 'lapin', nom: 'Un lapin', emoji: '🐰', prix: 15 },
  { id: 'cabane', nom: 'Une cabane', emoji: '🛖', prix: 20 },
  { id: 'fontaine', nom: 'Une fontaine', emoji: '⛲', prix: 25 },
  { id: 'renard', nom: 'Un renard', emoji: '🦊', prix: 30 },
  { id: 'montgolfiere', nom: 'Une montgolfière', emoji: '🎈', prix: 40 },
  { id: 'arcenciel', nom: 'Un arc-en-ciel', emoji: '🌈', prix: 55 },
  { id: 'fusee', nom: 'Une fusée', emoji: '🚀', prix: 80 },
];

export const decorParId = (id) => DECORS.find((d) => d.id === id);

// Les objets sont posés sur une grille douce, avec un léger décalage pour faire vivant.
export function jardin(objets) {
  const poses = objets.map((o, i) => {
    const col = i % 5, ligne = Math.floor(i / 5) % 3;
    const x = 85 + col * 148 + ((i * 37) % 40) - 20;
    const y = 235 + ligne * 82 + ((i * 53) % 26) - 13;
    const d = decorParId(o);
    if (!d) return '';
    return `<text x="${x}" y="${y}" font-size="${52 - ligne * 5}" text-anchor="middle" class="pousse"
                  style="animation-delay:${(i % 8) * 0.08}s">${d.emoji}</text>`;
  }).join('');

  return `
  <svg class="scene-jardin" viewBox="0 0 800 420" role="img" aria-label="Ton jardin">
    <defs>
      <linearGradient id="cielj" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#CDE9FF"/><stop offset="1" stop-color="#F4FBE9"/>
      </linearGradient>
    </defs>
    <rect width="800" height="420" fill="url(#cielj)"/>
    <circle cx="700" cy="70" r="42" fill="#FDCB6E" opacity=".9"/>
    <path d="M0 150 q200 -50 400 0 q200 50 400 0 V420 H0z" fill="#A8E6A1"/>
    <path d="M0 250 q200 -40 400 0 q200 40 400 0 V420 H0z" fill="#7FD98A"/>
    ${poses}
  </svg>`;
}
