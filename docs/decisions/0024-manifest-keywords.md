# 0024 — Mots-clés de recherche dans le manifeste, sans changer de schéma

**Statut** : Acceptée · 2026-10-12 · lot 4 du M3

## Contexte

La recherche du hub porte sur `search.text` de l'index ([registry §3](../specs/registry.md)). Ce texte vient du nom,
du titre, du résumé, des topics, du tour et des exercices. Un apprenant cherche souvent par le symptôme qu'il a sous
les yeux, et ce mot manque parfois : « switch » ne figure nulle part dans `strategy-ts`, dont la base est une chaîne de
`if`/`else`. Le critère du lot 4 cherche justement « switch » et attend `strategy-ts`.

[manifest §10](../specs/manifest.md) demande une nouvelle version du schéma pour tout champ ajouté, avec une migration
automatique. Ni la migration ni le CLI n'existent, et aucun manifeste n'est publié hors de ce dépôt avant le lot 7.

## Décision

- Le manifeste a un champ optionnel `keywords` : au plus 10 mots en minuscules, 32 caractères chacun, `[]` par défaut.
  `registry-tools` les ajoute à `search.text`. Ils ne sont pas repris ailleurs dans l'index.
- Le schéma reste en version 1. Jusqu'à la première publication hors de ce dépôt, le schéma 1 accueille encore des
  champs optionnels. Après, §10 s'applique sans exception.
- Les trois templates Strategy reçoivent `switch`, `if-else`, `conditional` et `polymorphism`. Les autres templates
  en recevront quand un mot manquera à leur recherche.

## Conséquences

- Une modification de manifeste n'entre dans l'index qu'une fois l'entrée réépinglée sur un commit de `main`
  ([registry §2.4](../specs/registry.md)). Le lot 4 se fait donc en deux PR : ce champ et les mots de Strategy, puis la
  recherche, qui réépingle les entrées Strategy.
- Les mots-clés sont en anglais, comme le reste du manifeste. Une recherche en français ne les trouve pas.

## Alternatives écartées

- **Schéma 2** : une migration et un double support pour un champ optionnel, avant même que le schéma 1 soit publié.
- **Mots-clés dans l'entrée du registre** : pas de réépinglage, mais les mots appartiennent au concept que l'auteur
  écrit, pas à la curation du registre.
- **Changer le mot du critère** : la recherche ne trouverait toujours pas Strategy par son symptôme le plus courant.
- **Réécrire le résumé** : le résumé d'un template sert à le présenter, pas à lister des synonymes.
