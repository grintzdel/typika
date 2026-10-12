# 0025 — Le run de santé pilote l'app

**Statut** : Acceptée · 2026-10-12 · lot 6 du M3

## Contexte

[registry §4.2](../specs/registry.md) demande de démarrer chaque template « dans le même environnement que l'app »,
puis de lancer ses tests et de rejouer ses exercices. `template-check` exécute déjà les tests d'un template dans Node
(V9), mais ce n'est pas le chemin que suit l'apprenant : le runtime de l'iframe, l'isolation cross-origin, le
chargement des fichiers à la ref épinglée et l'application de la solution n'y passent pas. L'app ne sait pas encore
exécuter Go (M4) ni Kotlin (M6), et l'outillage des dépendances diffère pour chaque langage.

## Décision

- `registry-tools health <registre> --app <url>` ouvre chaque template dans Chromium piloté par Playwright, sur une
  instance de l'app. La sonde passe par l'interface en anglais, comme un apprenant :
  - le boot ouvre `/play/<name>`, attend le runtime, puis lance Run et attend un code de sortie 0 ;
  - les tests attendent au moins un test réussi et aucun échec ;
  - chaque exercice est ouvert, ses tests cibles doivent échouer, puis « Apply the solution » doit le résoudre.
- Un échec est relancé une fois avant de conclure. Un boot qui dépasse 20 s rend le template `degraded`.
- La commande écrit `health/<name>.json`, et `registry-tools build` le recopie dans l'index. `brokenSince` et le
  passage à `deprecated` après 90 jours viennent de l'état précédent. `deprecated = true` dans l'entrée du registre
  applique une décision de l'équipe au run suivant.
- Les templates dont l'app n'exécute pas le runtime sont sautés : leur `health` reste `null`. `deps` vaut `skip`
  tant qu'aucun outillage de dépendances n'est branché.
- Le hub ajoute une facette de santé. `healthy` et `degraded` sont cochés par défaut, et un template jamais vérifié
  compte comme sain pour ce filtre. Un template `deprecated` quitte l'accueil.

## Conséquences

- Le run vise une app qui sert les templates à leur ref épinglée, comme le build de production. En développement,
  l'app lit les templates sur le disque : c'est pratique pour essayer une réparation, pas pour juger une entrée.
- V9 refuse déjà à l'indexation une ref dont les tests ou les exercices échouent dans Node. Le run de santé attrape
  ce que V9 ne voit pas : un Run qui plante, un runtime du navigateur qui régresse, une ref devenue illisible pour
  l'app.
- Les sélecteurs de la sonde dépendent des libellés anglais de l'interface. Un E2E de production la lance sur
  `strategy-ts`, et sur des variantes qui doivent échouer.
- Un run complet prend une dizaine de secondes par template sain, cinq minutes pour les 34 templates exécutables. Un
  template cassé prend plus longtemps : chaque étape qui échoue attend son délai, et le run est relancé une fois.
- Les `registry/health/*.json` sont commités et relancés à la main jusqu'au lot 7. À partir de là, un run planifié en
  CI les produira dans le dépôt du registre, et les fichiers commités ici disparaîtront.
- Écart volontaire à [registry §5](../specs/registry.md) : le bandeau d'un template `broken` ou `deprecated`
  s'affiche aussi dans le bac à sable `/play/<name>`, pas seulement sur sa page du hub. Un lien partagé mène
  directement au bac à sable, et l'apprenant doit savoir qu'il ouvre un template qu'on ne maintient plus.

## Alternatives écartées

- **Exécuter les tests dans Node, comme `template-check`** : rapide, mais ne vérifie ni le runtime du navigateur ni
  le chargement à la ref épinglée, qui sont justement ce qui casse sans qu'on touche au template.
- **Une page de sonde dédiée dans l'app** : plus stable que des libellés, mais elle testerait une page que
  l'apprenant n'ouvre jamais.
- **Marquer `broken` les templates Go et Kotlin** : le bandeau signalerait un manque de l'app, pas du template.
