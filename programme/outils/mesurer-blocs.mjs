// Mesure la hauteur imprimée de chaque bloc d'exercices de chaque fiche, pour que le composeur
// de feuilles panachées (js/panache.js) sache ce qui tient sur une A4.
//
//   python3 -m http.server 8766        # depuis la racine du dépôt, dans un autre terminal
//   npm i --no-save playwright && npx playwright install chromium
//   node programme/outils/mesurer-blocs.mjs                 # imprime la table JSON
//   node programme/outils/mesurer-blocs.mjs --ecrire        # et réécrit js/hauteurs-blocs.js
//   node programme/outils/mesurer-blocs.mjs --url=http://localhost:8766
//
// Chaque bloc est rendu seul dans une .feuille, en mode impression, à 673 px de large (178 mm :
// une A4 moins ses marges). Pour chaque fiche on tire 5 graines et on parcourt toutes les
// combinaisons de ses options ; on garde le maximum observé + 4 %.
// À relancer dès qu'on ajoute une fiche, qu'on change le rendu d'un bloc ou le CSS d'impression.
import { chromium } from 'playwright';
import fs from 'fs';

const argument = (nom, defaut) => (process.argv.find((a) => a.startsWith(`--${nom}=`)) || '').split('=')[1] || defaut;
const URL_APP = argument('url', 'http://localhost:8766');
const ECRIRE = process.argv.includes('--ecrire');
const GRAINES = [101, 2024, 31415, 777777, 9999999];
const MARGE = 1.04;
const FICHIER = new URL('../../js/hauteurs-blocs.js', import.meta.url);

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 673, height: 1100 } });
await page.emulateMedia({ media: 'print' });
await page.goto(`${URL_APP}/index.html`);

const table = await page.evaluate(async ({ graines }) => {
  const { FICHES, NOMS_FORMULATIONS, tirer, objectifDe } = await import('/js/fiches.js');
  const { htmlBloc, rendrePanache } = await import('/js/panache.js');
  document.body.innerHTML = '<div class="app"><div id="mesure"></div></div>';
  const zone = document.getElementById('mesure');

  const combinaisons = (f) => (f.options || []).reduce(
    (acc, o) => acc.flatMap((x) => o.valeurs.map((v) => ({ ...x, [o.id]: v.v }))), [{}]);
  // Hauteur d'un élément, marge basse comprise : c'est ce qu'il coûte sur la page.
  const cout = (el) => el.getBoundingClientRect().height + parseFloat(getComputedStyle(el).marginBottom);

  const eleve = {}, corrige = {};
  for (const f of FICHES) {
    for (const options of combinaisons(f)) {
      for (const graine of graines) for (const nom of (f.formulations ? NOMS_FORMULATIONS : ['livret'])) {
        // On garde le maximum des formulations : la composition ne dépend pas de la formulation.
        const blocs = f.blocs(tirer(f, options, graine), { formulation: nom });
        zone.innerHTML = blocs.map((b) => `
          <section class="feuille">${htmlBloc(b, 1, 'eleve')}</section>
          <section class="feuille feuille--corrige">${htmlBloc(b, 1, 'corrige')}</section>`).join('');
        const lignes = [...zone.querySelectorAll('.feuille > .bloc')];
        eleve[f.id] ??= []; corrige[f.id] ??= [];
        blocs.forEach((_, i) => {
          eleve[f.id][i] = Math.max(eleve[f.id][i] || 0, cout(lignes[2 * i]));
          corrige[f.id][i] = Math.max(corrige[f.id][i] || 0, cout(lignes[2 * i + 1]));
        });
      }
    }
  }

  // Une ligne de mini-rappel par fiche (certains « Je sais… » tiennent sur deux lignes).
  const rappel = {};
  for (const f of FICHES) {
    for (const options of combinaisons(f)) for (const nom of (f.formulations ? NOMS_FORMULATIONS : ['livret'])) {
      const objectif = f.formulations ? objectifDe(f, tirer(f, options, graines[0]), nom) : f.objectif;
      zone.innerHTML = `<section class="feuille"><ul class="rappels"><li><strong>Exercice 1.</strong> ${objectif}</li></ul></section>`;
      rappel[f.id] = Math.max(rappel[f.id] || 0, cout(zone.querySelector('.rappels li')));
    }
  }

  // En-têtes : on met les titres les plus longs (cinq notions) pour avoir le pire cas.
  const longues = [...FICHES].sort((a, b) => b.court.length - a.court.length).slice(0, 5);
  const feuille = {
    code: 'Z000-0000-0000', notions: longues.map((f) => ({ id: f.id })), miniRappel: false,
    blocs: longues.map((f) => ({ court: f.court, consigne: '', eleve: '', corrige: '' })),
  };
  zone.innerHTML = rendrePanache([feuille], { corrige: true, identite: true, base: 'http://localhost/' });
  const [pe, pc] = zone.querySelectorAll('.feuille');
  const hauteurPage = (el) => el.getBoundingClientRect().height;
  return { eleve, corrige, rappel, page: { enteteEleve: hauteurPage(pe), enteteCorrige: hauteurPage(pc) } };
}, { graines: GRAINES });

await navigateur.close();

const majore = (x) => Math.ceil(x * MARGE);
const resultat = {
  blocs: Object.fromEntries(Object.keys(table.eleve).map((id) => [id, {
    eleve: table.eleve[id].map(majore),
    corrige: table.corrige[id].map(majore),
  }])),
  rappel: Object.fromEntries(Object.entries(table.rappel).map(([id, h]) => [id, majore(h)])),
  page: Object.fromEntries(Object.entries(table.page).map(([k, h]) => [k, majore(h)])),
};
console.log(JSON.stringify(resultat, null, 1));

if (ECRIRE) {
  const ligne = (o) => JSON.stringify(o);
  const sortie = `// Hauteurs mesurées (px, impression, 673 px de large) : max sur 5 graines et toutes les options, + 4 %.
// FICHIER GÉNÉRÉ : ne pas modifier à la main. Pour le régénérer, dans un autre terminal :
//   python3 -m http.server 8766        (depuis la racine du dépôt)
// puis :
//   node programme/outils/mesurer-blocs.mjs --ecrire
// À refaire après tout changement du rendu d'un bloc, du CSS d'impression, ou l'ajout d'une fiche.

// Par fiche : la hauteur de chaque exercice sur la page élève, puis sur le corrigé.
export const HAUTEURS_BLOCS = {
${Object.entries(resultat.blocs).map(([id, h]) => `  '${id}': { eleve: ${ligne(h.eleve)}, corrige: ${ligne(h.corrige)} },`).join('\n')}
};

// En-tête d'une feuille panachée (titre sur deux lignes, QR, ligne Nom / Date) et du corrigé (avec sa note).
export const HAUTEURS_PAGE = ${ligne(resultat.page)};

// Une ligne de mini-rappel (l'objectif « Je sais… » de la fiche), selon qu'il tient sur une ou deux lignes.
export const HAUTEURS_RAPPEL = {
${Object.entries(resultat.rappel).map(([id, h]) => `  '${id}': ${h},`).join('\n')}
};
`;
  fs.writeFileSync(FICHIER, sortie);
  console.error(`écrit : ${FICHIER.pathname}`);
}
