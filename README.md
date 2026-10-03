# Mathoo — les maths du primaire, en s'amusant

**En ligne : <https://eric-d.github.io/ZIGTOP/>** — à ouvrir sur la tablette, puis
« Ajouter à l'écran d'accueil ».

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

## Le programme : le livret de leçons transcrit

Le dossier [`programme/ce2/`](programme/ce2/README.md) contient la transcription en Markdown
du livret de leçons de mathématiques de CE2 (nombres et calculs, grandeurs et mesures,
géométrie, gestion de données), une leçon par fichier, avec un index qui liste les pages
couvertes, celles qui manquent et les passages à vérifier. C'est la **source des fiches de
révision** : chaque fiche à venir s'appuie sur la leçon correspondante, dans les mêmes
termes que ceux que l'enfant a vus en classe.

## Fiches de révision à imprimer

Depuis l'accueil, **🖨️ Fiches à imprimer** fabrique une fiche A4 prête à sortir de
l'imprimante, régénérée à chaque clic : la leçon rappelée en haut, puis des exercices,
et le **corrigé sur une deuxième page** pour l'adulte.

L'écran des fiches est un tunnel en trois pas : **que réviser** (les notions, regroupées par
domaine dans l'ordre du livret, à cocher — une seule donne la fiche complète, plusieurs une
feuille panachée — avec pour chacune les pages, l'objectif « Je sais… », un lien vers la
leçon transcrite et ses options), **composer** (rappel, nombre de feuilles, feuilles
identiques ou qui tournent sur les notions, le code de la composition), puis **imprimer et
partager**. Le pas courant est dans l'adresse (`?pas=2`), le bouton retour du navigateur
marche, et un lien ou un QR arrive directement au dernier pas. Trois raccourcis cochent
pour vous : « tout ce qu'on a vu jusqu'à la page N » (la page est mémorisée), un domaine
entier, ou « la révision de la semaine » — quatre notions tirées au sort parmi celles de la
dernière fois, en favorisant les moins tirées. Dix-sept fiches sont
disponibles (le plan complet est dans [`programme/ce2/PLAN-FICHES.md`](programme/ce2/PLAN-FICHES.md)) :

- **CE2 — Les tableaux et les diagrammes en barres** (p. 56 du livret) : lire un tableau à
  double entrée et un diagramme en barres dans les mots de la leçon ; tableau à compléter
  et questions, diagramme à lire, diagramme à construire, questions mêlant lecture et
  calcul. Option : effectifs jusqu'à 20, ou jusqu'à 100.
- **CE2 — La symétrie : axes et figures symétriques** (p. 55 du livret) : le pliage dans les
  mots de la leçon (« le pli est un axe de symétrie »), « Ce carré a 4 axes de symétrie » ;
  figures avec ou sans axe, nombre d'axes, figures à compléter par symétrie sur quadrillage,
  vrai ou faux. Option : axe vertical seulement, ou vertical et horizontal.
- **CE2 — Les polygones et le cercle** (p. 48–50 du livret) : « Un polygone est une figure
  fermée qu'on peut tracer avec une règle », côtés et sommets, triangle, quadrilatère,
  pentagone, hexagone, le cercle (centre, rayon, diamètre, compas) ; polygone ou pas,
  figures à nommer et à décrire, rayon ↔ diamètre et cercle à tracer, vocabulaire. À
  compléter quand les pages 51 à 54 du livret auront été photographiées.
- **CE2 — Les solides : reconnaître, décrire, patrons du cube** (p. 45–47 du livret) : les
  six solides de la leçon dessinés en perspective, face / arête / sommet dans ses mots ;
  solides à nommer, tableau faces-sommets-arêtes, patrons du cube à reconnaître, vrai ou
  faux.
- **CE2 — Les durées : relations et calculs** (p. 43–44 du livret) : les relations de la
  leçon (minute, heure, demi-heure, quart d'heure, siècle, millénaire), durées entre deux
  horaires et heures d'arrivée sur une ligne du temps, problèmes. Option : minutes et
  heures, ou avec les secondes.
- **CE2 — Les masses et les contenances** (p. 39–42 du livret) : 1 kg = 1 000 g,
  1 t = 1 000 kg, 1 L = 10 dL = 100 cL et les repères de la leçon (bouteille de 1 L,
  baignoire de 150 L…) ; unité à choisir, conversions, comparaisons, rangement, problèmes.
  Option : masses, contenances, ou les deux.
- **CE2 — Les heures : lire l'heure sur une horloge** (p. 37–38 du livret) : la petite et
  la grande aiguille dans les mots de la leçon, la lecture « 8 heures moins 10 » ; horloges à
  lire, lectures en « moins », aiguilles à tracer sur des cadrans vierges, heures de
  l'après-midi en notation 24 h. Option : heures, quarts et demies, ou toutes les 5 minutes.
- **CE2 — Les longueurs : unités, conversions, périmètre** (p. 33–36 du livret) : les
  relations de la leçon (1 cm = 10 mm, 1 m = 10 dm = 100 cm, 1 km = 1 000 m), les écritures
  mixtes (« 3 700 m, c'est 3 km 700 m »), la définition du périmètre et son exemple ;
  conversions, comparaisons, rangement, périmètres de figures cotées. Option : sans ou avec
  le kilomètre.
- **CE2 — La monnaie : composer une somme, rendre la monnaie** (p. 32 du livret) : les
  billets et les pièces, 1 € = 100 c, la méthode du livret pour rendre la monnaie (compléter
  à l'euro suivant, puis au billet) ; sommes à composer, conversions, monnaie à rendre,
  problèmes d'achat. Option : euros entiers, ou avec les centimes.
- **CE2 — Les fractions : mesurer, additionner, soustraire** (p. 30–31 du livret) : mesurer
  des bandes avec une règle graduée en fractions d'unité, additionner et soustraire des
  fractions de même dénominateur avec la règle de la leçon, problèmes. Option : demis, tiers
  et quarts, ou jusqu'aux dixièmes.
- **CE2 — Les fractions : égales et comparaison** (p. 26–29 du livret) : les règles de la
  leçon (fractions égales, égales à 1/2 et à 1, même dénominateur, même numérateur) avec
  leurs figures ; fractions à entourer, comparaisons avec < et >, paires de même numérateur
  avec figures d'appui, rangement.
- **CE2 — Les fractions : lire, écrire, représenter** (p. 22–25 du livret) : l'unité
  partagée en parts égales, numérateur et dénominateur avec les mots de la leçon, les noms
  (demi, tiers, quart… dixième) ; fractions à lire sur des figures, figures à colorier,
  écriture en lettres et en chiffres, vrai ou faux sur le vocabulaire.
- **CE2 — Les nombres : comparer, ranger, encadrer** (p. 9–13 du livret) : la méthode de
  comparaison du livret (nombre de chiffres, puis chiffre à chiffre en partant de la gauche),
  <, > et =, rangements croissant et décroissant, encadrements à la dizaine, à la centaine et
  au millier, nombres à intercaler, et une demi-droite graduée où placer des nombres.
  Option : jusqu'à 999 ou jusqu'à 9 999.
- **CE2 — Les nombres : lire, écrire, décomposer** (p. 3–8 du livret) : tableau de
  numération, le nombre `3 258` (ou `863`) représenté des sept façons du livret, puis nombres
  en lettres ↔ en chiffres, décompositions et recompositions, dizaines et centaines entières,
  tableaux à compléter. Option : jusqu'à 999 ou jusqu'à 9 999.
- **CE2 — Opérations : multiplication** (p. 19–21 du livret) : les deux méthodes en ligne
  du livret (Mila, Enzo), la multiplication posée `427 × 5` puis `14 × 23` avec ses lignes
  partielles ; produits en ligne à décomposer, multiplications posées à un puis deux
  chiffres, problèmes. Option : × 1 chiffre seulement, ou × 1 et × 2 chiffres.
- **CE2 — Opérations : soustraction posée** (p. 16–18 du livret) : méthode en 4 étapes avec
  l'exemple `4 268 − 1 951`, retenues notées comme dans le livret (le chiffre qui prête est
  barré et réécrit au-dessus, la colonne qui reçoit note « 1 » devant son chiffre), 4
  soustractions à calculer, 3 à poser, 3 vérifications par l'addition, 2 problèmes.
- **CE2 — Opérations : addition posée**, calquée sur la progression du manuel (unités, puis
  dizaines, puis centaines, puis milliers) :

1. rappel de la méthode, avec l'exemple `685 + 267` entièrement posé ;
2. quatre additions déjà posées à calculer, de la plus simple (sans retenue) aux plus
   costaudes (plusieurs retenues) ;
3. trois additions à **poser soi-même** dans une grille vide avec les colonnes m/c/d/u ;
4. trois ordres de grandeur à entourer, comme le « je vérifie mon résultat » de la leçon ;
5. deux problèmes, avec la place pour poser l'opération et écrire la phrase réponse.

Réglages de la fiche :

- **nombres utilisés** : jusqu'à 999, jusqu'à 9 999, ou les deux ;
- **nombre de feuilles** : 1, 2, 4 ou 6 d'un coup — chacune a ses propres exercices et
  son propre code. À l'impression, toutes les pages élève sortent d'abord, les corrigés
  ensuite : on donne la pile du dessus à l'enfant et on garde le reste ;
- **rappel de la méthode** : avec ou sans. Sans le rappel, la place libérée sert à
  quatre additions et une opération à poser de plus (8 et 4 au lieu de 4 et 3) ;
- **ligne « Nom / Date »** : avec ou sans ;
- **corrigé** : avec ou sans. Le corrigé n'a jamais de ligne Nom / Date.

Changer un de ces réglages d'affichage ne retire pas de nouveaux nombres : seuls
« 🎲 Autres exercices » et le choix des nombres utilisés relancent un tirage. Augmenter
le nombre de feuilles garde celles déjà affichées et n'en tire que de nouvelles.

### La feuille panachée

Réviser notion par notion est la forme la plus faible de l'entraînement : ce qui fait tenir
les acquis, c'est le mélange. Une **feuille panachée** prend un exercice dans chacune des
notions choisies (de deux à cinq par feuille, au-delà les notions se répartissent sur
plusieurs feuilles), avec en tête une ligne de rappel par notion. Son code commence par `Z`
(masque des notions, leurs options, la graine) et s'ouvre comme les autres par `?fiche=Z…`.
La tenue sur une A4 est garantie par des hauteurs de blocs mesurées en mode impression
(`js/hauteurs-blocs.js`, à régénérer avec `programme/outils/mesurer-blocs.mjs` après tout
changement de rendu). L'interface de composition est l'objet de l'issue #20.

### Partager un lien, sans compte ni serveur

Le code contenant tout, **une adresse suffit à partager une fiche ou sa correction**.
L'application est entièrement côté navigateur : il n'y a rien à authentifier, rien à
stocker, et le lien ne contient **aucune donnée sur l'enfant** (ni prénom, ni résultats).

| Adresse | Ce qu'elle ouvre |
| --- | --- |
| `?fiche=02BE-G69V` | la fiche et son corrigé |
| `?fiche=02BE-G69V&vue=corrige` | **la correction seule** — le lien à envoyer |
| `?fiche=02BE-G69V&vue=eleve` | les exercices seuls, sans les réponses |
| `?fiches=02BE-G69V,02R5-Y0DG` | plusieurs feuilles d'un coup (jusqu'à 12) |
| `&methode=0` `&nom=0` | l'affichage exact de la feuille imprimée |

Le bloc **Partager** de l'écran des fiches donne les deux liens tout faits, avec un
bouton « Copier ». Un lien ouvert par quelqu'un qui n'a jamais utilisé l'application
affiche directement la correction, sans passer par la création d'un profil.

Les deux QR codes imprimés sont volontairement différents : celui de la feuille de
l'enfant mène aux **exercices seuls** (les réponses ne sont pas à un scan près), celui
du corrigé — la page que l'adulte garde — mène à la **correction**.

### Vers un espace parent ou enseignant

Tout ce qui précède fonctionne déjà sans serveur : distribuer des fiches, retrouver une
correction, envoyer un lien à un collègue ou à une famille. Un véritable espace
parent/enseignant (suivi des résultats d'un élève, classe entière, devoirs assignés)
demanderait en revanche un serveur et des comptes, puisqu'il s'agirait cette fois de
données personnelles. Le partage de fiches restera dans tous les cas utilisable sans
compte : c'est un choix, pas une limite technique.

### Le code de la fiche et son QR code

Chaque fiche porte en haut à droite un **QR code** et un **code à huit caractères**
(par exemple `02LT-RF7I`). Ce code contient tout : la fiche, ses options et la graine
du tirage aléatoire.

- Scanner le QR code rouvre l'application **sur cette fiche exacte**, corrigé compris —
  pratique deux semaines plus tard, quand la feuille remplie ressort du cartable.
- Sans téléphone, on saisit le code dans « Retrouver une fiche déjà imprimée ».
- Changer d'option ou cliquer sur « autres exercices » tire une nouvelle fiche ;
  masquer ou afficher le corrigé ne change **pas** les exercices affichés.

Le QR code est encodé par `js/qr.js`, écrit à la main (mode octet, correction niveau M,
versions 1 à 10) : aucune librairie, donc une fiche reste imprimable hors connexion.

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

### Déploiement

Le site est publié par **GitHub Pages** depuis la branche `main` (racine du dépôt) :
un `git push` suffit à mettre à jour <https://eric-d.github.io/ZIGTOP/>. Le HTTPS est
requis pour l'installation hors ligne, et GitHub Pages le fournit.

⚠️ Après une modification, penser à incrémenter `VERSION` dans `sw.js` : sans cela, les
appareils qui ont déjà installé l'application continuent de servir l'ancienne version
depuis leur cache.

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
js/fiches.js              fiches imprimables : tirage, codes de fiche, mise en page A4
js/qr.js                  encodeur QR sans dépendance (pour le code des fiches)
js/son.js                 petites mélodies WebAudio (aucun fichier audio)
js/exercices.js           registre des classes et fabrique de séries
js/niveaux/cp.js          catalogue CP : un générateur par thème
js/niveaux/ce1.js         catalogue CE1
js/niveaux/ce2.js         catalogue CE2
js/progression.js         étoiles, niveaux adaptatifs, badges, série de jours (localStorage)
js/utils.js               aléatoire, mélange, nombres en toutes lettres
icons/                    icônes de l'application
tests/                    tests de parcours (jsdom)
programme/ce2/            le livret de leçons transcrit, une leçon par fichier (+ index)
programme/outils/         assembler.py : regénère les leçons depuis les transcriptions brutes
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
node tests/fiches.mjs             # corrigé juste, retenues bien placées, codes de fiche reproductibles
node tests/partage.mjs            # liens partagés : corrigé ouvert sans profil, options conservées
node tests/ecran-fiches.mjs       # écran des fiches : domaines, liens vers les leçons, ordre figé de FICHES
node tests/panache.mjs            # feuilles panachées : code Z, budget de hauteur, report sur plusieurs feuilles
node tests/tunnel.mjs             # tunnel : cocher → composer → imprimer, retour, ouverture par lien au pas 3
node tests/raccourcis.mjs         # raccourcis : jusqu'à la page N, domaine, révision de la semaine, mémorisation

# vérification approfondie du QR code (dépendances en plus) :
npm i --no-save playwright jsqr pngjs && npx playwright install chromium
node tests/qr-lecture.mjs         # les QR produits sont relus par un décodeur indépendant
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
