# 0020 — Rendu Markdown du tour : react-markdown

**Statut** : Acceptée · 2026-10-11 · lot 2 du M2

## Contexte

Le corps d'une étape de tour est du Markdown ([manifest §5.1](../specs/manifest.md)). Le panneau Tour doit l'afficher
sans HTML brut, ouvrir les liens `typika:<name>` vers la sandbox d'un template embarqué, et ne rien exécuter qui vienne
d'un template tiers au M3. Aucune bibliothèque Markdown n'était encore dans l'app.

## Décision

**`react-markdown` 10**, sans plugin :

- Le HTML brut est retiré (`skipHtml`), les images aussi. L'arbre est rendu en éléments React : pas de
  `dangerouslySetInnerHTML`, pas de sanitizer à maintenir.
- Les liens passent tous par `resolveTourLink` (module `tour`) : `typika:<name>` devient `/play/<name>` si le template
  est embarqué, `http(s)` s'ouvre dans un nouvel onglet sans `opener`, tout le reste (`javascript:`, chemins relatifs,
  template absent) est rendu en texte. Le `urlTransform` par défaut de la bibliothèque est désactivé parce qu'il
  effacerait `typika:` avant cette résolution.
- Poids : ~119 Kio minifié, ~37 Kio gzip (unified, remark-parse, mdast, hast), dans le chunk de la sandbox.

## Conséquences

- Les blocs de code du tour ne sont pas colorés. Les colorer avec le highlighter de l'éditeur pourra se faire dans un
  composant `code` sans changer de bibliothèque.
- Si le poids pèse sur le mobile, le panneau Tour peut être chargé à la demande : seul ce module importe
  `react-markdown`.

## Alternatives écartées

- **`micromark` (ou `markdown-it`) avec le HTML désactivé** : plus léger (~16 Kio gzip), mais produit une chaîne HTML à
  injecter et des liens à réécrire après coup. Plus de code à sécuriser pour une économie modeste.
- **Un rendu maison sur `@lezer/markdown`** : déjà présent via `@codemirror/lang-markdown`, donc sans dépendance
  nouvelle, mais il faudrait écrire et tester tout le rendu (listes, liens, blocs, emphase) nous-mêmes.
