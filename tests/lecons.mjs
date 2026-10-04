// Les leçons de programme/ce2 sont à nous : aucune mention de source, de page ni de
// support dans le corps, en-tête complet, objectifs présents.
import fs from 'fs';
import path from 'path';

const RACINE = new URL('..', import.meta.url).pathname;
const DOSSIER = path.join(RACINE, 'programme/ce2');
let echecs = 0;
const verifier = (ok, message) => { if (!ok) echecs++; console.log(`${ok ? '✔' : '✘'} ${message}`); };

const fichiers = fs.readdirSync(DOSSIER, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d\d-/.test(d.name))
  .flatMap((d) => fs.readdirSync(path.join(DOSSIER, d.name)).filter((f) => f.endsWith('.md')).map((f) => path.join(d.name, f)));
verifier(fichiers.length === 16, `${fichiers.length} leçons`);

const interdits = [/photo/i, new RegExp(['liv', 'ret'].join(''), 'i'), /manuel/i, /\bp\.\s*\d/i, /\bpages?\s+\d/i, /<!--/];
for (const f of fichiers) {
  const texte = fs.readFileSync(path.join(DOSSIER, f), 'utf8');
  const m = texte.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  verifier(!!m && /^classe: CE2$/m.test(m[1]) && /^domaine: /m.test(m[1]) && /^lecon: /m.test(m[1]), `${f} : en-tête complet`);
  const corps = m ? m[2] : texte;
  const trouves = interdits.filter((re) => re.test(corps));
  verifier(trouves.length === 0, `${f} : aucune mention de source ni de page${trouves.length ? ` (${trouves.map(String).join(', ')})` : ''}`);
  verifier(/^> Je (sais|connais|reconnais)/m.test(corps), `${f} : au moins un objectif « Je sais … »`);
}
process.exit(echecs ? 1 : 0);
