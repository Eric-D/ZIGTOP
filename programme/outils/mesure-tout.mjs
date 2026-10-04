// Mesure la page élève (et le corrigé) de chaque fiche × options × rappel, et 10 feuilles panachées.
// node mesure-tout.mjs [largeur=673] [limite=1000]  -> JSON sur stdout (max par fiche) + détails des dépassements
import { chromium } from 'playwright';
const LARGEUR = Number(process.argv[2] || 673), LIMITE = Number(process.argv[3] || 1000);
const GRAINES = [101, 2024, 31415];
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: LARGEUR, height: 1200 } });
await page.emulateMedia({ media: 'print' });
await page.goto('http://localhost:8766/index.html');
import fsx from 'fs';
const CSS_EXTRA = (fsx.existsSync(process.env.CSS31 || '/nonexistent') ? fsx.readFileSync(process.env.CSS31, 'utf8') : '');
if (CSS_EXTRA) await page.addStyleTag({ content: CSS_EXTRA });
const res = await page.evaluate(async ({ graines, filtre }) => {
  const F = await import('/js/fiches.js');
  const P = await import('/js/panache.js');
  document.body.innerHTML = '<div class="app"><div id="z"></div></div>';
  const z = document.getElementById('z');
  const comb = (f) => (f.options || []).reduce((acc, o) => acc.flatMap((x) => o.valeurs.map((v) => ({ ...x, [o.id]: v.v }))), [{}]);
  const mes = (html) => { z.innerHTML = html; return [...z.querySelectorAll('.feuille')].map((e) => Math.round(e.getBoundingClientRect().height)); };
  const fiches = {};
  const FILTRE = filtre;
  for (const f of F.FICHES) {
    if (FILTRE && f.id !== FILTRE) continue;
    const r = fiches[f.id] = { eleve: 0, corrige: 0, pire: null, avec: 0, sans: 0 };
    for (const options of comb(f)) for (const graine of graines) for (const rappel of [true, false])
      for (const nom of (f.formulations ? F.NOMS_FORMULATIONS : ['commune'])) {
        const [e, c] = mes(F.rendre(f, F.tirer(f, options, graine), { corrige: true, methode: rappel, formulation: nom, base: 'http://x/' }));
        { const petits = [...z.querySelectorAll('.feuille *')].filter((el) => !el.closest('svg') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 10.66).map((el) => `${el.className || el.tagName}:${(parseFloat(getComputedStyle(el).fontSize) * 0.75).toFixed(1)}pt`); for (const t of petits) (r.petits ??= {})[t] = 1; }
        r[rappel ? 'avec' : 'sans'] = Math.max(r[rappel ? 'avec' : 'sans'], e);
        if (e > r.eleve) { r.eleve = e; r.pire = { options, graine, rappel, nom }; }
        if (c > r.corrige) { r.corrige = c; r.pireC = { options, graine, rappel, nom }; }
      }
  }
  if (FILTRE) return { fiches, panaches: [] };
  // 10 feuilles panachées de 2 à 5 notions
  let etat = 20261031;
  const alea = () => { etat = (Math.imul(etat, 1103515245) + 12345) >>> 0; return etat / 2 ** 32; };
  const ids = F.FICHES.map((f) => f.id);
  const panaches = [];
  for (let k = 0; k < 10; k++) {
    const n = 2 + (k % 4), pool = [...ids], notions = [];
    while (notions.length < n) notions.push({ id: pool.splice(Math.floor(alea() * pool.length), 1)[0] });
    for (const miniRappel of [true, false]) for (const nom of F.NOMS_FORMULATIONS) {
      const c = P.composer({ notions, graine: 1000 + k, miniRappel });
      c.feuilles.forEach((fe, i) => {
        const [e, co] = mes(P.rendrePanache([fe], { formulation: nom, base: 'http://x/' }));
        panaches.push({ k, n, miniRappel, nom, feuille: i, notions: fe.notions.map((x) => x.id.replace('ce2-', '')).join('+'), eleve: e, corrige: co });
      });
    }
  }
  return { fiches, panaches };
}, { graines: GRAINES, filtre: process.argv[5] || '' });
await b.close();
const sortie = { largeur: LARGEUR, limite: LIMITE, fiches: res.fiches, panacheMax: Math.max(0, ...res.panaches.flatMap((p) => [p.eleve, p.corrige])), panaches: res.panaches };
const depasse = Object.entries(res.fiches).filter(([, r]) => r.eleve > LIMITE || r.corrige > LIMITE);
console.log(`largeur ${LARGEUR}, limite ${LIMITE}`);
for (const [id, r] of Object.entries(res.fiches)) console.log(r.petits ? `   (police < 8 pt : ${Object.keys(r.petits).join(' ')})` : '', `${r.eleve > LIMITE || r.corrige > LIMITE ? '✘' : '✔'} ${id.padEnd(26)} élève ${r.eleve} (avec rappel ${r.avec}, sans ${r.sans})  corrigé ${r.corrige}  ${r.eleve > LIMITE ? JSON.stringify(r.pire) : ''}`);
const pd = res.panaches.filter((p) => p.eleve > LIMITE || p.corrige > LIMITE);
console.log(`panachés : ${res.panaches.length} pages, max ${res.panaches.length ? sortie.panacheMax : '-'}, ${pd.length} dépassent`);
pd.slice(0, 20).forEach((p) => console.log('  ', JSON.stringify(p)));
import fs from 'fs';
fs.writeFileSync(process.argv[4] || 'mesure-tout.json', JSON.stringify(sortie, null, 1));
process.exit(depasse.length || pd.length ? 1 : 0);
