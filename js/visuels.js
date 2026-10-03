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

// Un dessin d'item : un conteneur centré, qui laisse la place à plusieurs figures côte à côte.
const dessin = (html) => `<div class="visuel-fig">${html}</div>`;
const echappeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Tableau à double entrée en HTML simple : { coin, colonnes: [..], lignes: [{ cap, valeurs: [..] }] }.
function tableauHtml({ coin = '', colonnes, lignes }) {
  return `<table class="visuel-tableau"><thead><tr><th scope="col">${echappeHtml(coin)}</th>${colonnes.map((c) => `<th scope="col">${echappeHtml(c)}</th>`).join('')}</tr></thead>`
    + `<tbody>${lignes.map((l) => `<tr><th scope="row">${echappeHtml(l.cap)}</th>${l.valeurs.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
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
      // Schémas de la banque d'items (js/items.js), les mêmes que ceux des fiches.
      case 'polygone': return polygoneCote({ forme: spec.forme, cotes: spec.cotes, taille: spec.taille || 150 });
      case 'monnaie': return monnaie(spec.valeurs, { taille: spec.taille });
      // Figures posées avec l'énoncé d'un item (js/items.js, `visuelEnonce`) : les mêmes dessins que la feuille de même code.
      case 'fraction': return dessin(figureFraction({ forme: spec.forme, parts: spec.parts, coloriees: spec.coloriees, taille: spec.taille || 120 }));
      case 'regle': return dessin(regleFractions({ unite: spec.unite, parts: spec.parts, longueur: spec.longueur, taille: spec.taille || 300 }));
      case 'horloge': return dessin(horloge({ heures: spec.heures, minutes: spec.minutes, taille: spec.taille || 150, titre: spec.titre }));
      case 'solide': return dessin(solide(spec.nom, { taille: spec.taille || 130, variante: spec.variante || 0, etiquette: spec.etiquette }));
      case 'patron': return dessin(patronCube(spec.numero, { taille: spec.taille || 170, quart: spec.quart || 0, miroir: !!spec.miroir }).svg);
      case 'figure': return dessin(figurePlane(spec.nom, { taille: spec.taille || 140, variante: spec.variante || 0, etiquette: spec.etiquette }).svg);
      case 'symetrie': return dessin(figureSymetrie(spec.nom, { taille: spec.taille || 130 }).svg);
      case 'diagramme': return dessin(diagrammeBarres({ categories: spec.categories, valeurs: spec.valeurs, pas: spec.pas, titreY: spec.titreY, taille: spec.taille || 340, hauteur: spec.hauteur || 168 }).svg);
      case 'tableau': return dessin(tableauHtml(spec));
      case 'figures': return dessin((spec.liste || []).map((s) => visuel(s).replace(/^<div class="visuel-fig">|<\/div>$/g, '')).join(''));
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

// Pièces et billets en euro, en une rangée. `valeurs` : des montants en centimes d'euro, dans l'ordre
// où on les dessine. Pièces : 1, 2, 5, 10, 20, 50 (centimes), 100 et 200 (1 € et 2 €) — des cercles ;
// billets : 500, 1000, 2000, 5000, 10000, 20000 et 50000 (5 € à 500 €) — des rectangles à coins arrondis.
// La valeur est écrite en gros au centre : on la lit en noir et blanc, sans la couleur. Chaque pièce est un
// élément `.piece`, chaque billet un `.billet`, avec `data-valeur` (en centimes) et leur texte `.valeur-monnaie`.
const NBSP = ' ';
export const PIECES_EURO = [1, 2, 5, 10, 20, 50, 100, 200];
export const BILLETS_EURO = [500, 1000, 2000, 5000, 10000, 20000, 50000];

export function etiquetteMonnaie(v) {
  return v >= 100 ? `${v / 100}${NBSP}€` : `${v}${NBSP}c`;
}

export function monnaie(valeurs, { taille } = {}) {
  const dessins = [];
  let x = 3;
  const hauteur = 52;
  for (const v of valeurs) {
    const billet = v >= 500;
    const texte = etiquetteMonnaie(v);
    const police = billet ? (String(v / 100).length > 2 ? 15 : 18) : (v >= 100 ? 17 : 15);
    if (billet) {
      const w = 66, h = 38, y = (hauteur - h) / 2;
      dessins.push(`<g class="billet" data-valeur="${v}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#fff" stroke="#222" stroke-width="2.4"/>
      <text class="valeur-monnaie" x="${x + w / 2}" y="${hauteur / 2 + police * 0.35}" font-size="${police}" font-weight="800" fill="#222" text-anchor="middle">${texte}</text></g>`);
      x += w + 8;
    } else {
      const r = v >= 100 ? 23 : 20;
      dessins.push(`<g class="piece" data-valeur="${v}">
      <circle cx="${x + r}" cy="${hauteur / 2}" r="${r}" fill="${v >= 100 ? '#ECECEC' : '#fff'}" stroke="#222" stroke-width="2.4"/>
      <text class="valeur-monnaie" x="${x + r}" y="${hauteur / 2 + police * 0.35}" font-size="${police}" font-weight="800" fill="#222" text-anchor="middle">${texte}</text></g>`);
      x += 2 * r + 8;
    }
  }
  const largeur = Math.max(x - 8 + 3, 10);
  const dim = taille ? ` width="${taille}" height="${Math.round((taille * hauteur) / largeur)}"` : '';
  return `<svg class="monnaie" data-valeurs="${valeurs.join(',')}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}"${dim}
    role="img" aria-label="${valeurs.map((v) => (v >= 500 ? 'billet' : 'pièce') + ' de ' + etiquetteMonnaie(v).replace(NBSP, ' ')).join(', ')}">${dessins.join('')}</svg>`;
}

// Polygone dont chaque côté porte sa longueur (en cm), écrite à côté de lui : on lit le dessin en noir et
// blanc, sans couleur. `forme` : 'carre' (cotes : [c] ou 4 valeurs), 'rectangle' ([L, l] ou 4 valeurs, dans
// l'ordre du tour), 'triangle' (3 valeurs) ou 'pentagone' (5 valeurs, dans l'ordre du tour). Carré, rectangle
// et triangle sont à l'échelle ; le pentagone est une figure à peu près proportionnée, pas exacte.
// Chaque côté est un `<text class="cote">` (avec `data-cm`), placé hors de la figure, du côté extérieur.
export function polygoneCote({ cotes, forme, taille = 150 } = {}) {
  const NB = '\u00a0';
  let c = cotes.map(Number);
  if (forme === 'carre' && c.length === 1) c = [c[0], c[0], c[0], c[0]];
  if (forme === 'rectangle' && c.length === 2) c = [c[0], c[1], c[0], c[1]];
  const attendu = { carre: 4, rectangle: 4, triangle: 3, pentagone: 5 }[forme];
  if (!attendu || c.length !== attendu) throw new Error(`polygoneCote : ${forme} demande ${attendu} côtés`);

  // Sommets dans un repère quelconque (l'axe y vers le haut), puis mis à l'échelle dans la boîte du dessin.
  let pts;
  if (forme === 'carre' || forme === 'rectangle') {
    pts = [[0, 0], [c[0], 0], [c[0], c[1]], [0, c[1]]];
  } else if (forme === 'triangle') {
    const [a, b, d] = c;                        // AB = a, BC = b, CA = d
    const x = (a * a + d * d - b * b) / (2 * a);
    pts = [[0, 0], [a, 0], [x, Math.sqrt(Math.max(d * d - x * x, 0))]];
  } else {
    // Pentagone : cinq sommets sur un cercle, rayon un peu variable selon la longueur du côté qui suit ; le premier côté est en bas.
    const m = c.reduce((s, v) => s + v, 0) / 5;
    pts = c.map((v, k) => {
      const ang = (-126 * Math.PI) / 180 + (2 * Math.PI * k) / 5, r = 1 + 0.16 * Math.max(-1, Math.min(1, (v - m) / m));
      return [Math.cos(ang) * r, Math.sin(ang) * r];
    });
  }

  const W = 220, H = 138, boiteL = 124, boiteH = 74, cx = W / 2, cy = H / 2;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const ech = Math.min(boiteL / (x1 - x0 || 1), boiteH / (y1 - y0 || 1));
  const P = pts.map(([x, y]) => [cx + (x - (x0 + x1) / 2) * ech, cy - (y - (y0 + y1) / 2) * ech]);
  const g = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];

  const etiquettes = P.map((p, k) => {
    const q = P[(k + 1) % P.length];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    let nx = -(q[1] - p[1]), ny = q[0] - p[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if (nx * (mx - g[0]) + ny * (my - g[1]) < 0) { nx = -nx; ny = -ny; }   // normale tournée vers l'extérieur
    const texte = `${c[k]}${NB}cm`;
    const dist = 5 + Math.abs(nx) * (texte.length * 3.9 + 2) + Math.abs(ny) * 6;
    return `<text class="cote" data-cm="${c[k]}" x="${(mx + nx * dist).toFixed(1)}" y="${(my + ny * dist + 4.2).toFixed(1)}" font-size="13" font-weight="700" fill="#222" text-anchor="middle">${texte}</text>`;
  });

  // Petits angles droits pour le carré et le rectangle.
  const droits = (forme === 'carre' || forme === 'rectangle') ? P.map((p, k) => {
    const a = P[(k + 3) % 4], b = P[(k + 1) % 4], t = 7;
    const u = [(a[0] - p[0]) / Math.hypot(a[0] - p[0], a[1] - p[1]), (a[1] - p[1]) / Math.hypot(a[0] - p[0], a[1] - p[1])];
    const v = [(b[0] - p[0]) / Math.hypot(b[0] - p[0], b[1] - p[1]), (b[1] - p[1]) / Math.hypot(b[0] - p[0], b[1] - p[1])];
    return `<path d="M${(p[0] + u[0] * t).toFixed(1)} ${(p[1] + u[1] * t).toFixed(1)} L${(p[0] + (u[0] + v[0]) * t).toFixed(1)} ${(p[1] + (u[1] + v[1]) * t).toFixed(1)} L${(p[0] + v[0] * t).toFixed(1)} ${(p[1] + v[1] * t).toFixed(1)}" fill="none" stroke="#222" stroke-width="1.4"/>`;
  }).join('') : '';

  const nom = { carre: 'Carré', rectangle: 'Rectangle', triangle: 'Triangle', pentagone: 'Pentagone' }[forme];
  return `<svg class="polygone-cote" data-forme="${forme}" data-cotes="${c.join(',')}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
    width="${taille}" height="${Math.round((taille * H) / W)}" role="img" aria-label="${nom} dont les côtés mesurent ${c.map((v) => `${v} cm`).join(', ')}">
    <polygon points="${P.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="#fff" stroke="#222" stroke-width="2.4" stroke-linejoin="round"/>
    ${droits}${etiquettes.join('')}
  </svg>`;
}

// Horloge à aiguilles : un cadran rond (12 chiffres, 60 graduations dont 12 plus marquées), la petite
// aiguille des heures (courte, épaisse, avancée avec les minutes) et la grande aiguille des minutes
// (longue, fine). `aiguilles: false` donne un cadran vierge. Les angles se lisent dans l'attribut
// `transform` des groupes `.aiguille-heures` et `.aiguille-minutes` (0° = midi, sens des aiguilles).
// `titre` remplace le texte lu par les lecteurs d'écran (utile quand l'heure est la réponse à trouver).
export function horloge({ heures, minutes, taille = 120, aiguilles = true, chiffres = true, titre } = {}) {
  if (aiguilles && (!Number.isInteger(heures) || !Number.isInteger(minutes) || heures < 0 || heures > 24 || minutes < 0 || minutes > 59)) {
    throw new Error(`horloge : heure impossible (${heures} h ${minutes})`);
  }
  const C = 50, f = (v) => v.toFixed(2).replace(/\.?0+$/, '');
  const point = (angle, r) => [C + r * Math.sin((angle * Math.PI) / 180), C - r * Math.cos((angle * Math.PI) / 180)];

  let graduations = '';
  for (let k = 0; k < 60; k++) {
    const grande = k % 5 === 0;
    const [x1, y1] = point(k * 6, 46), [x2, y2] = point(k * 6, grande ? 40 : 43.2);
    graduations += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${grande ? 2 : 0.8}"/>`;
  }
  let nombres = '';
  if (chiffres) {
    for (let h = 1; h <= 12; h++) {
      const [x, y] = point(h * 30, 33);
      nombres += `<text x="${f(x)}" y="${f(y + 4)}">${h}</text>`;
    }
  }

  const aH = ((heures % 12) * 30) + minutes / 2, aM = minutes * 6;
  const mains = aiguilles ? `
    <g class="aiguille-heures" transform="rotate(${f(aH)} ${C} ${C})"><line x1="${C}" y1="${C + 5}" x2="${C}" y2="${C - 24}" stroke-width="5.4" stroke-linecap="round"/></g>
    <g class="aiguille-minutes" transform="rotate(${f(aM)} ${C} ${C})"><line x1="${C}" y1="${C + 8}" x2="${C}" y2="${C - 39}" stroke-width="2" stroke-linecap="round"/></g>` : '';
  const texte = titre || (aiguilles ? `Horloge à aiguilles : ${heures % 12 || 12} heures ${minutes} minutes` : 'Cadran d’horloge vierge');

  return `<svg class="horloge" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${taille}" height="${taille}" role="img" aria-label="${texte}">
    <circle cx="${C}" cy="${C}" r="48.2" fill="#fff" stroke="#222" stroke-width="2.6"/>
    <g stroke="#222" stroke-linecap="butt">${graduations}</g>
    <g fill="#222" font-family="Trebuchet MS, Verdana, sans-serif" font-size="9" font-weight="700" text-anchor="middle">${nombres}</g>
    <g stroke="#222" fill="none">${mains}</g>
    <circle cx="${C}" cy="${C}" r="3.4" fill="#222"/>
  </svg>`;
}

// Ligne du temps : une droite horizontale avec l'horaire de départ à gauche et, au-dessus, un arc de saut
// annoté par étape (« + 20 min » jusqu'à « 10 h », puis « + 1 h »…), comme le schéma de la fiche monnaie.
//   debut  : horaire de départ, déjà écrit (« 9 h 40 ») ;
//   fin    : horaire d'arrivée, écrit au bout de la droite ; absent, la droite se termine par une flèche seule ;
//   etapes : liste de { libelle, cible } ; `cible` est l'horaire atteint après le saut. Les points sont espacés
//            régulièrement (la ligne n'est pas à l'échelle) pour que les annotations ne se touchent jamais.
// Sans étape, la droite est vierge : on dessine la place des sauts, l'élève trace les siens.
// Chaque saut est un groupe `.saut` (avec `data-libelle`), chaque horaire un `<text class="horaire">`.
// Traits foncés, annotations en gras : lisible en noir et blanc.
export function ligneDuTemps({ debut, fin = null, etapes = [] } = {}) {
  const W = 360, H = 78, y = 50, x0 = 34, x1 = 326;
  const n = etapes.length;
  const noms = [debut, ...(n ? etapes.map((e, i) => (i === n - 1 && fin ? fin : e.cible)) : (fin ? [fin] : []))];
  const x = (i) => (n ? x0 + ((x1 - x0) * i) / n : (i ? x1 : x0));
  const pic = 14;
  let dessin = '';
  noms.forEach((nom, i) => {
    dessin += `<line x1="${x(i).toFixed(1)}" y1="${y - 6}" x2="${x(i).toFixed(1)}" y2="${y + 8}" stroke="#222" stroke-width="2.4"/>
    <text class="horaire" x="${x(i).toFixed(1)}" y="${y + 25}" font-size="13" font-weight="700" fill="#222" text-anchor="middle">${nom}</text>`;
  });
  etapes.forEach((e, i) => {
    const xa = x(i), xb = x(i + 1), m = (xa + xb) / 2;
    dessin += `<g class="saut" data-libelle="${e.libelle}">
      <path d="M${xa.toFixed(1)} ${y - 4} Q${m.toFixed(1)} ${y - 2 * pic - 4} ${xb.toFixed(1)} ${y - 8}" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <path d="M${(xb - 6).toFixed(1)} ${y - 14} L${xb.toFixed(1)} ${y - 5} L${(xb + 6).toFixed(1)} ${y - 14}" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <text x="${m.toFixed(1)}" y="${y - pic - 9}" font-size="13" font-weight="800" fill="#C0392B" text-anchor="middle">${e.libelle}</text></g>`;
  });
  const dit = n
    ? `Ligne du temps de ${debut} à ${noms[n]} : ${etapes.map((e) => `${e.libelle.replace(/^\+\s?/, 'plus ')} jusqu'à ${e.cible}`).join(', puis ')}`
    : `Ligne du temps vierge à partir de ${debut}${fin ? ` jusqu'à ${fin}` : ''}`;
  return `<svg class="ligne-du-temps${n ? '' : ' ligne-du-temps--vierge'}" data-debut="${debut}" data-sauts="${n}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
    role="img" aria-label="${dit.replace(/ /g, ' ')}">
    <line x1="14" y1="${y}" x2="${W - 12}" y2="${y}" stroke="#222" stroke-width="2.4"/>
    <path d="M${W - 20} ${y - 6} L${W - 11} ${y} L${W - 20} ${y + 6}" fill="none" stroke="#222" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${dessin}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Solides : perspective cavalière, arêtes cachées en pointillés        */
/* ------------------------------------------------------------------ */

export const NOMS_SOLIDES = { cube: 'cube', pave: 'pavé droit', pyramide: 'pyramide', boule: 'boule', cylindre: 'cylindre', cone: 'cône' };

const TRAIT = '#222';
const FACE_HAUT = '#f0f0f0';   // faces claires et foncées : le relief reste lisible en noir et blanc
const FACE_COTE = '#d6d6d6';
const visible = (d, remplissage = 'none') => `<path d="${d}" fill="${remplissage}" stroke="${TRAIT}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
const cache = (d) => `<path class="arete-cachee" d="${d}" fill="none" stroke="${TRAIT}" stroke-width="1.7" stroke-dasharray="4 3.2" stroke-linecap="butt"/>`;
const pts = (...p) => p.map(([x, y]) => `${x} ${y}`).join(' L');

// Un parallélépipède vu de face, un peu de dessus et de droite.
// (x, y) : coin haut gauche de la face avant ; w, h : sa largeur et sa hauteur ; (dx, dy) : décalage vers l'arrière.
function parallelepipede(x, y, w, h, dx, dy) {
  const A = [x, y], B = [x + w, y], C = [x + w, y + h], D = [x, y + h];
  const a = [x + dx, y + dy], b = [x + w + dx, y + dy], c = [x + w + dx, y + h + dy], d = [x + dx, y + h + dy];
  return [
    visible(`M${pts(A, B, b, a)} Z`, FACE_HAUT),
    visible(`M${pts(B, C, c, b)} Z`, FACE_COTE),
    visible(`M${pts(A, B, C, D)} Z`, '#fff'),
    cache(`M${pts(D, d)} L${pts(c)} M${pts(d, a)}`),
    visible(`M${pts(A, B, C, D)} Z`),   // le trait de la face avant passe par-dessus les pointillés
  ].join('');
}

function pyramideBase(A, B, C, D, S) {
  return [
    visible(`M${pts(S, B, C)} Z`, FACE_COTE),
    visible(`M${pts(S, A, B)} Z`, '#fff'),
    cache(`M${pts(A, D)} L${pts(C)} M${pts(S, D)}`),
    visible(`M${pts(A, B, C)}`),
    visible(`M${pts(S, A)} M${pts(S, B)} M${pts(S, C)}`),
  ].join('');
}

const arcBas = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
const arcHaut = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;

const DESSINS_SOLIDES = {
  cube: () => parallelepipede(10, 44, 58, 58, 32, -30),
  pave: (v) => (v === 1 ? parallelepipede(12, 38, 44, 66, 34, -26) : parallelepipede(4, 58, 84, 44, 28, -26)),
  pyramide: (v) => (v === 1 ? pyramideBase([18, 96], [66, 96], [98, 74], [50, 74], [58, 10]) : pyramideBase([8, 92], [70, 92], [106, 66], [44, 66], [57, 8])),
  boule: () => `${visible('M60 9 a46 46 0 1 0 0.01 0 Z', '#f4f4f4')}${cache(arcHaut(60, 55, 46, 13))}${visible(arcBas(60, 55, 46, 13))}`,
  cylindre: (v) => {
    const [cx, rx, ry, haut, bas] = v === 1 ? [60, 44, 12, 44, 92] : [60, 36, 11, 26, 90];
    return [
      visible(`M${cx - rx} ${haut} L${cx - rx} ${bas} A${rx} ${ry} 0 0 0 ${cx + rx} ${bas} L${cx + rx} ${haut} Z`, '#fff'),
      cache(arcHaut(cx, bas, rx, ry)),
      visible(`M${cx - rx} ${bas} A${rx} ${ry} 0 0 0 ${cx + rx} ${bas}`),
      `<ellipse cx="${cx}" cy="${haut}" rx="${rx}" ry="${ry}" fill="${FACE_HAUT}" stroke="${TRAIT}" stroke-width="2.2"/>`,
    ].join('');
  },
  cone: (v) => {
    const [pointe, bas, rx, ry] = v === 1 ? [6, 92, 30, 10] : [8, 88, 40, 12];
    return [
      visible(`M60 ${pointe} L${60 - rx} ${bas} A${rx} ${ry} 0 0 0 ${60 + rx} ${bas} Z`, '#fff'),
      cache(arcHaut(60, bas, rx, ry)),
      visible(`M${60 - rx} ${bas} A${rx} ${ry} 0 0 0 ${60 + rx} ${bas}`),
      visible(`M${60 - rx} ${bas} L60 ${pointe} L${60 + rx} ${bas}`),
    ].join('');
  },
};

// Repères du vocabulaire, sur un cube : une face, une arête, un sommet.
const REPERES_CUBE = `
  <circle cx="100" cy="14" r="3.6" fill="${TRAIT}"/>
  <path d="M104 14 L116 14" stroke="${TRAIT}" stroke-width="1.2"/>
  <text x="119" y="18" font-size="12.5" font-family="inherit" fill="${TRAIT}">un sommet</text>
  <path d="M100 46 L116 46" stroke="${TRAIT}" stroke-width="1.2"/>
  <circle cx="100" cy="46" r="2" fill="${TRAIT}"/>
  <text x="119" y="50" font-size="12.5" font-family="inherit" fill="${TRAIT}">une arête</text>
  <path d="M84 60 L116 90" stroke="${TRAIT}" stroke-width="1.2"/>
  <circle cx="84" cy="60" r="2" fill="${TRAIT}"/>
  <text x="119" y="94" font-size="12.5" font-family="inherit" fill="${TRAIT}">une face</text>`;

// `solide(nom, { taille, variante })` : 'cube', 'pave', 'pyramide', 'boule', 'cylindre' ou 'cone'.
// La variante (0 ou 1) change les proportions (pavé couché ou debout, pyramide ou cylindre plus hauts…) sans changer le solide.
export function solide(nom, { taille = 96, variante = 0, etiquette, reperes = false } = {}) {
  if (!DESSINS_SOLIDES[nom]) throw new Error(`solide : « ${nom} » inconnu`);
  const avecReperes = reperes && nom === 'cube';
  const largeur = avecReperes ? 200 : 120;
  const px = Math.round((taille * 110) / 120);
  return `<svg class="solide" data-solide="${nom}" data-variante="${variante}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} 110"
    width="${avecReperes ? Math.round(taille * largeur / 120) : taille}" height="${px}" role="img" aria-label="${etiquette || `Un ${NOMS_SOLIDES[nom]}`}">${DESSINS_SOLIDES[nom](variante)}${avecReperes ? REPERES_CUBE : ''}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Patrons du cube                                                      */
/* ------------------------------------------------------------------ */

// Cases (x, y) de chaque assemblage de six carrés. Les 11 premiers sont les patrons du cube ;
// les suivants n'en sont pas : on ne peut pas les plier en un cube (deux faces tombent au même endroit
// ou il en reste une sans place).
const rangeeDe4 = (haut, bas) => [[0, 1], [1, 1], [2, 1], [3, 1], [haut, 0], [bas, 2]];
const ASSEMBLAGES = [
  // 1 - 4 - 1 : six patrons
  rangeeDe4(0, 0), rangeeDe4(0, 1), rangeeDe4(0, 2), rangeeDe4(0, 3), rangeeDe4(1, 1), rangeeDe4(1, 2),
  // 2 - 3 - 1 : trois patrons
  ...[1, 2, 3].map((c) => [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [c, 2]]),
  // 2 - 2 - 2 et 3 - 3
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
  // pas des patrons
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],                 // une ligne de 6
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],                 // un rectangle 2 × 3
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1]],                 // une ligne de 5 et un carré
  [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [0, 2]],                 // un « L » : deux faces au même endroit
  [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1]],                 // deux carrés côte à côte du même côté
  [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1]],                 // deux carrés du même côté de la rangée
  [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [1, 2]],                 // une colonne de deux sous la rangée
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2]],                 // un escalier plein
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [0, 2]],                 // quatre carrés en bloc
];
export const NB_PATRONS = 11;
export const NB_ASSEMBLAGES = ASSEMBLAGES.length;

// Le patron se plie-t-il en cube ? On fait « rouler » un dé sur les cases : chaque case reçoit la face
// qui touche la table, et il faut six faces différentes. Quatre carrés en bloc ne se plient jamais.
function sePlieEnCube(cases) {
  const cle = (x, y) => `${x},${y}`;
  const ensemble = new Set(cases.map(([x, y]) => cle(x, y)));
  if (ensemble.size !== 6) return false;
  if (cases.some(([x, y]) => ensemble.has(cle(x + 1, y)) && ensemble.has(cle(x, y + 1)) && ensemble.has(cle(x + 1, y + 1)))) return false;
  const rouler = {
    E: (d) => ({ ...d, h: d.o, b: d.e, e: d.h, o: d.b }), O: (d) => ({ ...d, h: d.e, b: d.o, e: d.b, o: d.h }),
    S: (d) => ({ ...d, h: d.n, b: d.s, s: d.h, n: d.b }), N: (d) => ({ ...d, h: d.s, b: d.n, n: d.h, s: d.b }),
  };
  const vus = new Map([[cle(...cases[0]), { h: 1, b: 2, n: 3, s: 4, e: 5, o: 6 }]]);
  const file = [cases[0]];
  while (file.length) {
    const [x, y] = file.shift();
    for (const [dx, dy, sens] of [[1, 0, 'E'], [-1, 0, 'O'], [0, 1, 'S'], [0, -1, 'N']]) {
      const k = cle(x + dx, y + dy);
      if (ensemble.has(k) && !vus.has(k)) { vus.set(k, rouler[sens](vus.get(cle(x, y)))); file.push([x + dx, y + dy]); }
    }
  }
  return vus.size === 6 && new Set([...vus.values()].map((d) => d.b)).size === 6;
}

const normaliser = (cases) => {
  const mx = Math.min(...cases.map((c) => c[0])), my = Math.min(...cases.map((c) => c[1]));
  return cases.map(([x, y]) => [x - mx, y - my]);
};

// `patronCube(numero, { taille, quart, miroir })` : l'assemblage n° `numero` (0 à NB_ASSEMBLAGES - 1), tourné de `quart`
// quarts de tour et retourné si `miroir`. Retourne { svg, estPatron, cases }. L'assemblage est toujours posé en largeur.
export function patronCube(numero, { taille = 120, quart = 0, miroir = false } = {}) {
  if (!ASSEMBLAGES[numero]) throw new Error(`patronCube : assemblage ${numero} inconnu`);
  let cases = ASSEMBLAGES[numero].map((c) => [...c]);
  if (miroir) cases = normaliser(cases.map(([x, y]) => [-x, y]));
  for (let i = 0; i < quart; i++) cases = normaliser(cases.map(([x, y]) => [-y, x]));
  let colonnes = Math.max(...cases.map((c) => c[0])) + 1, lignes = Math.max(...cases.map((c) => c[1])) + 1;
  if (lignes > colonnes) { cases = normaliser(cases.map(([x, y]) => [-y, x])); [colonnes, lignes] = [lignes, colonnes]; }
  const estPatron = sePlieEnCube(cases);
  const u = Math.min(94 / colonnes, 58 / lignes, 22);
  const x0 = (100 - colonnes * u) / 2, y0 = (64 - lignes * u) / 2;
  const carres = cases.map(([x, y]) => `<rect x="${(x0 + x * u).toFixed(2)}" y="${(y0 + y * u).toFixed(2)}" width="${u.toFixed(2)}" height="${u.toFixed(2)}" fill="#fff" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`).join('');
  const svg = `<svg class="patron" data-assemblage="${numero}" data-patron="${estPatron ? 'oui' : 'non'}" data-cases="${cases.map((c) => c.join(',')).join(';')}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 64"
    width="${taille}" height="${Math.round(taille * 0.64)}" role="img" aria-label="Assemblage de six carrés">${carres}</svg>`;
  return { svg, estPatron, cases };
}

/* ------------------------------------------------------------------ */
/* Figures planes : polygones, non-polygones, cercle                    */
/* ------------------------------------------------------------------ */

const TRAIT_PLAN = '#222';
const ROUGE_PLAN = '#C0392B';

// Sommets des polygones (boîte de dessin 120 × 100). Toutes les formes sont convexes ;
// chaque nom a plusieurs variantes (régulières ou non) pour que deux figures du même nom ne se ressemblent pas.
const POLYGONES = {
  triangle: [
    [[60, 10], [10, 88], [110, 88]],
    [[18, 16], [108, 68], [24, 90]],
    [[22, 12], [22, 88], [106, 88]],
  ],
  quadrilatere: [
    [[32, 20], [92, 20], [112, 84], [10, 84]],
    [[60, 8], [108, 50], [60, 92], [12, 50]],
    [[14, 24], [100, 12], [112, 76], [30, 90]],
    [[10, 22], [110, 22], [110, 78], [10, 78]],
  ],
  pentagone: [
    [[60, 8], [108, 43], [90, 90], [30, 90], [12, 43]],
    [[20, 30], [62, 8], [108, 34], [96, 88], [28, 84]],
    [[10, 42], [60, 10], [110, 42], [92, 90], [28, 90]],
  ],
  hexagone: [
    [[32, 12], [88, 12], [114, 50], [88, 88], [32, 88], [6, 50]],
    [[22, 16], [84, 10], [112, 42], [100, 84], [44, 90], [8, 58]],
  ],
};

// Figures qui ne sont pas des polygones : une ligne qui ne se ferme pas, ou une figure fermée avec une partie courbe.
const NON_POLYGONES = {
  cercle: [() => '<circle cx="60" cy="50" r="38" fill="#fff"/>'],
  ovale: [
    () => '<ellipse cx="60" cy="50" rx="52" ry="32" fill="#fff"/>',
    () => '<ellipse cx="60" cy="50" rx="50" ry="29" fill="#fff" transform="rotate(-24 60 50)"/>',
  ],
  'ligne ouverte': [
    () => '<polyline points="10,82 34,22 60,78 84,20 110,70" fill="none" stroke-linecap="round"/>',
    () => '<polyline points="64,80 22,80 22,22 98,22 98,80" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  ],
  'courbe fermée': [
    () => '<path d="M18 68 L18 12 L102 12 L102 68 A42 26 0 0 1 18 68 Z" fill="#fff"/>',
    () => '<path d="M60 8 L108 70 Q60 108 12 70 Z" fill="#fff"/>',
  ],
  'demi-disque': [
    () => '<path d="M8 76 A52 52 0 0 1 112 76 Z" fill="#fff"/>',
    () => '<path d="M72 8 A44 44 0 0 1 72 92 Z" fill="#fff"/>',
  ],
};
const ARTICLE_FIGURE = {
  triangle: 'un triangle', quadrilatere: 'un quadrilatère', pentagone: 'un pentagone', hexagone: 'un hexagone',
  cercle: 'un cercle', ovale: 'un ovale', 'ligne ouverte': 'une ligne ouverte', 'courbe fermée': 'une courbe fermée', 'demi-disque': 'un demi-disque',
};
export const FIGURES_POLYGONES = Object.keys(POLYGONES);
export const FIGURES_NON_POLYGONES = Object.keys(NON_POLYGONES);
export const NB_VARIANTES_FIGURE = Object.fromEntries([...Object.entries(POLYGONES), ...Object.entries(NON_POLYGONES)].map(([n, v]) => [n, v.length]));

// `figurePlane(nom, { taille, variante, etiquette, reperes })` : une figure en SVG, traits nets, fond blanc.
// Polygones : 'triangle', 'quadrilatere', 'pentagone', 'hexagone'. Autres : 'cercle', 'ovale', 'ligne ouverte',
// 'courbe fermée', 'demi-disque'. Retourne { svg, estPolygone, cotes, sommets, nom, variante } (cotes et sommets
// valent null pour une figure qui n'est pas un polygone). Le `<svg>` porte `data-figure`, `data-polygone`
// ('oui' ou 'non'), `data-cotes`, `data-sommets` ; pour un polygone, `<polygon points>` donne les sommets.
// `reperes: true` (polygones seulement) dessine la figure avec les mots « un sommet » et « un côté ».
export function figurePlane(nom, { taille = 96, variante = 0, etiquette, reperes = false } = {}) {
  const poly = POLYGONES[nom], autre = NON_POLYGONES[nom];
  if (!poly && !autre) throw new Error(`figurePlane : « ${nom} » inconnue`);
  const liste = poly || autre;
  const v = ((variante % liste.length) + liste.length) % liste.length;
  const estPolygone = !!poly;
  const attrs = `fill="#fff" stroke="${TRAIT_PLAN}" stroke-width="3" stroke-linejoin="miter"`;
  let corps, cotes = null, sommets = null;
  const dec = reperes && estPolygone ? 70 : 0;
  if (estPolygone) {
    const P = liste[v].map(([x, y]) => [x + dec, y]);
    cotes = sommets = P.length;
    corps = `<polygon points="${P.map((p) => p.join(',')).join(' ')}" ${attrs}/>`;
    if (reperes) {
      const S = P[0], a = P[2], b = P[3], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      corps += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${TRAIT_PLAN}" stroke-width="6" stroke-linecap="round"/>`
        + `<circle cx="${S[0]}" cy="${S[1]}" r="4.6" fill="${TRAIT_PLAN}"/>`
        + `<line x1="52" y1="19" x2="${S[0] - 5}" y2="${S[1] - 2}" stroke="${TRAIT_PLAN}" stroke-width="1.6"/>`
        + `<text x="2" y="16" font-size="13" font-weight="700" fill="#222">un sommet</text>`
        + `<line x1="${m[0] + 7}" y1="${m[1] + 2}" x2="${m[0] + 20}" y2="${m[1] + 4}" stroke="${TRAIT_PLAN}" stroke-width="1.6"/>`
        + `<text x="${m[0] + 24}" y="${m[1] + 9}" font-size="13" font-weight="700" fill="#222">un côté</text>`;
    }
  } else {
    const dessin = liste[v]();
    corps = dessin.replace(/^<(\w[\w-]*)/, `<$1 stroke="${TRAIT_PLAN}" stroke-width="3" stroke-linejoin="miter"`);
  }
  const L = reperes && estPolygone ? 250 : 120, H = 100;
  const libelle = etiquette || `Figure : ${ARTICLE_FIGURE[nom]}`;
  const svg = `<svg class="figure-plane" data-figure="${nom}" data-variante="${v}" data-polygone="${estPolygone ? 'oui' : 'non'}"${estPolygone ? ` data-cotes="${cotes}" data-sommets="${sommets}"` : ''} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${taille}" height="${Math.round((taille * H) / L)}" role="img" aria-label="${libelle}">${corps}</svg>`;
  return { svg, estPolygone, cotes, sommets, nom, variante: v };
}

export const PX_PAR_CM = 37.8;   // 1 cm à 96 dpi : un cercle dessiné « à l'échelle » mesure ce rayon à l'impression

// `cercle({ rayon, centre, rayonTrace, diametreTrace, taille })` : un cercle de `rayon` cm avec son centre marqué
// (le point `nom`, « O » par défaut), et, selon les options, un rayon ou un diamètre tracé et coté (« r = 3 cm »).
// `lettres: true` ajoute les points A (bout du rayon), B et C (bouts du diamètre).
// Avec `echelle` (pixels par centimètre, ex. PX_PAR_CM), le rayon du cercle vaut `rayon × echelle` : il est à l'échelle
// et la taille de l'image est fixée en pixels, `largeur` et `hauteur` en pixels la prolongent d'un espace vide
// autour du cercle (le centre reste au milieu). `trace: false` ne dessine que le centre (espace où l'élève trace).
// Le `<svg>` porte `data-rayon`, `data-diametre` (en cm) et le `<circle>` du tracé a pour attribut `r` son rayon en pixels.
export function cercle({ rayon, centre = true, rayonTrace = false, diametreTrace = false, taille = 150, nom = 'O', lettres = false,
  echelle, largeur, hauteur, trace = true, couleur = TRAIT_PLAN } = {}) {
  const cm = (x) => `${String(x).replace('.', ',')} cm`;
  const diametre = rayon * 2;
  let W, H, R;
  if (echelle) {
    R = rayon * echelle;
    W = largeur || Math.round(2 * R + 20); H = hauteur || Math.round(2 * R + 20);
  } else {
    W = 150; H = 112; R = 44;
  }
  const cx = W / 2, cy = H / 2;
  const txt = (x, y, t, ancre = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${echelle ? 14 : 10.5}" font-weight="700" fill="#222" text-anchor="${ancre}">${t}</text>`;
  const point = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.3" fill="#222"/>`;
  let corps = '';
  if (trace) corps += `<circle class="trace-cercle" cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${couleur}" stroke-width="${echelle ? 2.4 : 3}"/>`;
  if (trace && diametreTrace) {
    corps += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#222" stroke-width="2"/>`;
    if (lettres) corps += point(cx - R, cy) + point(cx + R, cy) + txt(cx - R - 9, cy + 5, 'B') + txt(cx + R + 9, cy + 5, 'C');
    corps += txt(cx, cy + 15, `${lettres ? '' : 'd = '}${cm(diametre)}`);
  }
  if (trace && rayonTrace) {
    const ang = (diametreTrace ? -50 : -30) * Math.PI / 180;
    const ax = cx + R * Math.cos(ang), ay = cy + R * Math.sin(ang);
    corps += `<line x1="${cx}" y1="${cy}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="#222" stroke-width="2"/>`;
    const mx = cx + (R / 2) * Math.cos(ang) + Math.sin(ang) * 6, my = cy + (R / 2) * Math.sin(ang) - Math.cos(ang) * 6;
    if (lettres) corps += point(ax, ay) + txt(ax + 5, ay - 5, 'A', 'start');
    corps += txt(diametreTrace && !echelle ? cx + 15 : mx - 2, diametreTrace && !echelle ? cy - 20 : my + 1, `${lettres ? '' : 'r = '}${cm(rayon)}`, 'end');
  }
  if (centre) corps += point(cx, cy) + (nom ? txt(cx - 8, cy - 6, nom) : '');
  const dim = echelle ? ` width="${W}" height="${H}"` : ` width="${taille}" height="${Math.round((taille * H) / W)}"`;
  return `<svg class="cercle-fig" data-rayon="${rayon}" data-diametre="${diametre}" data-trace="${trace ? 'oui' : 'non'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${dim} role="img" aria-label="${trace ? `Cercle de rayon ${cm(rayon)}` : `Le point ${nom}`}">${corps}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Symétrie : figures avec ou sans axe, quadrillages à compléter       */
/* ------------------------------------------------------------------ */

// Figures dessinées dans un carré de 100 × 100 ; chaque figure donne ses axes de symétrie
// (segments [x1, y1, x2, y2], un peu plus longs que la figure) et leur nombre.
const ptsSym = (liste) => liste.map((p) => p.join(',')).join(' ');
const polySym = (liste) => `<polygon points="${ptsSym(liste)}"/>`;
const AXE_V = [50, 4, 50, 96], AXE_H = [4, 50, 96, 50];

const ETOILE = (() => {
  const c = [50, 55], sommets = [], axes = [];
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 43 : 17, a = (-90 + 36 * k) * Math.PI / 180;
    sommets.push([+(c[0] + r * Math.cos(a)).toFixed(2), +(c[1] + r * Math.sin(a)).toFixed(2)]);
  }
  for (let k = 0; k < 5; k++) {
    const a = (-90 + 72 * k) * Math.PI / 180;
    axes.push([+(c[0] + 47 * Math.cos(a)).toFixed(2), +(c[1] + 47 * Math.sin(a)).toFixed(2), +(c[0] - 30 * Math.cos(a)).toFixed(2), +(c[1] - 30 * Math.sin(a)).toFixed(2)]);
  }
  return { sommets, axes };
})();

const SPIRALE = (() => {
  const p = [];
  for (let t = 0; t <= 2.75 * 2 * Math.PI; t += 0.25) {
    const r = 3 + 37 * t / (2.75 * 2 * Math.PI);
    p.push([+(50 + r * Math.cos(t)).toFixed(1), +(50 + r * Math.sin(t)).toFixed(1)]);
  }
  return p;
})();

const FIGURES_SYM = {
  // avec axe(s)
  'cœur': { article: 'un cœur', axes: [AXE_V], corps: '<path d="M50 88 C14 62 8 36 26 21 C38 11 48 17 50 29 C52 17 62 11 74 21 C92 36 86 62 50 88 Z"/>' },
  'triangle isocèle': { article: 'un triangle isocèle', axes: [AXE_V], corps: polySym([[50, 12], [88, 88], [12, 88]]) },
  'carré': { article: 'un carré', axes: [AXE_V, AXE_H, [8, 8, 92, 92], [92, 8, 8, 92]], corps: '<rect x="20" y="20" width="60" height="60"/>' },
  'rectangle': { article: 'un rectangle', axes: [AXE_V, AXE_H], corps: '<rect x="10" y="29" width="80" height="42"/>' },
  'losange': { article: 'un losange', axes: [AXE_V, AXE_H], corps: polySym([[50, 8], [86, 50], [50, 92], [14, 50]]) },
  'cercle': { article: 'un cercle', infini: true, axes: [AXE_V, AXE_H, [8, 8, 92, 92], [92, 8, 8, 92]], corps: '<circle cx="50" cy="50" r="40"/>' },
  'étoile': { article: 'une étoile', axes: ETOILE.axes, corps: polySym(ETOILE.sommets) },
  'flèche': { article: 'une flèche', axes: [AXE_V], corps: polySym([[50, 8], [86, 44], [62, 44], [62, 92], [38, 92], [38, 44], [14, 44]]) },
  'sablier': { article: 'un sablier', axes: [AXE_V, AXE_H], corps: polySym([[22, 10], [78, 10], [54, 50], [78, 90], [22, 90], [46, 50]]) },
  'lettre A': { article: 'la lettre A', axes: [AXE_V], corps: polySym([[12, 90], [40, 12], [60, 12], [88, 90], [70, 90], [64, 72], [36, 72], [30, 90]]) + polySym([[42, 58], [58, 58], [50, 34]]), trou: true },
  'lettre M': { article: 'la lettre M', axes: [AXE_V], corps: polySym([[14, 88], [14, 14], [30, 14], [50, 52], [70, 14], [86, 14], [86, 88], [70, 88], [70, 44], [54, 78], [46, 78], [30, 44], [30, 88]]) },
  'lettre T': { article: 'la lettre T', axes: [AXE_V], corps: polySym([[15, 15], [85, 15], [85, 33], [59, 33], [59, 88], [41, 88], [41, 33], [15, 33]]) },
  'lettre H': { article: 'la lettre H', axes: [AXE_V, AXE_H], corps: polySym([[18, 10], [36, 10], [36, 41], [64, 41], [64, 10], [82, 10], [82, 90], [64, 90], [64, 59], [36, 59], [36, 90], [18, 90]]) },
  'croix': { article: 'une croix', axes: [AXE_V, AXE_H, [8, 8, 92, 92], [92, 8, 8, 92]], corps: polySym([[38, 8], [62, 8], [62, 38], [92, 38], [92, 62], [62, 62], [62, 92], [38, 92], [38, 62], [8, 62], [8, 38], [38, 38]]) },
  // sans axe
  'parallélogramme': { article: 'un parallélogramme', axes: [], corps: polySym([[28, 24], [92, 24], [72, 76], [8, 76]]) },
  'lettre F': { article: 'la lettre F', axes: [], corps: polySym([[22, 10], [80, 10], [80, 26], [40, 26], [40, 44], [70, 44], [70, 60], [40, 60], [40, 90], [22, 90]]) },
  'lettre L': { article: 'la lettre L', axes: [], corps: polySym([[25, 10], [43, 10], [43, 72], [80, 72], [80, 90], [25, 90]]) },
  'lettre R': { article: 'la lettre R', axes: [], corps: polySym([[22, 10], [66, 10], [80, 22], [80, 44], [68, 56], [84, 90], [66, 90], [52, 58], [40, 58], [40, 90], [22, 90]]) + polySym([[40, 25], [40, 43], [62, 43], [63, 41], [63, 27], [62, 25]]), trou: true },
  'forme quelconque': { article: 'une forme quelconque', axes: [], corps: polySym([[14, 58], [26, 22], [58, 10], [90, 36], [74, 62], [80, 90], [40, 80]]) },
  'triangle quelconque': { article: 'un triangle quelconque', axes: [], corps: polySym([[12, 86], [82, 86], [58, 16]]) },
  'spirale': { article: 'une spirale', axes: [], ouverte: true, corps: `<polyline points="${ptsSym(SPIRALE)}"/>` },
};
export const FIGURES_SYMETRIQUES = Object.keys(FIGURES_SYM).filter((n) => FIGURES_SYM[n].axes.length > 0);
export const FIGURES_ASYMETRIQUES = Object.keys(FIGURES_SYM).filter((n) => FIGURES_SYM[n].axes.length === 0);
export const nbAxesFigure = (nom) => (FIGURES_SYM[nom].infini ? Infinity : FIGURES_SYM[nom].axes.length);

// `figureSymetrie(nom, { taille, axes, plie, couleurAxe })` : une figure en SVG, traits nets, fond blanc, lisible en noir et blanc.
// Retourne { svg, nbAxes, nom } ; `nbAxes` vaut Infinity pour le cercle. Le `<svg>` porte `data-figure` et `data-axes`
// (le nombre d'axes, « infini » pour le cercle). `axes: true` trace les axes en pointillés (`<line class="axe-symetrie">`).
// `plie: true` dessine la figure pliée le long de son premier axe vertical : la moitié gauche, avec le pli en trait plein.
export function figureSymetrie(nom, { taille = 80, axes = false, plie = false, couleurAxe = '#C0392B' } = {}) {
  const f = FIGURES_SYM[nom];
  if (!f) throw new Error(`figureSymetrie : « ${nom} » inconnue`);
  const nbAxes = nbAxesFigure(nom);
  const fond = f.ouverte ? 'fill="none"' : 'fill="#fff"';
  const trait = `stroke="${TRAIT_PLAN}" stroke-width="3" stroke-linejoin="miter" stroke-linecap="round"`;
  let corps = `<g ${fond} ${trait}>${f.corps}</g>`;
  if (plie) {
    const id = `plie-${nom.replace(/[^a-z]/gi, '')}`;
    corps = `<clipPath id="${id}"><rect x="0" y="0" width="50" height="100"/></clipPath><g clip-path="url(#${id})">${corps}</g>`
      + `<line x1="50" y1="${nom === 'cœur' ? 24 : 4}" x2="50" y2="${nom === 'cœur' ? 88 : 96}" stroke="${TRAIT_PLAN}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (axes) {
    corps += f.axes.map(([x1, y1, x2, y2]) => `<line class="axe-symetrie" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${couleurAxe}" stroke-width="2.4" stroke-dasharray="6 4" stroke-linecap="round"/>`).join('');
  }
  const svg = `<svg class="figure-symetrie" data-figure="${nom}" data-axes="${nbAxes === Infinity ? 'infini' : nbAxes}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${taille}" height="${taille}" role="img" aria-label="Figure : ${f.article}">${corps}</svg>`;
  return { svg, nbAxes, nom };
}

// Moitiés de figure à compléter : chaque ligne est une rangée de la moitié, la dernière colonne touche l'axe ('#' = case grisée).
const MOITIES_QUADRILLAGE = {
  6: [
    ['..#', '.##', '###', '.##', '.##', '###'],
    ['..#', '..#', '.##', '.##', '###', '###'],
    ['#.#', '###', '.##', '..#', '.##', '###'],
    ['..#', '.##', '..#', '.##', '###', '.##'],
    ['.##', '.##', '..#', '..#', '.##', '###'],
    ['###', '#..', '##.', '.##', '..#', '###'],
  ],
  8: [
    ['...#', '..##', '.###', '####', '.###', '.###', '.#.#', '.###'],
    ['...#', '...#', '..##', '..##', '.###', '.###', '####', '####'],
    ['#..#', '##.#', '.###', '..##', '..##', '.###', '##.#', '#..#'],
    ['...#', '..##', '...#', '..##', '.###', '..##', '.###', '####'],
    ['.###', '.###', '..##', '..##', '..##', '.###', '####', '####'],
    ['####', '##..', '.#..', '.###', '...#', '..##', '.###', '####'],
  ],
};
export const NB_MOITIES_QUADRILLAGE = 6;
export const TAILLES_QUADRILLAGE = Object.keys(MOITIES_QUADRILLAGE).map(Number);

// `quadrillageSymetrie({ cases, figure, axe, cote, complete, taille })` : un quadrillage carré de `cases` × `cases` (6 ou 8),
// un axe en trait fort au milieu (`axe` : 'vertical' ou 'horizontal') et, d'un seul côté de l'axe (`cote` : 'gauche' ou 'droite'
// pour un axe AXE_V, 'haut' ou 'bas' pour un axe AXE_H), la moitié de figure à compléter, formée de cases grisées
// (`figure` : numéro de 0 à 5). `complete: true` ajoute les cases symétriques, hachurées (le corrigé).
// Retourne { svg, cases, axe, cote, grises, ajoutees } (cases en coordonnées [colonne, ligne] depuis 0).
// Le `<svg>` porte `data-cases`, `data-axe`, `data-cote`, `data-complete` ; chaque case est un `<rect>` de classe
// `case-grise` ou `case-ajoutee`, avec `data-x` et `data-y` (colonne et ligne).
export function quadrillageSymetrie({ cases = 8, figure = 0, axe = 'vertical', cote, complete = false, taille } = {}) {
  const moities = MOITIES_QUADRILLAGE[cases];
  if (!moities) throw new Error(`quadrillageSymetrie : ${cases} cases non prises en charge`);
  const vert = axe === 'vertical';
  const cotes = vert ? ['gauche', 'droite'] : ['haut', 'bas'];
  const c = cotes.includes(cote) ? cote : cotes[0];
  const premier = c === cotes[0];
  const moitie = moities[((figure % moities.length) + moities.length) % moities.length];
  const demi = cases / 2;
  const grises = [], ajoutees = [];
  moitie.forEach((rang, r) => [...rang].forEach((ch, k) => {
    if (ch !== '#') return;
    // k : colonne de la moitié (la dernière touche l'axe) ; u = distance à l'axe − 1, 0 pour la case voisine de l'axe
    const u = demi - 1 - k;
    const dist = premier ? demi - 1 - u : demi + u;      // rang de la case dans la direction perpendiculaire à l'axe
    const sym = premier ? demi + u : demi - 1 - u;
    grises.push(vert ? [dist, r] : [r, dist]);
    ajoutees.push(vert ? [sym, r] : [r, sym]);
  }));
  const S = 20, P = 8, N = cases * S;
  const L = N + 2 * P;
  const px = taille || (cases === 8 ? 204 : 156);
  const rect = (x, y, classe, style) => `<rect class="${classe}" data-x="${x}" data-y="${y}" x="${P + x * S}" y="${P + y * S}" width="${S}" height="${S}" ${style}/>`;
  let corps = `<rect x="${P}" y="${P}" width="${N}" height="${N}" fill="#fff"/>`;
  corps += grises.map(([x, y]) => rect(x, y, 'case-grise', 'fill="#9A9A9A" stroke="#555" stroke-width="1"')).join('');
  if (complete) {
    corps += ajoutees.map(([x, y]) => {
      const X = P + x * S, Y = P + y * S;
      return `<g>${rect(x, y, 'case-grise case-ajoutee', 'fill="#E4E4E4" stroke="#555" stroke-width="1"')}`
        + `<path d="M${X} ${Y + S} L${X + S} ${Y} M${X} ${Y + S / 2} L${X + S / 2} ${Y} M${X + S / 2} ${Y + S} L${X + S} ${Y + S / 2}" stroke="#222" stroke-width="1.6" fill="none"/></g>`;
    }).join('');
  }
  let trame = '';
  for (let i = 0; i <= cases; i++) trame += `M${P + i * S} ${P} V${P + N} M${P} ${P + i * S} H${P + N} `;
  corps += `<path d="${trame}" stroke="#808080" stroke-width="1" fill="none"/>`;
  corps += `<rect x="${P}" y="${P}" width="${N}" height="${N}" fill="none" stroke="#222" stroke-width="2"/>`;
  const m = P + N / 2;
  corps += vert
    ? `<line class="axe-quadrillage" x1="${m}" y1="1" x2="${m}" y2="${L - 1}" stroke="#000" stroke-width="3.6" stroke-linecap="round"/>`
    : `<line class="axe-quadrillage" x1="1" y1="${m}" x2="${L - 1}" y2="${m}" stroke="#000" stroke-width="3.6" stroke-linecap="round"/>`;
  const svg = `<svg class="quadrillage-symetrie" data-cases="${cases}" data-axe="${axe}" data-cote="${c}" data-complete="${complete ? 'oui' : 'non'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}" width="${px}" height="${px}" role="img" aria-label="Quadrillage de ${cases} cases sur ${cases}, axe de symétrie ${vert ? 'vertical' : 'horizontal'}, figure à compléter">${corps}</svg>`;
  return { svg, cases, axe, cote: c, grises, ajoutees };
}

/* ------------------------------------------------------------------ */
/* Diagramme en barres                                                  */
/* ------------------------------------------------------------------ */

const espaceMilliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// `diagrammeBarres({ categories, valeurs, pas, titreY, vide, taille, hauteur })` : un diagramme en barres
// verticales, en SVG, lisible en noir et blanc (barres d'un seul gris, bords nets). L'axe vertical est gradué de
// `pas` en `pas` jusqu'au plus petit multiple de `pas` qui contient la plus grande valeur, avec une ligne de repère
// fine à chaque graduation ; les catégories sont écrites sous les barres ; les valeurs ne sont PAS écrites sur les
// barres (on les lit sur l'axe). `vide: true` ne dessine que les axes, les graduations et les catégories (l'élève
// trace les barres). `taille` : largeur affichée en px (300 par défaut) ; `hauteur` : hauteur du dessin dans le
// repère du SVG (largeur 300, hauteur 170 par défaut). `titreY` s'écrit en haut de l'axe vertical.
// Retourne { svg, max, pas, graduations, hauteurMax }. Le `<svg>` porte `data-pas`, `data-max`, `data-vide` ;
// chaque barre est un `<rect class="barre">` avec `data-categorie`, `data-valeur` et sa hauteur (`height`)
// proportionnelle à la valeur ; chaque ligne de repère est un `<line class="repere">` avec `data-valeur`.
export function diagrammeBarres({ categories, valeurs, pas, titreY = '', vide = false, taille = 300, hauteur = 170 } = {}) {
  if (!Array.isArray(categories) || !categories.length || categories.length !== valeurs.length) throw new Error('diagrammeBarres : catégories et valeurs de même nombre attendues');
  if (!(pas > 0)) throw new Error('diagrammeBarres : pas > 0 attendu');
  const W = 300, H = hauteur;
  const plusGrande = Math.max(...valeurs);
  const max = Math.max(pas, Math.ceil(plusGrande / pas) * pas);
  const graduations = max / pas;
  const gauche = 46, droite = 8, haut = titreY ? 24 : 10, bas = 22;
  const pw = W - gauche - droite, ph = H - haut - bas;
  const base = haut + ph;
  const n = categories.length, fente = pw / n, largeurBarre = Math.min(fente * 0.62, 40);
  const unite = ph / max;
  const dy = (v) => base - v * unite;
  const fmtNum = (x) => String(+x.toFixed(2));
  let corps = `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`;
  // lignes de repère et graduations
  const taillePolice = graduations >= 10 ? 8.5 : 9.5;
  for (let k = 1; k <= graduations; k++) {
    const v = k * pas, y = fmtNum(dy(v));
    corps += `<line class="repere" data-valeur="${v}" x1="${gauche}" y1="${y}" x2="${W - droite}" y2="${y}" stroke="#A8A8A8" stroke-width="0.8"/>`;
  }
  for (let k = 0; k <= graduations; k++) {
    const v = k * pas, y = fmtNum(dy(v));
    corps += `<line x1="${gauche - 4}" y1="${y}" x2="${gauche}" y2="${y}" stroke="#222" stroke-width="1.2"/>`
      + `<text class="graduation" data-valeur="${v}" x="${gauche - 7}" y="${fmtNum(dy(v) + taillePolice * 0.35)}" font-size="${taillePolice}" text-anchor="end" fill="#222">${espaceMilliers(v)}</text>`;
  }
  // barres
  if (!vide) {
    categories.forEach((c, i) => {
      const x = gauche + i * fente + (fente - largeurBarre) / 2, h = valeurs[i] * unite;
      corps += `<rect class="barre" data-categorie="${String(c).replace(/"/g, '&quot;')}" data-valeur="${valeurs[i]}" x="${fmtNum(x)}" y="${fmtNum(dy(valeurs[i]))}" width="${fmtNum(largeurBarre)}" height="${fmtNum(h)}" fill="#8C8C8C" stroke="#222" stroke-width="1.2" shape-rendering="crispEdges"/>`;
    });
  }
  // axes
  corps += `<line x1="${gauche}" y1="${haut - 4}" x2="${gauche}" y2="${base}" stroke="#222" stroke-width="1.8"/>`
    + `<line x1="${gauche}" y1="${base}" x2="${W - droite}" y2="${base}" stroke="#222" stroke-width="1.8"/>`;
  // catégories sous les barres : la police rétrécit si le mot est long
  const police = Math.min(10.5, ...categories.map((c) => (fente - 5) / (String(c).length * 0.56)));
  categories.forEach((c, i) => {
    const t = String(c), cx = gauche + i * fente + fente / 2;
    corps += `<text class="categorie" x="${fmtNum(cx)}" y="${base + 13}" font-size="${fmtNum(police)}" text-anchor="middle" fill="#222">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  });
  if (titreY) corps += `<text class="titre-axe" x="2" y="10" font-size="10" font-weight="700" fill="#222">${titreY.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  const px = taille, py = Math.round(taille * H / W);
  const svg = `<svg class="diagramme-barres" data-pas="${pas}" data-max="${max}" data-vide="${vide ? 'oui' : 'non'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${px}" height="${py}" role="img" aria-label="Diagramme en barres${titreY ? ` : ${titreY.replace(/"/g, '')}` : ''}, ${n} catégories, axe gradué de ${pas} en ${pas}${vide ? ', à compléter' : ''}" font-family="inherit">${corps}</svg>`;
  return { svg, max, pas, graduations, hauteurMax: ph };
}
