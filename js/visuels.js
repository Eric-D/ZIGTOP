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
