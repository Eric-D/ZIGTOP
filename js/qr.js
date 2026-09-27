// Encodeur QR minimal (mode octet, correction d'erreur niveau M, versions 1 à 10).
// Écrit à la main pour que l'application reste sans dépendance et fonctionne hors
// connexion : un QR code sur une fiche imprimée doit pouvoir être fabriqué sans réseau.
// Référence : ISO/IEC 18004.

/* ---------- arithmétique dans le corps de Galois GF(256) ---------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;   // polynôme générateur du corps
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// Polynôme générateur pour `n` symboles de correction.
function generateur(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const suivant = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      suivant[j] ^= g[j];
      suivant[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = suivant;
  }
  return g;
}

// Codes de correction d'erreur (Reed-Solomon) d'un bloc de données.
function correction(donnees, nbSymboles) {
  const g = generateur(nbSymboles);
  const reste = new Array(nbSymboles).fill(0);
  for (const octet of donnees) {
    const facteur = octet ^ reste[0];
    reste.shift();
    reste.push(0);
    if (facteur !== 0) {
      for (let i = 0; i < nbSymboles; i++) reste[i] ^= mul(g[i + 1], facteur);
    }
  }
  return reste;
}

/* ---------- tables des versions (niveau M uniquement) ---------- */

// [ codes de données, symboles de correction par bloc, [blocs courts, blocs longs] ]
const VERSIONS = {
  1:  [16,  10, [1, 0]],
  2:  [28,  16, [1, 0]],
  3:  [44,  26, [1, 0]],
  4:  [64,  18, [2, 0]],
  5:  [86,  24, [2, 0]],
  6:  [108, 16, [4, 0]],
  7:  [124, 18, [4, 0]],
  8:  [154, 22, [2, 2]],
  9:  [182, 22, [3, 2]],
  10: [216, 26, [4, 1]],
};

const ALIGNEMENTS = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

/* ---------- construction des données ---------- */

function octetsDonnees(texte, version) {
  const utf8 = new TextEncoder().encode(texte);
  const [capacite] = VERSIONS[version];
  const bits = [];
  const pousser = (valeur, longueur) => {
    for (let i = longueur - 1; i >= 0; i--) bits.push((valeur >> i) & 1);
  };

  pousser(0b0100, 4);                      // mode octet
  pousser(utf8.length, version < 10 ? 8 : 16);
  for (const o of utf8) pousser(o, 8);
  pousser(0, Math.min(4, capacite * 8 - bits.length));   // terminateur
  while (bits.length % 8) bits.push(0);

  const codes = [];
  for (let i = 0; i < bits.length; i += 8) {
    codes.push(bits.slice(i, i + 8).reduce((n, b) => (n << 1) | b, 0));
  }
  const remplissage = [0xEC, 0x11];
  for (let i = 0; codes.length < capacite; i++) codes.push(remplissage[i % 2]);
  return codes;
}

// Découpe en blocs, calcule la correction, puis entrelace le tout.
function codesFinals(codes, version) {
  const [, ecParBloc, [courts, longs]] = VERSIONS[version];
  const nbBlocs = courts + longs;
  const tailleCourte = Math.floor(codes.length / nbBlocs);

  const blocs = [];
  let pos = 0;
  for (let i = 0; i < nbBlocs; i++) {
    const taille = tailleCourte + (i >= courts ? 1 : 0);
    const donnees = codes.slice(pos, pos + taille);
    pos += taille;
    blocs.push({ donnees, ec: correction(donnees, ecParBloc) });
  }

  const sortie = [];
  const maxDonnees = Math.max(...blocs.map((b) => b.donnees.length));
  for (let i = 0; i < maxDonnees; i++) {
    for (const b of blocs) if (i < b.donnees.length) sortie.push(b.donnees[i]);
  }
  for (let i = 0; i < ecParBloc; i++) {
    for (const b of blocs) sortie.push(b.ec[i]);
  }
  return sortie;
}

/* ---------- dessin de la matrice ---------- */

function matriceVide(taille) {
  return {
    modules: Array.from({ length: taille }, () => new Array(taille).fill(0)),
    reserve: Array.from({ length: taille }, () => new Array(taille).fill(false)),
    taille,
  };
}

function poserMotifs(m, version) {
  const t = m.taille;
  const poser = (x, y, v) => {
    if (x < 0 || y < 0 || x >= t || y >= t) return;
    m.modules[y][x] = v;
    m.reserve[y][x] = true;
  };

  // Les trois grands carrés de repérage, avec leur séparateur blanc.
  for (const [cx, cy] of [[0, 0], [t - 7, 0], [0, t - 7]]) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const bord = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const coeur = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        const dedans = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        poser(cx + dx, cy + dy, dedans && (bord || coeur) ? 1 : 0);
      }
    }
  }

  // Motifs d'alignement.
  const centres = ALIGNEMENTS[version];
  for (const cy of centres) {
    for (const cx of centres) {
      const coin = (cx === 6 && cy === 6) || (cx === 6 && cy === t - 7) || (cx === t - 7 && cy === 6);
      if (coin) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const bord = Math.max(Math.abs(dx), Math.abs(dy));
          poser(cx + dx, cy + dy, bord === 1 ? 0 : 1);
        }
      }
    }
  }

  // Lignes de synchronisation.
  for (let i = 8; i < t - 8; i++) {
    poser(i, 6, i % 2 === 0 ? 1 : 0);
    poser(6, i, i % 2 === 0 ? 1 : 0);
  }

  // Module toujours noir, et zones réservées aux informations de format.
  poser(8, t - 8, 1);
  for (let i = 0; i < 9; i++) {
    if (!m.reserve[i][8]) poser(8, i, 0);
    if (!m.reserve[8][i]) poser(i, 8, 0);
  }
  for (let i = 0; i < 8; i++) {
    if (!m.reserve[8][t - 1 - i]) poser(t - 1 - i, 8, 0);
    if (!m.reserve[t - 1 - i][8]) poser(8, t - 1 - i, 0);
  }

  // Informations de version (versions 7 et au-delà).
  if (version >= 7) {
    let bch = version << 12;
    for (let i = 0; i < 6; i++) {
      if (bch & (1 << (17 - i))) bch ^= 0x1F25 << (5 - i);
    }
    const bits = (version << 12) | (bch & 0xFFF);
    for (let i = 0; i < 18; i++) {
      const bit = (bits >> i) & 1;
      poser(Math.floor(i / 3), t - 11 + (i % 3), bit);
      poser(t - 11 + (i % 3), Math.floor(i / 3), bit);
    }
  }
}

function poserDonnees(m, codes) {
  const t = m.taille;
  let bitIndex = 0;
  const bitSuivant = () => {
    const octet = codes[bitIndex >> 3];
    const bit = octet === undefined ? 0 : (octet >> (7 - (bitIndex & 7))) & 1;
    bitIndex++;
    return bit;
  };

  let montant = true;
  for (let colonne = t - 1; colonne > 0; colonne -= 2) {
    if (colonne === 6) colonne--;   // la colonne de synchronisation est sautée
    for (let i = 0; i < t; i++) {
      const y = montant ? t - 1 - i : i;
      for (const x of [colonne, colonne - 1]) {
        if (m.reserve[y][x]) continue;
        m.modules[y][x] = bitSuivant();
      }
    }
    montant = !montant;
  }
}

const MASQUES = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function appliquerMasque(m, numero) {
  const copie = {
    taille: m.taille,
    reserve: m.reserve,
    modules: m.modules.map((l) => l.slice()),
  };
  const f = MASQUES[numero];
  for (let y = 0; y < m.taille; y++) {
    for (let x = 0; x < m.taille; x++) {
      if (!m.reserve[y][x] && f(x, y)) copie.modules[y][x] ^= 1;
    }
  }
  return copie;
}

function poserFormat(m, masque) {
  const t = m.taille;
  const donnees = (0b00 << 3) | masque;          // niveau M = 00
  let bch = donnees << 10;
  for (let i = 0; i < 5; i++) {
    if (bch & (1 << (14 - i))) bch ^= 0x537 << (4 - i);
  }
  const bits = ((donnees << 10) | (bch & 0x3FF)) ^ 0x5412;

  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1;
    // copie 1, autour du repère haut-gauche
    if (i < 6) m.modules[i][8] = bit;
    else if (i === 6) m.modules[7][8] = bit;
    else if (i === 7) m.modules[8][8] = bit;
    else if (i === 8) m.modules[8][7] = bit;
    else m.modules[8][14 - i] = bit;
    // copie 2, répartie sur les deux autres repères
    if (i < 8) m.modules[8][t - 1 - i] = bit;
    else m.modules[t - 15 + i][8] = bit;
  }
  m.modules[t - 8][8] = 1;
}

// Règles de pénalité de la norme : on retient le masque le plus lisible.
function penalite(m) {
  const t = m.taille;
  const g = m.modules;
  let total = 0;

  const serie = (get) => {
    for (let a = 0; a < t; a++) {
      let precedent = -1, longueur = 0;
      for (let b = 0; b < t; b++) {
        const v = get(a, b);
        if (v === precedent) longueur++;
        else { if (longueur >= 5) total += 3 + (longueur - 5); precedent = v; longueur = 1; }
      }
      if (longueur >= 5) total += 3 + (longueur - 5);
    }
  };
  serie((a, b) => g[a][b]);
  serie((a, b) => g[b][a]);

  for (let y = 0; y < t - 1; y++) {
    for (let x = 0; x < t - 1; x++) {
      const v = g[y][x];
      if (v === g[y][x + 1] && v === g[y + 1][x] && v === g[y + 1][x + 1]) total += 3;
    }
  }

  const motifs = [[1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]];
  const cherche = (get) => {
    for (let a = 0; a < t; a++) {
      for (let b = 0; b <= t - 11; b++) {
        for (const motif of motifs) {
          let ok = true;
          for (let k = 0; k < 11 && ok; k++) if (get(a, b + k) !== motif[k]) ok = false;
          if (ok) total += 40;
        }
      }
    }
  };
  cherche((a, b) => g[a][b]);
  cherche((a, b) => g[b][a]);

  let noirs = 0;
  for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) noirs += g[y][x];
  const pourcent = (noirs * 100) / (t * t);
  total += Math.floor(Math.abs(pourcent - 50) / 5) * 10;
  return total;
}

/* ---------- interface publique ---------- */

// Renvoie la matrice de modules (tableau de tableaux de 0/1), ou null si le texte
// est trop long pour les versions gérées ici.
export function matrice(texte) {
  const longueur = new TextEncoder().encode(texte).length;
  const version = Object.keys(VERSIONS)
    .map(Number)
    .find((v) => VERSIONS[v][0] - (v < 10 ? 2 : 3) >= longueur);
  if (!version) return null;

  const codes = codesFinals(octetsDonnees(texte, version), version);
  const base = matriceVide(17 + version * 4);
  poserMotifs(base, version);
  poserDonnees(base, codes);

  let meilleur = null;
  for (let masque = 0; masque < 8; masque++) {
    const essai = appliquerMasque(base, masque);
    poserFormat(essai, masque);
    const score = penalite(essai);
    if (!meilleur || score < meilleur.score) meilleur = { score, modules: essai.modules };
  }
  return meilleur.modules;
}

// QR code en SVG : net à l'impression, et sans aucune image à charger.
export function qrSVG(texte, { taille = 108, marge = 2, classe = 'qr' } = {}) {
  const grille = matrice(texte);
  if (!grille) return '';
  const n = grille.length;
  const total = n + marge * 2;
  let chemin = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (grille[y][x]) chemin += `M${x + marge} ${y + marge}h1v1h-1z`;
    }
  }
  return `<svg class="${classe}" width="${taille}" height="${taille}" viewBox="0 0 ${total} ${total}"
    role="img" aria-label="QR code vers cette fiche" shape-rendering="crispEdges">
    <rect width="${total}" height="${total}" fill="#fff"/>
    <path d="${chemin}" fill="#111"/>
  </svg>`;
}
