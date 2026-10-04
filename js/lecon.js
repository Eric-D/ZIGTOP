// La leçon : un fichier Markdown du programme, lu et mis en page dans l'application.
// Convertisseur Markdown minimal, sans dépendance. Rien du Markdown n'est injecté tel quel :
// tout texte est échappé avant d'être mis en forme.
import { ficheParId } from './fiches.js';

const echappe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Mise en forme dans une ligne : `code`, **gras**, *italique*.
function enLigne(texte) {
  let s = echappe(texte);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?!\*)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

const LISTE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const REGLE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const SEPARATEUR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const OBJECTIF = /^(Je sais|Je connais|Je reconnais)\b/;

const cellules = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

// Une liste, avec ses sous-listes (par l'indentation), à partir de lignes[i].
function liste(lignes, i) {
  const base = lignes[i].match(LISTE)[1].length;
  const ordonnee = /\d/.test(lignes[i].match(LISTE)[2]);
  let html = '';
  while (i < lignes.length) {
    const m = lignes[i].match(LISTE);
    if (!m || m[1].length < base) break;
    if (m[1].length > base) {
      // sous-liste : rattachée à l'item qui précède
      const [sous, suite] = liste(lignes, i);
      html = html.replace(/<\/li>$/, `${sous}</li>`);
      i = suite;
      continue;
    }
    html += `<li>${enLigne(m[3])}`;
    i++;
    // ligne de suite, indentée, sans puce
    while (i < lignes.length && lignes[i].trim() && /^\s+\S/.test(lignes[i]) && !LISTE.test(lignes[i])) {
      html += ` ${enLigne(lignes[i].trim())}`;
      i++;
    }
    html += '</li>';
  }
  const t = ordonnee ? 'ol' : 'ul';
  return [`<${t}>${html}</${t}>`, i];
}

export function markdownVersHTML(md) {
  const lignes = separerEntete(md).corps.split('\n');
  const sortie = [];
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) { i++; continue; }

    // bloc de code
    if (/^\s*```/.test(l)) {
      const code = [];
      i++;
      while (i < lignes.length && !/^\s*```/.test(lignes[i])) code.push(lignes[i++]);
      i++;
      sortie.push(`<pre>${echappe(code.join('\n').replace(/\s+$/, ''))}</pre>`);
      continue;
    }
    // commentaire HTML (repères de page) : on l'ignore
    if (/^\s*<!--/.test(l)) {
      while (i < lignes.length && !lignes[i].includes('-->')) i++;
      i++;
      continue;
    }
    // ligne horizontale (avant les listes : « --- » ou « * * * »)
    if (REGLE.test(l)) { sortie.push('<hr>'); i++; continue; }
    // titres : # devient h2 (le h1 de la page est le titre de la feuille)
    const t = l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (t) {
      const n = Math.min(t[1].length + 1, 4);
      sortie.push(`<h${n}>${enLigne(t[2])}</h${n}>`);
      i++;
      continue;
    }
    // citation
    if (/^\s{0,3}>/.test(l)) {
      const paragraphes = [[]];
      while (i < lignes.length && /^\s{0,3}>/.test(lignes[i])) {
        const c = lignes[i].replace(/^\s{0,3}>\s?/, '');
        if (!c.trim()) paragraphes.push([]); else paragraphes[paragraphes.length - 1].push(c.trim());
        i++;
      }
      const ps = paragraphes.filter((p) => p.length).map((p) => p.join(' '));
      if (ps.length && OBJECTIF.test(ps[0])) sortie.push(`<div class="objectif">${ps.map(enLigne).join('<br>')}</div>`);
      else sortie.push(`<blockquote>${ps.map((p) => `<p>${enLigne(p)}</p>`).join('')}</blockquote>`);
      continue;
    }
    // tableau
    if (l.includes('|') && i + 1 < lignes.length && SEPARATEUR.test(lignes[i + 1]) && lignes[i + 1].includes('-')) {
      const tete = cellules(l);
      i += 2;
      const corps = [];
      while (i < lignes.length && lignes[i].trim() && lignes[i].includes('|')) corps.push(cellules(lignes[i++]));
      sortie.push(`<table><thead><tr>${tete.map((c) => `<th>${enLigne(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${corps.map((r) => `<tr>${tete.map((_, k) => `<td>${enLigne(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    // liste
    if (LISTE.test(l)) {
      const [html, suite] = liste(lignes, i);
      sortie.push(html);
      i = suite;
      continue;
    }
    // paragraphe : jusqu'à la ligne vide ou au bloc suivant ; un retour à la ligne est conservé
    const para = [];
    while (i < lignes.length && lignes[i].trim() && !/^\s*(```|#{1,6}\s|>|<!--)/.test(lignes[i])
      && !REGLE.test(lignes[i]) && !(para.length && LISTE.test(lignes[i]))) {
      para.push(lignes[i].trim());
      i++;
    }
    sortie.push(`<p>${para.map(enLigne).join('<br>')}</p>`);
  }
  return sortie.join('\n');
}

// Retire l'en-tête YAML et en lit les champs.
export function separerEntete(md) {
  const texte = String(md).replace(/\r\n?/g, '\n');
  const m = texte.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  const meta = {};
  if (!m) return { meta, corps: texte };
  for (const ligne of m[1].split('\n')) {
    const kv = ligne.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, corps: texte.slice(m[0].length) };
}

// Lit la leçon d'une notion : { titre, html, meta }. `meta.pages` est lu mais n'est jamais affiché.
export async function chargerLecon(ficheId) {
  const f = ficheParId(ficheId);
  if (!f || !f.lecon) throw new Error('leçon inconnue');
  const rep = await fetch(f.lecon);
  if (!rep.ok) throw new Error(`leçon indisponible (${rep.status})`);
  const { meta, corps } = separerEntete(await rep.text());
  // Le premier titre répète celui de la feuille : on le retire.
  const sansTitre = corps.replace(/^\s*(<!--[\s\S]*?-->\s*)*#[ \t][^\n]*\n/, '');
  return { titre: f.titre, html: markdownVersHTML(sansTitre), meta };
}
