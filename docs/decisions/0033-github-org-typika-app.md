# 0033 — Organisation GitHub : `typika-app`

**Statut** : Acceptée · 2026-11-20 · complète [0014](0014-name-typika.md)

## Contexte

L'[ADR 0014](0014-name-typika.md) prévoyait une organisation `typika` sur GitHub, libre le 2026-10-08. Toutes les
refs officielles s'écrivaient donc `github:typika/templates/…`, dans les manifestes, le registre, le code et les
specs. Le 2026-11-20, au moment de la créer, l'identifiant est pris : une organisation `typika` existe depuis le
2026-10-12, et elle n'appartient pas au projet.

Le dépôt de l'app peut rester sous un compte personnel. L'organisation sert aux identifiants publics : les refs
`github:<owner>/<repo>` se retrouvent dans l'index, dans le `parent` des projets exportés et dans le CLI, et les
changer après publication casse les projets qui les portent.

## Décision

- L'organisation GitHub du projet est **`typika-app`**, créée le 2026-11-20.
- Les dépôts officiels seront `typika-app/templates` et `typika-app/registry`. Un template officiel vit sous
  `github:typika-app/` (V4, `E_CATEGORY_MISMATCH`).
- Le renommage se fait maintenant, avant toute publication : manifestes, entrées du registre, code, specs et guides.
  Les entrées du registre sont épinglées de nouveau sur le commit qui renomme les manifestes, puisque `base` et
  `[variants]` se résolvent contre les clés du registre.
- Le nom du projet, le package `typika`, le scope `@typika/*`, `typika.toml` et `typika.dev` ne changent pas.

## Conséquences

- Les ADR antérieurs gardent `typika/…` : ils décrivent l'état à leur date.
- Un projet local créé avant le renommage garde une ref d'origine en `github:typika/…`, qui ne se résout plus. Rien
  n'est publié : il n'y a pas de migration.
- Les artefacts Kotlin ne sont pas recompilés : leur clé ne dépend que des sources Kotlin.
- L'homonyme sur GitHub s'ajoute à la recherche de marques ([R6](../spikes.md)), qui reste à faire. La publication
  l'attend toujours, avec la réservation de `typika.dev` (#92).

## Alternatives écartées

- **Publier sous `grintzdel/…`** : possible, mais les refs porteraient un compte personnel, et un dépôt personnel
  n'offre ni équipes ni rôles intermédiaires pour de futurs mainteneurs.
- **Attendre R6 pour créer l'organisation** : l'identifiant `typika` a été pris en quatre jours. Réserver
  `typika-app` ne coûte rien et n'engage pas le nom.
