// Vérifie l'encodeur QR maison en relisant ses images avec un décodeur indépendant.
// Dépendances supplémentaires (hors des autres tests) :
//   npm i --no-save playwright jsqr pngjs && npx playwright install chromium
import { chromium } from 'playwright';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { qrSVG } from '../js/qr.js';

const textes = [
  'https://eric-d.github.io/ZIGTOP/?fiche=01L7-HPWP',
  'https://eric-d.github.io/ZIGTOP/?fiche=02ZZ-0001',
  'MATHOO',
  'https://eric-d.github.io/ZIGTOP/?fiche=' + 'A'.repeat(60),
];

const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 420, height: 420 } });
let echecs = 0;

for (const texte of textes) {
  const svg = qrSVG(texte, { taille: 360, marge: 4 });
  if (!svg) { console.log('✘ pas de QR pour', texte.slice(0, 40)); echecs++; continue; }
  await page.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
  const png = PNG.sync.read(await page.screenshot({ clip: { x: 0, y: 0, width: 360, height: 360 } }));
  const lu = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  const ok = lu && lu.data === texte;
  if (!ok) echecs++;
  console.log(`${ok ? '✔' : '✘'} ${texte.length} caractères → ${lu ? `« ${lu.data.slice(0, 50)} »` : 'illisible'}`);
}
await nav.close();
process.exit(echecs ? 1 : 0);
