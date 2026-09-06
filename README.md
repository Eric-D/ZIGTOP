# Mathoo — les maths du CE2, en s'amusant

Application web installable (PWA) pour réviser les mathématiques du **CE2**.
Elle fonctionne **entièrement hors connexion**, sur téléphone, tablette ou ordinateur,
et ne transmet aucune donnée : tous les progrès restent dans le navigateur de l'enfant.

## Le principe

> L'enfant ne doit jamais se dire « je suis mauvais ».

C'est la règle qui guide toute l'interface :

- aucun message négatif — pas de « faux », pas de croix rouge, pas de score sur 10 « raté » ;
- une mauvaise réponse déclenche **l'astuce puis une deuxième chance** (« J'ai compris, je réessaie ») ;
- on compte les **étoiles gagnées**, jamais les erreurs ;
- le bilan de fin est toujours valorisant, même à zéro étoile ;
- la difficulté s'ajuste toute seule (3 niveaux par thème) pour que l'enfant reste dans la zone
  où il réussit souvent : elle monte au-dessus de 85 % de réussite, et redescend en douceur en dessous de 45 %.

## Les 10 thèmes CE2

| Thème | Contenu |
| --- | --- |
| 🔢 Les nombres jusqu'à 10 000 | valeur des chiffres, écriture en lettres, comparaison, décompositions, +/− 1, 10, 100, 1 000 |
| ➕ Les additions | en ligne et posées, avec retenues, additions à trou |
| ➖ Les soustractions | avec retenues, à trou, recherche d'écart |
| ✖️ Les tables de multiplication | tables de 1 à 10, dans les deux sens |
| 🧮 Multiplications posées | × 1 chiffre puis × 2 chiffres |
| ➗ Divisions et partages | partages équitables, quotient et reste |
| ⚡ Doubles, moitiés, calcul malin | doubles, moitiés, compléments à 100, × 10 |
| 🧩 Les problèmes | énoncés courts : tout/reste, paquets, partages, monnaie |
| 📏 Les mesures | m/cm, km/m, kg/g, h/min, euros et centimes |
| 📐 La géométrie | périmètres, côtés et sommets, vocabulaire et instruments |

Chaque exercice est **généré aléatoirement** : les séries ne se répètent jamais à l'identique.

## Lancer l'application

Il faut un petit serveur local (le service worker et les modules ES ne fonctionnent pas en `file://`) :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

**Pour l'installer sur une tablette ou un téléphone :** ouvrir le site, puis
« Ajouter à l'écran d'accueil ». L'application se lance ensuite en plein écran,
sans barre d'adresse, et fonctionne sans réseau.

Pour un usage réel, déposer le dossier sur n'importe quel hébergement statique en **HTTPS**
(GitHub Pages, Netlify, Cloudflare Pages…) — c'est requis pour l'installation hors ligne.

## Structure

```
index.html                page unique
styles.css                thème visuel (gros boutons tactiles, couleurs joyeuses)
manifest.webmanifest      métadonnées d'installation
sw.js                     service worker : met toute l'app en cache
js/app.js                 écrans, session d'exercices, retours bienveillants
js/exercices.js           catalogue CE2 : un générateur par thème
js/progression.js         étoiles, niveaux adaptatifs, badges, série de jours (localStorage)
js/utils.js               aléatoire, mélange, nombres en toutes lettres
icons/                    icônes de l'application
tests/                    tests de parcours (jsdom)
```

⚠️ Après modification d'un fichier, incrémenter `VERSION` dans `sw.js` pour que les
appareils déjà installés récupèrent la nouvelle version.

## Tests

```bash
npm i --no-save jsdom
node tests/parcours-complet.mjs   # profil → série → bilan → progrès, et absence de mot négatif
node tests/bonnes-reponses.mjs    # étoiles, badges, montée automatique de niveau
```

## Suite prévue

- les autres classes (CP, CE1, CM1, CM2) — la structure des modules est déjà prête à les accueillir ;
- les autres matières (français, questionner le monde) ;
- un espace parent avec des statistiques détaillées par thème et dans le temps.
