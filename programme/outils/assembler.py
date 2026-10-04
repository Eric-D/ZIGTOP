# Assemble les transcriptions page par page (programme/ce2/_transcriptions/) en un
# fichier Markdown par leçon, dans l'ordre des pages (= ordre de prise de vue), puis
# écrit l'index README.md du livret.
#
#   python3 programme/outils/assembler.py programme/ce2/_transcriptions programme/ce2
#
# Le script est volontairement sans dépendance : il relit les en-têtes YAML écrits par
# les agents de transcription (source, page, domaine, lecon, lisibilite, doublon_de).
import os, re, sys, unicodedata, json

SRC = sys.argv[1] if len(sys.argv) > 1 else 'programme/ce2/_transcriptions'
DST = sys.argv[2] if len(sys.argv) > 2 else 'programme/ce2'

# Ordre et rangement du livret (d'après son sommaire).
PLAN = [
    ('01-nombres-et-calculs', 'Nombres et calculs', [
        ('01-nombres-jusqu-a-1000',       "Les nombres jusqu'à 1 000",            ['1 000', '1000']),
        ('02-nombres-jusqu-a-10000',      "Les nombres jusqu'à 10 000",           ['10 000', '10000', 'droite gradu']),
        ('03-addition-posee',             'Opérations — addition posée',          ['addition']),
        ('04-soustraction-posee',         'Opérations — soustraction posée',      ['soustraction']),
        ('05-multiplication',             'Opérations — multiplication',          ['multiplication']),
        ('06-fractions',                  'Fractions',                            ['fraction']),
    ]),
    ('02-grandeurs-et-mesures', 'Grandeurs et mesures', [
        ('01-monnaie',     'Monnaie',     ['monnaie', 'euro']),
        ('02-longueurs',   'Longueurs',   ['longueur']),
        ('03-heures',      'Heures',      ['heure', 'horloge']),
        ('04-masses',      'Masses',      ['masse']),
        ('05-contenances', 'Contenances', ['contenance', 'litre']),
        ('06-durees',      'Durées',      ['durée', 'duree']),
    ]),
    ('03-geometrie', 'Géométrie', [
        ('01-solides',   'Solides',   ['solide']),
        ('02-polygones', 'Polygones', ['polygone', 'triangle', 'quadrilat', 'carré', 'rectangle', 'cercle', 'droite', 'angle']),
        ('03-symetrie',  'Symétrie',  ['symétrie', 'symetrie']),
    ]),
    ('04-gestion-de-donnees', 'Gestion de données', [
        ('01-gestion-de-donnees', 'Gestion de données', ['données', 'donnees', 'tableau', 'graphique']),
    ]),
]

def normaliser(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

def lire(chemin):
    texte = open(chemin, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n(.*)', texte, re.S)
    meta = {}
    if m:
        for ligne in m.group(1).splitlines():
            if ':' in ligne:
                k, v = ligne.split(':', 1)
                meta[k.strip()] = v.strip()
        corps = m.group(2)
    else:
        corps = texte
    return meta, corps

def classer(meta):
    """Renvoie (dossier, fichier, titre) d'après domaine + leçon, ou None pour le sommaire."""
    lecon = normaliser(meta.get('lecon', ''))
    domaine = normaliser(meta.get('domaine', ''))
    if 'sommaire' in lecon:
        return None
    candidats = PLAN
    # Le domaine, quand il est lisible, restreint la recherche.
    for dossier, nom, lecons in PLAN:
        if normaliser(nom) in domaine or (domaine and normaliser(nom).split()[0] in domaine):
            candidats = [(dossier, nom, lecons)]
            break
    for dossier, nom, lecons in candidats:
        for fichier, titre, cles in lecons:
            if any(normaliser(c) in lecon for c in cles):
                return dossier, fichier, titre
    return '99-a-classer', 'a-classer', 'À classer'

def nettoyer(corps):
    """Retire les gros titres répétés à chaque page (domaine, leçon) : ils sont dans l'en-tête du fichier."""
    lignes = []
    for l in corps.strip('\n').splitlines():
        if re.match(r'^#\s', l):          # « # NOMBRES ET CALCULS » répété
            continue
        if re.match(r'^##\s', l):         # « ## OPÉRATIONS - ADDITION POSÉE » répété
            continue
        lignes.append(l)
    return '\n'.join(lignes).strip('\n')

EXCLURE = {'IMG20260927120418.md', 'IMG20260927120422.md'}   # pages 14-15, reprises plus nettes ensuite

fichiers = sorted(f for f in os.listdir(SRC) if f.endswith('.md') and f not in EXCLURE)
groupes = {}      # (dossier, fichier) -> liste de pages
rapport = []      # pour le README
doublons = set()

entrees = []
for f in fichiers:
    meta, corps = lire(os.path.join(SRC, f))
    if meta.get('doublon_de'):
        doublons.add(f)
        rapport.append((f, meta, 'doublon de ' + meta['doublon_de']))
        continue
    cle = classer(meta)
    if cle is None:
        rapport.append((f, meta, 'sommaire'))
        continue
    entrees.append((f, meta, corps, cle))
    groupes.setdefault(cle, []).append((f, meta, corps))
    rapport.append((f, meta, f'{cle[0]}/{cle[1]}.md'))

# Les photos suivent l'ordre des pages : on déduit les numéros manquants entre deux
# numéros lus, quand le compte tombe juste ; sinon on laisse « ? ».
ordonnees = [e for e in entrees]
def page_num(meta):
    m = re.match(r'(\d+)', meta.get('page', ''))
    return int(m.group(1)) if m else None
i = 0
while i < len(ordonnees):
    if page_num(ordonnees[i][1]) is None:
        j = i
        while j < len(ordonnees) and page_num(ordonnees[j][1]) is None:
            j += 1
        avant = page_num(ordonnees[i - 1][1]) if i > 0 else None
        apres = page_num(ordonnees[j][1]) if j < len(ordonnees) else None
        if avant is not None and (apres is None or apres - avant - 1 >= j - i):
            for k in range(i, j):
                ordonnees[k][1]['page'] = str(avant + (k - i) + 1) + ('' if apres is None or apres - avant - 1 == j - i else '?')
        i = j
    else:
        i += 1

os.makedirs(DST, exist_ok=True)
index = []
for dossier, nomDomaine, lecons in PLAN + [('99-a-classer', 'À classer', [('a-classer', 'À classer', [])])]:
    for fichier, titre, _ in lecons:
        pages = groupes.get((dossier, fichier, titre))
        if not pages:
            continue
        chemin = os.path.join(DST, dossier, fichier + '.md')
        os.makedirs(os.path.dirname(chemin), exist_ok=True)
        numeros = [p[1].get('page', '?') for p in pages]
        lisibilites = [p[1].get('lisibilite', '?') for p in pages]
        a_verifier = [p[0] for p in pages if p[1].get('lisibilite') in ('moyenne', 'mauvaise')]
        illisibles = sum(p[2].count('[illisible]') for p in pages)
        with open(chemin, 'w', encoding='utf-8') as out:
            out.write('---\n')
            out.write(f'classe: CE2\ndomaine: {nomDomaine}\nlecon: {titre}\n')
            out.write(f"pages: {', '.join(numeros)}\n")

            out.write(f'a_relire: {"oui" if a_verifier else "non"}\n')
            out.write('---\n\n')
            out.write(f'# {nomDomaine} — {titre}\n\n')
            for nom, meta, corps in pages:
                out.write(f"<!-- page {meta.get('page', '?')} -->\n\n")
                out.write(nettoyer(corps) + '\n\n')
        index.append((dossier, fichier, titre, numeros, len(pages), illisibles, a_verifier))

# ---------------------------------------------------------------- README du livret
def pages_vues():
    out = set()
    for *_, numeros, _, _, _ in index:
        for n in numeros:
            m = re.match(r'(\d+)', n)
            if m and not n.endswith('?'):
                out.add(int(m.group(1)))
    return out

vues = pages_vues()
manquantes = [p for p in range(3, max(vues) + 1) if p not in vues] if vues else []

with open(os.path.join(DST, 'README.md'), 'w', encoding='utf-8') as out:
    out.write('# Programme de CE2 — les leçons\n\n')
    out.write('Les leçons de mathématiques de CE2, une leçon par fichier, dans l\'ordre du programme ; '
              'chaque fichier reprend ses pages dans l\'ordre, avec un repère `<!-- page N -->`. '
              'Les définitions sont celles vues en classe ; les méthodes et les exemples sont reformulés.\n\n')
    out.write('Les sources page par page sont dans `_transcriptions/` ; ce README et les fichiers de '
              'leçon sont régénérés par `programme/outils/assembler.py`.\n\n')
    out.write('## Sommaire\n\n')
    out.write('| Domaine | Leçon | Pages | Fichier | État |\n| --- | --- | --- | --- | --- |\n')
    for dossier, fichier, titre, numeros, n, ill, av in index:
        domaine = next(nom for d, nom, _ in PLAN if d == dossier) if dossier != '99-a-classer' else 'À classer'
        etat = []
        if ill: etat.append(f'{ill} passage(s) `[illisible]`')
        if av: etat.append(f'{len(av)} photo(s) peu nette(s)')
        if any(x.endswith('?') for x in numeros): etat.append('numéro de page incertain')
        out.write(f"| {domaine} | {titre} | {numeros[0]}–{numeros[-1]}" if len(numeros) > 1 else f"| {domaine} | {titre} | {numeros[0]}")
        out.write(f" | [`{dossier}/{fichier}.md`]({dossier}/{fichier}.md) | {', '.join(etat) or 'ok'} |\n")
    out.write('\n')
    if manquantes:
        out.write('## Pages manquantes\n\n')
        out.write('Pages non encore transcrites : ' + ', '.join(str(p) for p in manquantes) + '.\n\n')
    out.write('## À relire\n\n')
    out.write('Pages dont la transcription est à relire (source peu nette, ou passage `[illisible]`) :\n\n')
    for dossier, fichier, titre, numeros, n, ill, av in index:
        for photo in av:
            out.write(f'- {photo.replace(".md", "")} — {titre} (`{dossier}/{fichier}.md`)\n')
    out.write('\n## Conventions\n\n')
    out.write('- `> Je sais …` : l\'objectif de la leçon, tel qu\'écrit dans le document.\n')
    out.write('- Les opérations posées sont dans des blocs de code, colonnes alignées, retenues au-dessus.\n')
    out.write('- `(Illustration : …)` ou `(Schéma : …)` décrit un dessin de la leçon qui n\'a pas d\'équivalent texte.\n')
    out.write('- `[illisible]` signale un mot que la source ne permettait pas de lire.\n')
    out.write('- `### (écrit à la main)` : annotation manuscrite ajoutée sur le document.\n')

print(f'{len(fichiers)} transcriptions, {len(doublons)} doublons écartés, {len(index)} leçons assemblées')
for dossier, fichier, titre, numeros, n, ill, av in index:
    print(f'  {dossier}/{fichier}.md — {titre} — {n} page(s) [{", ".join(numeros)}]'
          + (f' — {ill} [illisible]' if ill else '') + (f' — à vérifier : {len(av)}' if av else ''))
