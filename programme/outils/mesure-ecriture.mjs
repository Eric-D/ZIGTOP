// Relève, en mode impression, la hauteur de chaque zone où l'enfant écrit (pointillés, cases, cases V/F,
// cellules de pose, grilles) sur la page élève des 17 fiches, et signale tout ce qui est sous 8 mm (30 px).
// Hauteur retenue : pour des pointillés, la ligne (le parent) où l'enfant écrit ; pour une case dans une cellule de pose,
// la cellule ; sinon l'élément lui-même. Exclus : ligne Nom / Date (masquable), cellules de retenue (annotation de 1 chiffre).
// node mesure-ecriture.mjs [largeur=673] [minimum=30] [fiche]   (serveur sur le port 8766)
import { chromium } from 'playwright';
const LARGEUR = Number(process.argv[2] || 673), MIN = Number(process.argv[3] || 30);
const SEL = '.pointilles, .case, .case-fr, .case-vf, .case-symbole, .paire__symbole, .case-h, .reponse-cellule, .vide, .grille-sy';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: LARGEUR, height: 1200 } });
await page.emulateMedia({ media: 'print' });
await page.goto('http://localhost:8766/index.html');
const res = await page.evaluate(async ({ SEL, filtre }) => {
  const F = await import('/js/fiches.js');
  document.body.innerHTML = '<div class="app"><div id="z"></div></div>';
  const z = document.getElementById('z');
  const comb = (f) => (f.options || []).reduce((acc, o) => acc.flatMap((x) => o.valeurs.map((v) => ({ ...x, [o.id]: v.v }))), [{}]);
  const out = {};
  for (const f of F.FICHES) {
    if (filtre && f.id !== filtre) continue;
    const r = out[f.id] = {};
    for (const options of comb(f)) for (const graine of [101, 2024]) for (const rappel of [true, false])
      for (const nom of (f.formulations ? F.NOMS_FORMULATIONS : ['commune'])) {
        z.innerHTML = F.rendre(f, F.tirer(f, options, graine), { corrige: true, methode: rappel, formulation: nom, base: 'http://x/' });
        const eleve = z.querySelector('.feuille');
        for (const el of eleve.querySelectorAll(SEL)) {
          if (el.closest('svg') || el.closest('.methode') || el.closest('.feuille__identite')) continue;
          let zone = el.classList.contains('pointilles') ? el.parentElement : (el.closest('td') && !el.classList.contains('vide') ? el.closest('td') : el);
          // une ligne de texte en ligne (ou un simple <span> d'une rangée flex) : on mesure la rangée qui la porte
          while (el.classList.contains('pointilles') && zone.parentElement && zone.tagName === 'SPAN' && (getComputedStyle(zone).display === 'inline' || (getComputedStyle(zone).display === 'block' && /flex/.test(getComputedStyle(zone.parentElement).display)))) zone = zone.parentElement;
          const bb = zone.getBoundingClientRect();
          if (!bb.height) continue;
          const cle = (el.className.toString().replace(/\s+/g, '.') || el.tagName) + (zone !== el ? ' < ' + (zone.className.toString().replace(/\s+/g, '.') || zone.tagName) : '');
          const e = r[cle] ??= { min: 1e9, n: 0 };
          e.n++; if (bb.height < e.min) { e.min = Math.round(bb.height * 10) / 10; e.pire = { options, rappel, nom }; }
        }
      }
  }
  return out;
}, { SEL, filtre: process.argv[4] || '' });
await b.close();
let bas = 0;
for (const [id, r] of Object.entries(res)) {
  console.log(id);
  for (const [cle, e] of Object.entries(r)) {
    const mm = (e.min * 25.4 / 96).toFixed(1), petit = e.min < MIN;
    if (petit) bas++;
    console.log(`  ${petit ? '✘' : '✔'} ${cle.padEnd(40)} ${String(e.min).padStart(5)} px = ${mm} mm (${e.n} éléments)${petit ? ' ' + JSON.stringify(e.pire) : ''}`);
  }
}
console.log(bas ? `${bas} zone(s) sous ${MIN} px` : `Aucune zone d'écriture sous ${MIN} px (8 mm)`);
process.exit(bas ? 1 : 0);
