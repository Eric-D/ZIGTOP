# Plan des fiches d'exercices — CE2

Suivi : [issue #18](https://github.com/Eric-D/ZIGTOP/issues/18). Une issue par notion, dans l'ordre du livret ; chaque
fiche s'appuie sur la leçon transcrite correspondante, dans les mêmes termes que ceux que
l'enfant a vus en classe.

## Ordre de réalisation

| Phase | Pourquoi dans cet ordre |
| --- | --- |
| 1. Calculs posés (soustraction, multiplication) | le moteur de grilles de la fiche d'addition existe : on l'étend |
| 2. Numération (lire/écrire, comparer/ranger) | beaucoup d'exercices textuels, une seule figure (droite graduée) |
| 3. Fractions (trois fiches) | demande les figures partagées en SVG, réutilisées trois fois |
| 4. Grandeurs et mesures | monnaie et conversions sont textuelles ; heures et durées apportent l'horloge et la ligne du temps |
| 5. Géométrie et données | le plus de dessin (solides, polygones, symétrie sur quadrillage, diagrammes) |

| # | Notion | Leçon (pages) | Issue | État |
| --- | --- | --- | --- | --- |
| — | Addition posée | 03-addition-posee.md (14–15) | — | ✅ en ligne |
| 1 | Soustraction posée | [04-soustraction-posee.md](01-nombres-et-calculs/04-soustraction-posee.md) (16–18) | [#1](https://github.com/Eric-D/ZIGTOP/issues/1) | ✅ en ligne |
| 2 | Multiplication (en ligne et posée) | [05-multiplication.md](01-nombres-et-calculs/05-multiplication.md) (19–21) | [#2](https://github.com/Eric-D/ZIGTOP/issues/2) | ✅ en ligne |
| 3 | Nombres : lire, écrire, décomposer | [02-nombres-jusqu-a-10000.md](01-nombres-et-calculs/02-nombres-jusqu-a-10000.md) (3–8) | [#3](https://github.com/Eric-D/ZIGTOP/issues/3) | ✅ en ligne |
| 4 | Nombres : comparer, ranger, encadrer, droite graduée | [02-nombres-jusqu-a-10000.md](01-nombres-et-calculs/02-nombres-jusqu-a-10000.md) (9–13) | [#4](https://github.com/Eric-D/ZIGTOP/issues/4) | ✅ en ligne |
| 5 | Fractions : lire, écrire, représenter | [06-fractions.md](01-nombres-et-calculs/06-fractions.md) (22–25) | [#5](https://github.com/Eric-D/ZIGTOP/issues/5) | ✅ en ligne |
| 6 | Fractions : égales et comparaison | [06-fractions.md](01-nombres-et-calculs/06-fractions.md) (26–29) | [#6](https://github.com/Eric-D/ZIGTOP/issues/6) | ⬜ à faire |
| 7 | Fractions : mesurer, additionner, soustraire | [06-fractions.md](01-nombres-et-calculs/06-fractions.md) (30–31) | [#7](https://github.com/Eric-D/ZIGTOP/issues/7) | ⬜ à faire |
| 8 | Monnaie : composer une somme, rendre la monnaie | [01-monnaie.md](02-grandeurs-et-mesures/01-monnaie.md) (32) | [#8](https://github.com/Eric-D/ZIGTOP/issues/8) | ⬜ à faire |
| 9 | Longueurs : unités, conversions, périmètre | [02-longueurs.md](02-grandeurs-et-mesures/02-longueurs.md) (33–36) | [#9](https://github.com/Eric-D/ZIGTOP/issues/9) | ⬜ à faire |
| 10 | Heures : lire l’heure sur une horloge à aiguilles | [03-heures.md](02-grandeurs-et-mesures/03-heures.md) (37–38) | [#10](https://github.com/Eric-D/ZIGTOP/issues/10) | ⬜ à faire |
| 11 | Masses et contenances : unités et conversions | [04-masses.md](02-grandeurs-et-mesures/04-masses.md) (39–42) | [#11](https://github.com/Eric-D/ZIGTOP/issues/11) | ⬜ à faire |
| 12 | Durées : relations et calculs | [06-durees.md](02-grandeurs-et-mesures/06-durees.md) (43–44) | [#12](https://github.com/Eric-D/ZIGTOP/issues/12) | ⬜ à faire |
| 13 | Solides : reconnaître, décrire, patrons du cube | [01-solides.md](03-geometrie/01-solides.md) (45–47) | [#13](https://github.com/Eric-D/ZIGTOP/issues/13) | ⬜ à faire |
| 14 | Polygones : reconnaître, décrire, cercle | [02-polygones.md](03-geometrie/02-polygones.md) (48–50 (+ 51–54 manquantes)) | [#14](https://github.com/Eric-D/ZIGTOP/issues/14) | ⏸ bloqué en partie (pages 51–54) |
| 15 | Symétrie : axes et figures symétriques | [03-symetrie.md](03-geometrie/03-symetrie.md) (55) | [#15](https://github.com/Eric-D/ZIGTOP/issues/15) | ⬜ à faire |
| 16 | Gestion de données : tableaux et diagrammes en barres | [01-gestion-de-donnees.md](04-gestion-de-donnees/01-gestion-de-donnees.md) (56) | [#16](https://github.com/Eric-D/ZIGTOP/issues/16) | ⬜ à faire |

## Règles communes à toutes les fiches

**Fidélité au livret.** Le rappel de méthode reprend les étapes, les exemples et le
vocabulaire de la leçon transcrite (`programme/ce2/…`), pas une autre façon de faire. Si la
leçon dit « je retiens 1 dizaine », la fiche dit « je retiens 1 dizaine ».

**Format.** Une page A4 élève, le corrigé sur la page suivante. En mode impression, la page
élève mesure **au plus 1 046 px** de haut dans toutes les combinaisons d'options (mesuré
avec Playwright, `emulateMedia({ media: 'print' })`). Pas d'emoji sur la feuille imprimée.

**Structure.** Rappel de la méthode (masquable : la place libérée sert à plus d'exercices),
puis 4 exercices du plus guidé au plus ouvert, le dernier étant des problèmes ou une
application. Ligne Nom / Date masquable. Le corrigé n'a jamais de ligne Nom / Date.

**Reproductibilité.** Le contenu est tiré par `tirer(fiche, options, graine)` avec le hasard à
graine de `js/utils.js`. Le code de fiche encode l'index de la fiche dans `FICHES`, ses
options et la graine : **on ajoute toujours une fiche à la fin de `FICHES`, on n'en déplace
ni n'en supprime jamais**, sinon les codes déjà imprimés changent de sens. Même règle pour les
valeurs d'une option.

**Partage.** Rien à faire : code, QR code (`vue=eleve` sur la page élève, `vue=corrige` sur le
corrigé), liens partagés et ouverture sans profil sont gérés par le moteur.

**Ton.** Jamais de mot négatif sur la feuille (pas de « faux », de croix, de « erreur »), y
compris dans le corrigé. Les consignes sont courtes ; une consigne par exercice.

**Accessibilité.** Grilles et lignes d'écriture généreuses (cellules ≥ 8 mm), police du
moteur, contrastes nets ; les dessins restent lisibles en noir et blanc.

**Tests.** Dans `tests/fiches.mjs` : résultats du corrigé exacts (recalculés
indépendamment), figures et quantités cohérentes, reproductibilité par le code, nombre
d'exercices identique entre page élève et corrigé avec et sans méthode. Puis mesure de la
hauteur de page.

**Livraison.** `VERSION` de `sw.js` incrémentée, section de la fiche ajoutée au README, ligne
de ce plan passée à ✅, issue fermée par le commit (`Closes #N` — GitHub ne reconnaît pas « Ferme »).

## Méthode de travail

Chaque notion est réalisée par un agent dédié (modèle léger), avec pour entrée : l'issue,
la leçon transcrite, `js/fiches.js` et `tests/fiches.mjs` comme modèles. Il livre le
générateur, le rendu, les tests et la mesure de hauteur. La revue (fidélité au livret,
lecture du rendu imprimé, mise en ligne) est faite ensuite, avant le commit.
