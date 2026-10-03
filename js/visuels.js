// Supports visuels des explications : voir la quantité aide énormément les enfants
// dyscalculiques, et rassure tous les autres. Chaque exercice peut décrire son
// aide avec un objet `visuel` ; ici on le transforme en dessin.

const COULEUR_A = '#6C5CE7';
const COULEUR_B = '#00B894';
const COULEUR_C = '#E17055';

// Jetons alignés en rangées de 5 : la structure « main » se compte d'un coup d'œil.
function jetons(nb, couleur, decalage = 0, max = 30) {
  if (nb > max) return '';
  let out = '';
  for (let i = 0; i < nb; i++) {
    const x = 22 + (i % 5) * 30;
    const y = 22 + Math.floor(i / 5) * 30 + decalage;
    out += `<circle cx="${x}" cy="${y}" r="11" fill="${couleur}"/>`;
  }
  return out;
}

function groupes(a, b, signe) {
  if (a > 20 || b > 20) return '';
  const hA = Math.ceil(a / 5) * 30 + 14;
  const hB = Math.ceil(b / 5) * 30 + 14;
  const hauteur = Math.max(hA, hB) + 10;
  return `
  <svg class="visuel" viewBox="0 0 380 ${hauteur}" role="img" aria-label="${a} et ${b} en jetons">
    <g>${jetons(a, COULEUR_A)}</g>
    <text x="182" y="${hauteur / 2 + 8}" font-size="30" font-weight="800" fill="#636E72" text-anchor="middle">${signe}</text>
    <g transform="translate(200 0)">${jetons(b, COULEUR_B)}</g>
  </svg>`;
}

// Ligne numérique avec un saut : on voit le déplacement, pas seulement le résultat.
function ligne(de, saut, vers) {
  const min = Math.max(0, Math.min(de, vers) - 2);
  const max = Math.max(de, vers) + 2;
  const n = max - min;
  if (n > 30) return '';
  const pas = 700 / n;
  const px = (v) => 40 + (v - min) * pas;
  let graduations = '';
  for (let v = min; v <= max; v++) {
    const grand = v % 5 === 0 || v === de || v === vers;
    graduations += `<line x1="${px(v)}" y1="70" x2="${px(v)}" y2="${grand ? 84 : 78}" stroke="#B2BEC3" stroke-width="2"/>`;
    if (grand) graduations += `<text x="${px(v)}" y="106" font-size="17" fill="#636E72" text-anchor="middle">${v}</text>`;
  }
  const milieu = (px(de) + px(vers)) / 2;
  return `
  <svg class="visuel" viewBox="0 0 780 120" role="img" aria-label="De ${de} à ${vers}">
    <line x1="30" y1="70" x2="750" y2="70" stroke="#B2BEC3" stroke-width="3"/>
    ${graduations}
    <path d="M${px(de)} 66 Q${milieu} 8 ${px(vers)} 66" fill="none" stroke="${COULEUR_C}" stroke-width="4" stroke-linecap="round"/>
    <text x="${milieu}" y="24" font-size="20" font-weight="800" fill="${COULEUR_C}" text-anchor="middle">${saut > 0 ? '+' : '−'} ${Math.abs(saut)}</text>
    <circle cx="${px(de)}" cy="70" r="8" fill="${COULEUR_A}"/>
    <circle cx="${px(vers)}" cy="70" r="8" fill="${COULEUR_B}"/>
  </svg>`;
}

// Rectangle de points : la multiplication devient une surface, « 3 rangées de 4 ».
function grille(l, c) {
  if (l * c > 100) return '';
  // On met toujours le plus grand facteur en colonnes : le rectangle reste large,
  // donc lisible sur un écran de téléphone (3 × 8 et 8 × 3, c'est la même quantité).
  const lignes = Math.min(l, c), colonnes = Math.max(l, c);
  let points = '';
  for (let l = 0; l < lignes; l++) {
    for (let c = 0; c < colonnes; c++) {
      points += `<circle cx="${20 + c * 34}" cy="${20 + l * 34}" r="12" fill="${COULEUR_A}" opacity="${0.55 + 0.45 * (l % 2)}"/>`;
    }
  }
  return `
  <svg class="visuel" viewBox="0 0 ${colonnes * 34 + 8} ${lignes * 34 + 8}" role="img"
       aria-label="${lignes} rangées de ${colonnes}">${points}</svg>`;
}

// Barres de dizaines et jetons d'unités : la numération décimale, en matériel.
function decimal(n) {
  if (n > 999) return '';
  const c = Math.floor(n / 100), d = Math.floor((n % 100) / 10), u = n % 10;
  let out = '';
  let x = 12;
  for (let i = 0; i < c; i++, x += 60) out += `<rect x="${x}" y="10" width="50" height="50" rx="6" fill="${COULEUR_A}"/>`;
  for (let i = 0; i < d; i++, x += 22) out += `<rect x="${x}" y="10" width="14" height="50" rx="5" fill="${COULEUR_B}"/>`;
  for (let i = 0; i < u; i++, x += 22) out += `<circle cx="${x + 7}" cy="46" r="10" fill="${COULEUR_C}"/>`;
  const legende = [c && `${c} centaine${c > 1 ? 's' : ''}`, d && `${d} dizaine${d > 1 ? 's' : ''}`, u && `${u} unité${u > 1 ? 's' : ''}`]
    .filter(Boolean).join(' + ');
  return `
  <svg class="visuel" viewBox="0 0 ${Math.max(320, x + 12)} 92" role="img" aria-label="${n} : ${legende}">
    ${out}
    <text x="12" y="84" font-size="17" fill="#636E72">${legende}</text>
  </svg>`;
}

// Parts égales : le partage se voit avant de se calculer.
function partage(total, parts) {
  if (parts > 6 || total > 40) return '';
  const parPart = Math.floor(total / parts);
  const largeur = Math.max(1, parPart) * 26 + 30;
  let paniers = '';
  for (let p = 0; p < parts; p++) {
    let dedans = '';
    for (let i = 0; i < parPart; i++) dedans += `<circle cx="${22 + i * 26}" cy="34" r="10" fill="${COULEUR_B}"/>`;
    paniers += `<g transform="translate(${p * (largeur + 12)} 0)">
        <rect x="4" y="10" width="${largeur}" height="48" rx="14" fill="#fff" stroke="${COULEUR_A}" stroke-width="3"/>
        ${dedans}
      </g>`;
  }
  return `
  <svg class="visuel" viewBox="0 0 ${parts * (largeur + 12)} 68" role="img"
       aria-label="${total} partagé en ${parts} parts de ${parPart}">${paniers}</svg>`;
}

export function visuel(spec) {
  if (!spec) return '';
  try {
    switch (spec.type) {
      case 'jetons': return groupes(spec.a, spec.b, spec.signe || '+');
      case 'ligne': return ligne(spec.de, spec.saut, spec.vers);
      case 'grille': return grille(spec.lignes, spec.colonnes);
      case 'decimal': return decimal(spec.n);
      case 'partage': return partage(spec.total, spec.parts);
      default: return '';
    }
  } catch {
    return '';
  }
}

// Demi-droite graduée pour les fiches imprimables : l'origine 0 à gauche, une flèche à droite,
// de grandes graduations étiquetées (tous les `grand`) et de petits traits (tous les `petit`).
// Les x sont proportionnels aux valeurs. Sans `corrige`, seuls les repères sont dessinés ;
// avec `corrige`, une flèche et une étiquette marquent chaque nombre de `points`.
// Noir et blanc lisible : traits foncés, flèches épaisses.
const DROITE = { x0: 26, largeur: 640, y: 62 };
export const abscisseDroite = (v, max) => DROITE.x0 + (v / max) * DROITE.largeur;

export function demiDroite({ max, grand, petit, points = [], corrige = false }) {
  const { x0, y } = DROITE;
  const px = (v) => abscisseDroite(v, max);
  const espace = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  let traits = '';
  for (let v = 0; v <= max; v += petit) {
    const long = v % grand === 0, demi = v % (grand / 2) === 0;
    const h = long ? 10 : demi ? 7.5 : 5;
    traits += `<line class="graduation" data-valeur="${v}" x1="${px(v)}" y1="${y - h}" x2="${px(v)}" y2="${y + h}" stroke="#222" stroke-width="${long ? 2.6 : demi ? 2 : 1.5}"/>`;
    if (long) traits += `<text class="repere" data-valeur="${v}" x="${px(v)}" y="${y + 30}" font-size="14" font-weight="700" fill="#222" text-anchor="middle">${espace(v)}</text>`;
  }
  const marques = corrige ? points.map((v) => `
    <g class="fleche" data-valeur="${v}">
      <path d="M${px(v)} 26 V${y - 4}" stroke="#C0392B" stroke-width="3" fill="none"/>
      <path d="M${px(v) - 6} ${y - 14} L${px(v)} ${y - 3} L${px(v) + 6} ${y - 14}" stroke="#C0392B" stroke-width="3" fill="none" stroke-linejoin="round"/>
      <text class="fleche__etiquette" data-valeur="${v}" x="${px(v)}" y="17" font-size="16" font-weight="800" fill="#C0392B" text-anchor="middle">${espace(v)}</text>
    </g>`).join('') : '';
  return `
  <svg class="demi-droite" viewBox="0 0 720 98" data-max="${max}" data-x0="${x0}" data-largeur="${DROITE.largeur}" role="img"
       aria-label="Demi-droite graduée de ${espace(grand)} en ${espace(grand)}">
    <line x1="${x0}" y1="${y}" x2="708" y2="${y}" stroke="#222" stroke-width="2.6"/>
    <path d="M697 ${y - 8} L710 ${y} L697 ${y + 8}" stroke="#222" stroke-width="2.6" fill="none" stroke-linejoin="round"/>
    ${traits}${marques}
  </svg>`;
}

// Figure partagée en `parts` parts égales dont les `coloriees` premières sont grisées, pour
// représenter une fraction de l'unité. Gris moyen et traits noirs : la feuille s'imprime en noir
// et blanc. Aucun style externe : tout est en attributs, donc la figure se place où l'on veut.
//   forme    : 'disque' (secteurs, le premier part du haut, sens des aiguilles d'une montre),
//              'bande' (rectangle en cases, de gauche à droite),
//              'carre' (grille, ligne par ligne) — seulement pour 4, 6, 8, 9 et 10 parts ;
//   taille   : largeur de la figure à l'écran, en pixels (96 px = 25,4 mm) ; la hauteur suit.
// Chaque part est un élément `.part` ; celles qui sont grisées portent aussi `.part--coloriee`.
const GRILLES_CARRE = { 4: [2, 2], 6: [2, 3], 8: [2, 4], 9: [3, 3], 10: [2, 5] };
const GRIS_PART = '#A9A9A9';

export function figureFraction({ forme, parts, coloriees = 0, taille = 84, titre } = {}) {
  const trait = '#222';
  const part = (i, balise, attributs) => {
    const coloree = i < coloriees;
    return `<${balise} class="part${coloree ? ' part--coloriee' : ''}" data-rang="${i}" ${attributs} fill="${coloree ? GRIS_PART : '#fff'}" stroke="${trait}" stroke-width="2" stroke-linejoin="round"/>`;
  };
  let largeur, hauteur, dessin = '';
  if (forme === 'disque') {
    largeur = hauteur = 104;
    const c = 52, r = 48;
    if (parts === 1) {
      dessin = part(0, 'circle', `cx="${c}" cy="${c}" r="${r}"`);
    } else {
      const point = (a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
      for (let i = 0; i < parts; i++) {
        const a1 = -Math.PI / 2 + (2 * Math.PI * i) / parts, a2 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / parts;
        dessin += part(i, 'path', `d="M${c} ${c} L${point(a1)} A${r} ${r} 0 0 1 ${point(a2)} Z"`);
      }
    }
  } else if (forme === 'bande') {
    const w = 100 / parts;
    largeur = 104; hauteur = 34;
    for (let i = 0; i < parts; i++) dessin += part(i, 'rect', `x="${(2 + i * w).toFixed(3)}" y="2" width="${w.toFixed(3)}" height="30"`);
  } else if (forme === 'carre') {
    const grille = GRILLES_CARRE[parts];
    if (!grille) throw new Error(`figureFraction : pas de grille pour ${parts} parts`);
    const [lignes, colonnes] = grille;
    const cote = 100 / Math.max(lignes, colonnes);
    largeur = colonnes * cote + 4; hauteur = lignes * cote + 4;
    for (let i = 0; i < parts; i++) {
      dessin += part(i, 'rect', `x="${(2 + (i % colonnes) * cote).toFixed(3)}" y="${(2 + Math.floor(i / colonnes) * cote).toFixed(3)}" width="${cote.toFixed(3)}" height="${cote.toFixed(3)}"`);
    }
  } else {
    throw new Error(`figureFraction : forme inconnue « ${forme} »`);
  }
  const etiquette = titre || `Figure partagée en ${parts} parts égales`;
  return `<svg class="figure-fraction" data-forme="${forme}" data-parts="${parts}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}"
    width="${taille}" height="${Math.round((taille * hauteur) / largeur)}" role="img" aria-label="${etiquette}">${dessin}</svg>`;
}

// Règle graduée en fractions d'unité, avec une bande à mesurer posée dessus, alignée sur le 0.
//   unite    : nombre d'unités que la règle porte (1 : de 0 à 1 ; 2 : de 0 à 2) ;
//   parts    : nombre de parts de chaque unité (4 : des quarts) ;
//   longueur : longueur de la bande, en nombre de sous-graduations (3 avec parts = 4 : trois quarts).
// Les graduations principales (chaque unité) sont plus longues et numérotées 0, 1, 2… ; les
// sous-graduations (chaque 1/parts) sont de simples traits dans la règle. Traits foncés, gris moyen :
// lisible en noir et blanc. Aucun style externe.
export function regleFractions({ unite = 1, parts, longueur, taille = 250 } = {}) {
  const total = unite * parts;
  if (!(parts >= 2) || !(longueur >= 1) || longueur > total) {
    throw new Error(`regleFractions : longueur ${longueur} hors de la règle (${total} sous-graduations)`);
  }
  const x0 = 14, largeurRegle = 280, pas = largeurRegle / total;
  const haut = 4, hBande = 20, yRegle = 28, hRegle = 16;
  const W = x0 * 2 + largeurRegle, H = 76;
  let traits = '', reperes = '';
  for (let i = 0; i <= total; i++) {
    const x = (x0 + i * pas).toFixed(2);
    const principale = i % parts === 0;
    traits += `<line class="graduation${principale ? ' graduation--principale' : ''}" data-rang="${i}" x1="${x}" y1="${yRegle}" x2="${x}" y2="${yRegle + hRegle + (principale ? 8 : 0)}" stroke="#222" stroke-width="${principale ? 2.8 : 1.6}"/>`;
    if (principale) reperes += `<text class="repere" data-valeur="${i / parts}" x="${x}" y="${yRegle + hRegle + 26}" font-size="16" font-weight="700" fill="#222" text-anchor="middle">${i / parts}</text>`;
  }
  return `<svg class="regle-fractions" data-unite="${unite}" data-parts="${parts}" data-longueur="${longueur}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
    width="${taille}" height="${Math.round((taille * H) / W)}" role="img" aria-label="Règle graduée de 0 à ${unite}, chaque unité partagée en ${parts} parts égales, avec une bande à mesurer">
    <rect class="bande" data-longueur="${longueur}" x="${x0}" y="${haut}" width="${(longueur * pas).toFixed(2)}" height="${hBande}" fill="${GRIS_PART}" stroke="#222" stroke-width="2" stroke-linejoin="round"/>
    <rect class="regle" x="${x0}" y="${yRegle}" width="${largeurRegle}" height="${hRegle}" fill="#fff" stroke="#222" stroke-width="2"/>
    ${traits}${reperes}
  </svg>`;
}
