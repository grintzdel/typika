# 0021 — Moteur de diff : @codemirror/merge

**Statut** : Acceptée · 2026-10-11 · lot 3 du M2

## Contexte

L'onglet Diff ([ui §6.4 et §8](../specs/ui.md)) compare la base et le template, ou le template et le projet de
l'utilisateur, fichier par fichier, côte à côte ou en vue unifiée. L'éditeur est CodeMirror 6
([0015](0015-editor.md)), qui fournit déjà la coloration, le thème et la langue de chaque fichier.

## Décision

**`@codemirror/merge` 6.12** :

- `MergeView` pour la vue côte à côte, `unifiedMergeView` pour la vue unifiée, avec les lignes inchangées repliées
  au-delà de 3 lignes de contexte. Les deux vues sont en lecture seule.
- Il ne dépend que de paquets CodeMirror déjà présents : ~28 Kio minifié, ~10 Kio gzip en plus.
- Les ajouts et les suppressions portent un signe `+` / `-` dans une gouttière calculée à partir de `getChunks`, et
  pas seulement une couleur ([ui §15](../specs/ui.md)).
- Le diff « depuis la base » retire les marqueurs `// #region tour:` des deux côtés, comme l'export
  ([manifest §5.2](../specs/manifest.md)) ; « Mes modifications » montre les fichiers tels quels.

## Conséquences

- Le diff s'ouvre dans un onglet de l'éditeur, pas dans le panneau latéral, pour avoir la largeur d'une vue côte à
  côte. L'éditeur reste monté (masqué) pendant ce temps, pour garder l'état et l'historique de chaque fichier.
- Les étapes de tour ancrées dans le fichier comparé sont listées au-dessus du diff, comme boutons, plutôt que posées
  dans une gouttière que le clavier n'atteint pas.

## Alternatives écartées

- **`diff` (jsdiff) et un rendu en tableau HTML** : plus simple à rendre accessible, mais sans coloration ni repli des
  lignes inchangées, qu'il faudrait écrire. On aurait deux rendus de code dans l'app.
