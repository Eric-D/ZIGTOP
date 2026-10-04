// La leçon lue dans l'application : convertisseur Markdown, vue ?lecon=, impression.
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { markdownVersHTML } from '../js/lecon.js';
import { FICHES } from '../js/fiches.js';

const RACINE = new URL('..', import.meta.url).pathname;
const HTML = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

/* (a) le convertisseur */
const ECHANTILLON = `---
classe: CE2
pages: 14, 15
---

# Titre un

<!-- page 14 -->

> Je sais poser des additions.

> Une remarque simple.

## Titre deux

Un **mot gras** et un *mot penché* sur une ligne.
Une seconde ligne.

- premier
- deuxième avec **gras**
  - sous-point

1. un
2. deux

\`\`\`
  1
  6 8 5
+ 2 6 7
-------
  9 5 2
\`\`\`

| Unités | Dizaines |
|---|---|
| 5 | 8 |

---

### Titre trois

<script>alert("x")</script> & <b>brut</b>
`;
const h = markdownVersHTML(ECHANTILLON);
verifier(/<h2>Titre un<\/h2>/.test(h) && /<h3>Titre deux<\/h3>/.test(h) && /<h4>Titre trois<\/h4>/.test(h), 'titres # ## ###');
verifier(/<p>Un <strong>mot gras<\/strong> et un <em>mot penché<\/em> sur une ligne\.<br>Une seconde ligne\.<\/p>/.test(h), 'paragraphe, gras, italique');
verifier(/<ul><li>premier<\/li><li>deuxième avec <strong>gras<\/strong><ul><li>sous-point<\/li><\/ul><\/li><\/ul>/.test(h), 'liste à puces avec sous-liste');
verifier(/<ol><li>un<\/li><li>deux<\/li><\/ol>/.test(h), 'liste numérotée');
verifier(/<div class="objectif">Je sais poser des additions\.<\/div>/.test(h), 'citation « Je sais » rendue comme un objectif');
verifier(/<blockquote><p>Une remarque simple\.<\/p><\/blockquote>/.test(h), 'autre citation : citation simple');
verifier(h.includes('<pre>  1\n  6 8 5\n+ 2 6 7\n-------\n  9 5 2</pre>'), 'bloc de code : opération posée gardée telle quelle dans un <pre>');
verifier(/<table><thead><tr><th>Unités<\/th><th>Dizaines<\/th><\/tr><\/thead><tbody><tr><td>5<\/td><td>8<\/td><\/tr><\/tbody><\/table>/.test(h), 'tableau');
verifier(h.includes('<hr>'), 'ligne ---');
verifier(!/<script|<b>/.test(h) && h.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;b&gt;brut&lt;/b&gt;'), 'HTML brut échappé, rien d’injecté');
verifier(!h.includes('page 14') && !h.includes('pages:') && !h.includes('classe:'), 'ni commentaire de page ni en-tête YAML dans le rendu');

/* (b) la vue ?lecon= sans profil */
const LECON_ESSAI = `---
classe: CE2
domaine: Nombres et calculs
lecon: Opérations — addition posée
pages: 14, 15
---

# Nombres et calculs — Opérations — addition posée

> Je sais poser et calculer des additions.

\`\`\`
  1
  6 8 5
+ 2 6 7
\`\`\`
`;
let appels = [];
async function ouvrir(recherche, reponse) {
  const dom = new JSDOM(HTML, { url: `http://localhost/index.html${recherche}` });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true });
  globalThis.matchMedia = window.matchMedia;
  window.print = () => { window.__imprime = (window.__imprime || 0) + 1; };
  appels = [];
  globalThis.fetch = async (url) => {
    appels.push(String(url));
    return reponse(String(url));
  };
  await import(new URL('../js/app.js', import.meta.url).href + '?t=' + Math.random());
  return window;
}
const ok = (txt) => async () => ({ ok: true, status: 200, text: async () => txt });
const attendre = () => new Promise((r) => setTimeout(r, 30));
const fiche = FICHES.find((f) => f.id === 'ce2-addition-posee');

let w = await ouvrir('?lecon=ce2-addition-posee', ok(LECON_ESSAI));
let d = w.document;
await attendre();
verifier(!!d.querySelector('#impression .feuille'), 'sans profil, la vue leçon s’ouvre dans une feuille (#impression)');
verifier(d.querySelector('.feuille__titre').textContent.trim() === fiche.titre, `le titre de la notion est en tête (${fiche.titre})`);
verifier(appels.length === 1 && appels[0] === fiche.lecon, 'le fichier lu est celui de la notion (chemin relatif)');
verifier(!!d.querySelector('#impression .objectif') && /Je sais poser/.test(d.querySelector('.objectif').textContent), 'l’objectif de la leçon est rendu');
verifier(!!d.querySelector('#impression pre'), 'l’opération posée est dans un <pre>');
verifier(!/pages|14, 15/.test(d.querySelector('#impression').textContent), 'les numéros de page ne sont pas affichés');
verifier(!d.querySelector('#impression .pointilles, #impression .feuille__qr, #impression .feuille__identite'), 'ni Nom/Date ni QR code');
verifier(!d.querySelector('.no-print .btn[data-pas]') && d.querySelector('.no-print #imprimer-lecon'), 'barre Retour / Imprimer / Réviser hors impression');

/* (d) Imprimer */
d.querySelector('#imprimer-lecon').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
verifier(w.__imprime === 1, '« Imprimer » appelle window.print');

/* Réviser cette notion : coche et ouvre le pas 1 */
d.querySelector('[data-reviser-lecon]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
verifier(d.querySelector('.tunnel')?.dataset.etape === '1' && !!d.querySelector('[data-fiche="ce2-addition-posee"]:checked'),
  '« Réviser cette notion » coche la notion et ouvre le pas 1');

/* fichier indisponible : message doux */
w = await ouvrir('?lecon=ce2-addition-posee', async () => { throw new Error('hors ligne'); });
d = w.document;
await attendre();
verifier(/n’est pas encore disponible hors connexion/.test(d.querySelector('.lecon').textContent), 'fichier indisponible : message doux');

/* (c) pas 1 : plus aucun lien GitHub, et le lien ouvre la vue leçon */
const profil = {
  prenom: 'Lina', avatar: '🐼', classe: 'ce2', etoiles: 0, modules: {}, jours: [],
  serieJours: 1, badges: [], jardin: [], etoilesDepensees: 0, son: true, reglages: {},
};
w = await ouvrir('?pas=1', ok(LECON_ESSAI));
w.localStorage.setItem('mathoo.v1', JSON.stringify(profil));
w = await ouvrir('?pas=1', ok(LECON_ESSAI));
d = w.document;
verifier(!d.documentElement.innerHTML.includes('github.com'), 'pas 1 : aucun lien ne contient github.com');
const lien = d.querySelector(`a.fiche__lecon[data-lecon="ce2-addition-posee"]`);
lien.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
await attendre();
verifier(w.location.search === '?lecon=ce2-addition-posee' && !!d.querySelector('.feuille--lecon .objectif'), 'le lien « voir la leçon » ouvre la leçon dans l’application');
d.querySelector('[data-retour-lecon]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
verifier(d.querySelector('.tunnel')?.dataset.etape === '1', '« Retour » ramène au pas 1 du tunnel');

process.exit(echecs ? 1 : 0);
