# Mathoo — les maths du primaire, en s'amusant

Application web installable (PWA) pour réviser les mathématiques du **CP, du CE1 et du CE2**.
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

## Accessibilité : que rien ne soit un frein

Un enfant dyslexique, dyspraxique, TDAH, dys- quelque chose ou simplement fatigué doit
pouvoir faire les mêmes maths que les autres. Tout est réglable depuis
**⚙️ Réglages et confort de lecture** (accessible dès l'écran d'accueil, et même
avant d'avoir créé un profil, pour qu'un parent puisse préparer l'application).

**Pour lire plus facilement**

- *Lettres espacées* : police très lisible (OpenDyslexic ou Atkinson Hyperlegible si
  elles sont installées sur l'appareil, sinon Verdana/Tahoma), interlettrage et
  intermots augmentés, lignes très aérées — les leviers qui aident réellement à la
  lecture, plus que le choix de la police seule.
- *Taille du texte* : normale, grande, très grande (toute l'interface suit).
- *Couleur du fond* : crème, blanc, bleu doux ou gris doux — une teinte douce évite
  l'éblouissement et aide certains enfants à ne pas « perdre » la ligne.

**Pour rester tranquille et concentré**

- *Écran calme* : plus aucune animation, plus de confettis, aplats unis.
  (Le réglage système « animations réduites » est également respecté d'office.)
- *Séries de 5, 10 ou 15 questions* : une série courte se termine, donc elle se
  réussit — décisif quand l'attention est limitée.
- Aucun chronomètre, aucun compte à rebours, aucune pénalité : nulle part dans
  l'application le temps n'est compté.
- Les sons se coupent d'un bouton, et aucun son n'annonce une réponse ratée.

**Pour comprendre et pour répondre**

- *Lecture des questions* : à la demande (bouton 🔊) ou **automatique** — l'énoncé
  est lu à voix haute dès qu'il s'affiche, pour que lire ne soit pas l'obstacle.
- *Répondre en choisissant* : les questions à écrire deviennent des questions à
  choix, avec de gros boutons. Précieux en cas de dyspraxie, de difficulté d'écriture
  ou d'inversion de chiffres.
- *Dessins d'aide* : chaque explication peut s'accompagner d'un schéma —
  jetons groupés par 5, ligne des nombres avec le saut, rectangle de points pour la
  multiplication, barres de dizaines et unités, parts égales pour le partage.
  Voir la quantité, et pas seulement le chiffre, change tout en cas de dyscalculie.

S'y ajoutent des choix de fond : cibles tactiles d'au moins 48 px, structure toujours
identique d'un écran à l'autre, une seule question à l'écran à la fois, vocabulaire
court, et jamais de rouge ni de croix.

## L'univers : l'île des Nombres

L'application n'est pas une liste d'exercices : c'est un petit monde.

- **Zigo**, une créature ronde à antenne, accompagne l'enfant sur tous les écrans.
  Il commente, encourage, explique — et ne gronde jamais. Il change d'expression
  selon le moment (joyeux, curieux, tout doux).
- **La carte de l'île** remplace le menu : chaque thème est un lieu à visiter —
  la Tour des Nombres, l'Atelier de Plus, la Grotte de Moins, l'Observatoire,
  le Verger, le Marché, le Beffroi, la Carrière… Les étoiles gagnées s'affichent
  au-dessus de chaque bâtiment.
- **Le jardin** est la récompense : les étoiles s'y dépensent en fleurs, animaux,
  cabane, fontaine, montgolfière, arc-en-ciel… Quand il en manque, Zigo encourage
  au lieu de refuser. C'est le jardin de l'enfant, personne d'autre n'y touche.
- **Des sons** doux et courts, générés en WebAudio (aucun fichier à télécharger) :
  une petite mélodie pour une réussite, deux notes curieuses quand on cherche
  encore — jamais de son « d'erreur ». Ils se coupent d'un bouton.
- **Le bouton 🔊 Écouter** lit l'énoncé à voix haute (synthèse vocale du système).

Tout est dessiné en SVG et en emoji : pas une seule image à charger, l'application
reste minuscule et s'installe en quelques secondes.

## Les classes

L'enfant choisit sa classe au premier lancement (et peut en changer à tout moment
depuis « Changer ma classe »). Chaque classe a son propre catalogue et sa propre
progression : les étoiles et les niveaux du CE1 ne se mélangent pas avec ceux du CP.

### 🐣 CP — 8 thèmes (6-7 ans)

| Thème | Contenu |
| --- | --- |
| 🔢 Les nombres jusqu'à 100 | avant/après, comparaison, dizaines et unités, écriture en lettres, décompositions |
| ➕ Les additions | jusqu'à 100, additions à trou, trois termes |
| ➖ Les soustractions | petits retraits, situations concrètes |
| ⚡ Doubles, moitiés, compléments | compléments à 10 et à 20, doubles, moitiés |
| 🪜 Les suites de nombres | compter de 2 en 2, de 5 en 5, de 10 en 10, nombre caché |
| 🧩 Les petits problèmes | ajouter, enlever, les paires |
| 🪙 Les sous et le temps | pièces et billets, heures, jours, mois |
| 🔺 Les formes | côtés, reconnaissance des figures, tour d'un carré |

### 🐥 CE1 — 8 thèmes (7-8 ans)

| Thème | Contenu |
| --- | --- |
| 🔢 Les nombres jusqu'à 1 000 | valeur des chiffres, écriture en lettres, comparaison, dizaines entières, décompositions |
| ➕ Les additions | avec retenue, à trou, ajout de dizaines entières |
| ➖ Les soustractions | avec retenue, recherche d'écart, à trou |
| ✖️ Les tables de multiplication | tables de 2, 3, 4, 5, 6 et 10, addition répétée |
| ➗ Partages, doubles et moitiés | partages équitables, doubles, moitiés, × 10 |
| 🧩 Les problèmes | tout/reste, paquets, partages, monnaie rendue |
| 📏 Les mesures | m/cm, kg/g, h/min, euros et centimes, repères de temps |
| 📐 La géométrie | périmètres du carré et du rectangle, côtés et sommets, vocabulaire |

### 🦉 CE2 — 10 thèmes (8-9 ans)

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
Un bouton 🔊 lit l'énoncé à voix haute — très utile au CP, où la lecture est encore lente.

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
js/univers.js             Zigo, la carte de l'île, le jardin et la boutique
js/accessibilite.js       réglages de confort (lecture, calme, voix, saisie, dessins)
js/visuels.js             schémas d'aide : jetons, ligne des nombres, parts, dizaines
js/son.js                 petites mélodies WebAudio (aucun fichier audio)
js/exercices.js           registre des classes et fabrique de séries
js/niveaux/cp.js          catalogue CP : un générateur par thème
js/niveaux/ce1.js         catalogue CE1
js/niveaux/ce2.js         catalogue CE2
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
node tests/parcours-complet.mjs   # les 3 classes : profil → île → série → bilan → progrès, et absence de mot négatif
node tests/bonnes-reponses.mjs    # étoiles, badges, montée automatique de niveau
node tests/jardin.mjs             # boutique, plantations, et encouragement quand il manque des étoiles
node tests/accessibilite.mjs      # réglages appliqués, séries courtes, réponses à choisir, dessins d'aide
```

## Ajouter une classe

Créer `js/niveaux/<classe>.js` sur le modèle des trois autres (il exporte un tableau
`MODULES` de `{ id, titre, emoji, couleur, gen }`, où `gen(difficulte)` renvoie un
exercice), puis l'ajouter à `CLASSES` dans `js/exercices.js` et à la liste de `sw.js`.
Rien d'autre à modifier : l'interface, la progression et les badges suivent.
Pour donner un lieu sur la carte à un nouveau thème, ajouter une entrée dans `LIEUX`
(`js/univers.js`) ; sans entrée, le thème reçoit un bâtiment neutre.

## Suite prévue

- le CM1 et le CM2 (fractions, décimaux, division posée, proportionnalité) ;
- les autres matières (français, questionner le monde) ;
- un espace parent avec des statistiques détaillées par thème et dans le temps ;
- de nouveaux décors de jardin et des mini-jeux dans certains lieux de l'île.
