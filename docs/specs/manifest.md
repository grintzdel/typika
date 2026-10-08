# Spec — Manifeste de template (`typika.toml`)

Statut : normatif · schéma `1`, figé le 2026-10-08 · détaille le §5 de la
[spec de conception](./2026-10-08-typika-v1-design.md)

Le schéma 1 est figé : toute modification de ce document qui change ce qu'un manifeste valide peut contenir suit les
règles de versionnement (§10).

Ce document définit le format du manifeste d'un template, des étapes de tour et des exercices, ainsi que les règles de
validation. Il fait foi pour le package `manifest` (schema Effect partagé entre l'app, le CLI et la CI du registre).

Les mots **DOIT**, **NE DOIT PAS**, **DEVRAIT** et **PEUT** ont le sens de la RFC 2119.

## 1. Structure d'un dossier de template

```
<template>/
├── typika.toml                 # manifeste (obligatoire)
├── README.md                    # description longue, en anglais (obligatoire)
├── LICENSE                      # texte de la licence déclarée (obligatoire)
├── <sources>                    # disposition propre au langage (voir guide d'auteur)
├── <tests>
├── tour/                        # étapes du tour (optionnel)
│   ├── 01-overview.md
│   ├── 02-….md
│   └── <locale>/                # réservé (V2), ignoré en schéma 1
└── exercises/                   # exercices (optionnel)
    ├── <fichiers>               # ignorés par Typika (ex. exercises/go.mod, voir guide d'auteur)
    └── <exercise-name>/
        ├── README.md            # énoncé
        ├── start/               # surcouche appliquée à l'état de départ
        └── solution/            # surcouche appliquée à l'état de départ pour obtenir la solution
```

Fichiers **propres à Typika** : `typika.toml`, `tour/`, `exercises/`. Ce que le CLI en conserve à l'export est défini
dans [sharing-and-cli.md](./sharing-and-cli.md).

Un template PEUT vivre à la racine d'un repo ou dans un sous-dossier (repo multi-templates).

### Limites de taille (valeurs initiales)

| Limite | Valeur | Raison |
|---|---|---|
| Nombre de fichiers (hors `exercises/`) | 200 | Chargement dans la sandbox et dans le fragment d'URL. |
| Taille totale texte | 1 Mo | Idem. |
| Fichier binaire | images uniquement (`png`, `jpg`, `svg`, `webp`), 200 Ko max chacune | Illustrations de tour. |

Dépassement : avertissement `W_SIZE` en local, erreur à l'entrée dans le registre.

## 2. Champs de premier niveau

| Champ | Type | Requis | Défaut | Contraintes |
|---|---|---|---|---|
| `schema` | entier | oui | — | `1`. Toute autre valeur → `E_SCHEMA_VERSION_UNSUPPORTED`. |
| `name` | chaîne | oui | — | Slug kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`, 3 à 64 caractères. Unique dans le registre. |
| `title` | chaîne | oui | — | 1 à 80 caractères, anglais. |
| `summary` | chaîne | oui | — | 1 à 200 caractères, une phrase, anglais. Affiché dans les cartes du hub. |
| `license` | chaîne | oui | — | Identifiant SPDX (`MIT-0`, `MIT`, `Apache-2.0`…). Voir §9. |
| `authors` | tableau de chaînes | oui | — | ≥ 1 élément, chacun `github:<login>`. |
| `role` | `"template"` \| `"base"` | non | `"template"` | `base` : template servant uniquement de base de diff (§7). Masqué des listes du hub. |
| `parent` | ref | non | — | Template dont celui-ci est un remix (§8). Posé automatiquement par l'action « remix ». |
| `[facets]` | table | oui | — | §3. |
| `[runtime]` | table | oui | — | §4. |
| `[commands]` | table | non | dépend du runtime | §4.2. |
| `[tests]` | table | non | dépend du langage | §4.3. |
| `[tour]` | table | non | — | §5. |
| `[base]` | table | non | — | §7. |
| `[variants]` | table | non | — | §7. |
| `[[exercises]]` | tableau de tables | non | `[]` | §6. |
| `[x-*]` | table | non | — | Espace d'extension, ignoré par la validation. Ne DOIT PAS être requis pour qu'un template fonctionne. |

Toute autre clé → `E_UNKNOWN_FIELD`. La rigueur est volontaire : une faute de frappe (`varaints`) ne doit pas passer
silencieusement. Elle s'applique à toutes les tables du manifeste (`[facets]`, `[runtime]`, `[[exercises]]`…) et au
front-matter des étapes (§5.1) ; seul le premier niveau admet `[x-*]`.

## 3. Facettes

```toml
[facets]
language = "typescript"
framework = []
library = []
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy", "principle/open-closed"]
level = "intermediate"
useCase = ["backend"]
```

| Facette | Type | Requis | Valeurs |
|---|---|---|---|
| `language` | chaîne | oui | `typescript` \| `javascript` \| `go` \| `kotlin` |
| `framework` | tableau | non (défaut `[]`) | Slugs du vocabulaire contrôlé du registre ([registry.md](./registry.md)). |
| `library` | tableau | non (défaut `[]`) | Idem. |
| `paradigm` | tableau | non (défaut `[]`) | `oop` \| `functional` \| `procedural` \| `reactive` |
| `topic` | tableau | oui, ≥ 1 | Identifiants de topic (§3.1). Le **premier** est le topic principal : il détermine la catégorie d'affichage dans le hub. |
| `level` | chaîne | oui | `beginner` \| `intermediate` \| `advanced` |
| `useCase` | tableau | non (défaut `[]`) | `backend` \| `frontend` \| `fullstack` \| `library` \| `cli` |

### 3.1 Identifiants de topic

| Catégorie | Forme | Exemple |
|---|---|---|
| `architecture` | `architecture/<slug>` | `architecture/hexagonal` |
| `principle` | `principle/<slug>` | `principle/dependency-inversion` |
| `design-pattern` | `design-pattern/<family>/<slug>`, `family` ∈ `creational` \| `structural` \| `behavioral` \| `other` | `design-pattern/structural/adapter` |
| `fundamental` | `fundamental/<slug>` | `fundamental/composition-over-inheritance` |

- Les slugs sont en kebab-case.
- La liste des topics existants est tenue par le registre. Un topic inconnu → `E_INVALID_VALUE` à l'entrée dans le
  registre, avertissement `W_UNKNOWN_TOPIC` en local (permet d'écrire un template avant d'ouvrir la PR du topic).
- `other` regroupe les patterns hors GoF (Repository, Unit of Work…).

## 4. Runtime, commandes, tests

### 4.1 `[runtime]`

| Champ | Type | Requis | Défaut | Contraintes |
|---|---|---|---|---|
| `kind` | chaîne | oui | — | `browser-js` \| `go` \| `kotlin` |
| `entry` | chemin | oui | — | Fichier existant, relatif à la racine du template. Point d'entrée de « Run ». |

Compatibilité langage / runtime (sinon `E_RUNTIME_LANGUAGE_MISMATCH`) :

| `language` | `kind` autorisés |
|---|---|
| `typescript`, `javascript` | `browser-js` |
| `go` | `go` |
| `kotlin` | `kotlin` |

Le runtime `node` n'existe pas en schéma 1 ([ADR 0017](../decisions/0017-node-runtime.md)). L'ajouter plus tard
sera un changement de version (§10).

### 4.2 `[commands]`

| Champ | `browser-js` | `go` | `kotlin` |
|---|---|---|---|
| `start` | Chemin du fichier à exécuter. Défaut : `runtime.entry`. | Idem. | Idem. |
| `test` | Identifiant du runner : `"vitest"` (seule valeur, défaut). | `"go test"` (seule valeur, défaut). | `"kotlin.test"` (seule valeur, défaut). |

La sandbox n'exécute pas de shell : les valeurs ne sont pas des commandes mais des sélecteurs. Le runner `vitest`
désigne le runner intégré compatible avec un sous-ensemble de l'API Vitest ([runtimes.md](./runtimes.md)).

### 4.3 `[tests]`

| Champ | Type | Défaut |
|---|---|---|
| `include` | tableau de globs | TS : `["**/*.test.ts"]` · JS : `["**/*.test.js"]` · Go : `["**/*_test.go"]` · Kotlin : `["src/test/kotlin/**/*.kt"]` |
| `exclude` | tableau de globs | `["exercises/**"]` (toujours ajouté, non retirable) |

## 5. Tour

```toml
[tour]
steps = ["tour/01-overview.md", "tour/02-context.md", "tour/03-strategy.md", "tour/04-trade-offs.md"]
```

| Champ | Type | Requis | Contraintes |
|---|---|---|---|
| `steps` | tableau de chemins | oui si `[tour]` présent | 1 à 12 éléments. Fichiers `.md` existants sous `tour/`. L'ordre du tableau est l'ordre du tour. |

### 5.1 Front-matter d'une étape

Chaque fichier d'étape commence par un front-matter TOML délimité par `+++` :

```markdown
+++
id = "context"
title = "The context delegates"
file = "src/checkout/shipping-quote.ts"
lines = "12-27"
also = ["src/checkout/shipping-policy.ts"]
+++

`ShippingQuote` no longer knows how each option is priced…
```

| Champ | Type | Requis | Contraintes |
|---|---|---|---|
| `id` | chaîne | oui | Slug kebab-case, unique dans le tour. **Stable** : ne change pas quand l'étape est réécrite. Sert à l'alignement entre variantes (§5.3). |
| `title` | chaîne | oui | 1 à 60 caractères. |
| `file` | chemin | non | Fichier ouvert à l'affichage de l'étape. Absent → l'étape est du texte seul (ex. `overview`). |
| `lines` | chaîne | non | `"N"` ou `"N-M"`, 1-indexé, `N ≤ M`, plage ≤ 40 lignes. Requiert `file`. Exclusif avec `region`. |
| `region` | chaîne | non | Nom d'une région marquée dans `file` (§5.2). Requiert `file`. Exclusif avec `lines`. |
| `also` | tableau de chemins | non | Fichiers ouverts en onglets secondaires, sans surlignage. |

Le corps Markdown est en anglais. Liens vers un autre template : `typika:<name>` (résolu par le hub).

### 5.2 Ancrage : lignes ou régions

- **`lines`** : simple, mais casse quand le code bouge. La CI vérifie que la plage existe (`E_TOUR_ANCHOR_OUT_OF_RANGE`) ;
  elle ne peut pas vérifier qu'elle pointe le bon code.
- **`region`** : robuste aux modifications. Le code porte des marqueurs de commentaire sur leur propre ligne :

  | Langage | Ouverture | Fermeture |
  |---|---|---|
  | TS / JS / Go / Kotlin | `// #region tour:<name>` | `// #endregion` |

  Les lignes de marqueurs ne sont pas surlignées. Les marqueurs sont retirés à l'export (cf.
  [sharing-and-cli.md](./sharing-and-cli.md)). Région introuvable → `E_TOUR_REGION_NOT_FOUND`.

Recommandation : `region` pour les templates officiels, `lines` acceptable pour les templates tiers.

### 5.3 Alignement entre variantes

Le mode comparaison synchronise deux variantes par `id` d'étape. Règles :

1. Le tour de la **variante TypeScript** (langue de référence) définit les `id` canoniques d'un concept.
2. Une variante DEVRAIT reprendre les `id` canoniques. Elle PEUT en omettre (affiché « no equivalent in <language> »)
   et en ajouter (affichées d'un seul côté).
3. Les `id` partagés DOIVENT apparaître dans le même ordre relatif que dans la référence. Sinon `W_TOUR_ORDER_DIVERGES`
   (avertissement : la comparaison se désynchronise).
4. Quand un pattern se dissout dans le langage, la variante **garde l'étape** et explique pourquoi le code est absent
   ou réduit. Supprimer l'étape cacherait la leçon.
5. Les `id` `overview` (première étape) et `trade-offs` (dernière étape) sont obligatoires pour les templates officiels
   (règle du registre, pas du schéma).

## 6. Exercices

```toml
[[exercises]]
name = "add-pickup-point-option"
kind = "refactor"
title = "Add a pickup-point shipping option"
from = "base"
failing = ["tests/pickup-point.test.ts"]
```

| Champ | Type | Requis | Défaut | Contraintes |
|---|---|---|---|---|
| `name` | chaîne | oui | — | Slug kebab-case, unique parmi les exercices du template. Nom du dossier `exercises/<name>/`. |
| `kind` | `"fix"` \| `"refactor"` | oui | — | §6.1. |
| `title` | chaîne | oui | — | 1 à 80 caractères, anglais. |
| `level` | niveau | non | `facets.level` | Même vocabulaire que `facets.level`. |
| `from` | `"self"` \| `"base"` | non | `"self"` | État de départ avant surcouche : le template lui-même ou sa `base`. `"base"` requiert `[base]`. |
| `failing` | tableau de chemins | oui | — | ≥ 1. Fichiers de test qui DOIVENT être rouges dans l'état de départ. |
| `solutionFrom` | `"start"` \| `"self"` | non | `"start"` | État sur lequel `solution/` est appliquée (§6.2). `"self"` requiert `from = "base"`. |
| `hints` | tableau de chemins | non | `[]` | Fichiers Markdown sous `exercises/<name>/`, dévoilés un par un. |

Contenu attendu de `exercises/<name>/` :

| Élément | Requis | Rôle |
|---|---|---|
| `README.md` | oui | Énoncé, en anglais. |
| `start/` | non | Surcouche appliquée à l'état `from` : fichiers ajoutés ou remplacés (dont les tests `failing`). |
| `start/.typika-remove` | non | Liste de chemins (un par ligne) supprimés de l'état `from`. |
| `solution/` | oui | Surcouche qui produit une solution de référence, appliquée selon `solutionFrom` (§6.2). |

### 6.1 Sémantique des deux types

| | `fix` | `refactor` |
|---|---|---|
| Départ typique | `from = "self"`, une partie de l'implémentation retirée | `from = "base"` : le code naïf |
| État de départ | tests `failing` rouges ; les autres verts | tests existants verts ; tests `failing` (nouvelle exigence) rouges |
| Ce que l'apprenant fait | Compléter l'implémentation | Restructurer, puis implémenter l'exigence |
| Leçon | Comprendre la mécanique du pattern | Ressentir pourquoi le pattern existe |

### 6.2 État solution

| `solutionFrom` | État solution |
|---|---|
| `"start"` | état de départ + `solution/` |
| `"self"` | template + fichiers `failing` de `start/` + `solution/` |

`"self"` sert les exercices `refactor` partis de la base : leur solution est le template restructuré plus l'exigence.
Avec `"start"`, `solution/` devrait recopier tous les fichiers que le template change par rapport à la base, copies
qui divergeraient du template à chaque modification.

### 6.3 Critères de réussite

Un exercice est **réussi** quand, dans le projet de l'apprenant, **tous** les tests sélectionnés par `[tests]` (y compris
`failing`) passent. Aucune vérification structurelle en schéma 1 : on ne vérifie pas *comment* l'exigence a été
implémentée. La pertinence d'un `refactor` repose donc sur la conception de l'exigence (cf. guide d'auteur).

### 6.4 Vérifications de la CI

Pour chaque exercice, la CI du registre DOIT constater :

1. État de départ : chaque fichier `failing` a au moins un test rouge ; aucun autre test n'est rouge.
2. État solution (§6.2) : tous les tests sont verts.

Seuls les tests comptent. En TypeScript et JavaScript, un état de départ qui ne passe pas le typecheck (un test qui
utilise une valeur que la base ne connaît pas encore) est valide : l'exécution ignore les types. En Go et en Kotlin,
les tests sont compilés ensemble : un fichier `failing` qui ne compile pas rend rouges tous les tests, ce qui viole la
règle 1. Il DOIT donc compiler contre l'état de départ (cf. guide d'auteur).

Un sous-dossier de `exercises/` qu'aucun `[[exercises]]` ne déclare → `W_EXERCISE_UNDECLARED`. Les fichiers placés
directement sous `exercises/` ne sont pas des exercices et sont ignorés.

Échec → template `broken` (voir [registry.md](./registry.md)).

## 7. Base et variantes

### 7.1 `[base]`

```toml
[base]
template = "github:typika/templates/strategy-base/ts"
focus = ["src/checkout/**"]
```

| Champ | Type | Requis | Contraintes |
|---|---|---|---|
| `template` | ref | oui | Template de `role = "base"` (sinon `W_BASE_NOT_BASE_ROLE`). |
| `focus` | tableau de globs | non | Restreint la vue « diff depuis la base » aux fichiers concernés. Défaut : tous les fichiers hors `tour/` et `exercises/`. |

La base DOIT avoir le même `language` et le même `runtime.kind` que le template (`E_BASE_MISMATCH`). Une base n'a ni
`[base]`, ni `[variants]`, ni `[tour]` (`E_BASE_FORBIDDEN_FIELD`).

### 7.2 `[variants]`

```toml
[variants]
kotlin = "github:typika/templates/strategy/kotlin"
go = "github:typika/templates/strategy/go"
```

- Clés : valeurs de `facets.language`, différentes du langage du template (`E_VARIANT_SELF`).
- La variante référencée DOIT avoir le langage de sa clé (`E_VARIANT_LANGUAGE_MISMATCH`, vérifié à la résolution).
- Les variantes DEVRAIENT être symétriques : si A déclare B, B déclare A. Sinon `W_VARIANT_NOT_SYMMETRIC` ; le registre
  complète le graphe dans l'index pour que la comparaison fonctionne dans les deux sens.
- Une variante DEVRAIT partager le topic principal du template (`W_VARIANT_TOPIC_DIVERGES`).

## 8. Références de template

```
github:<owner>/<repo>[/<path>][@<ref>]
```

| Partie | Contraintes |
|---|---|
| `owner`, `repo` | Règles de nommage GitHub. |
| `path` | Sous-dossier contenant `typika.toml`. Pas de `..`, pas de `/` final. |
| `ref` | Tag, branche ou SHA de commit. |

Résolution :

- Sans `@ref` : branche par défaut du repo **au moment de l'indexation**.
- L'index du registre stocke toujours un **SHA de commit** : le hub sert une version figée, reproductible, que la CI de
  santé a testée.
- Ref invalide syntaxiquement → `E_INVALID_REF` ; introuvable à la résolution → `E_REF_UNRESOLVABLE`.

`parent` (remix) : posé par l'action « remix » avec le SHA du template d'origine. Il n'a pas d'effet sur l'exécution ;
le hub l'utilise pour afficher la filiation et le diff avec le parent.

## 9. Licence

- `license` DOIT être un identifiant SPDX valide (`E_LICENSE_INVALID`).
- Un fichier `LICENSE` DOIT exister (`E_LICENSE_FILE_MISSING`).
- Registre : la licence DOIT être approuvée OSI (`E_LICENSE_NOT_OSI`) ; les templates officiels `typika/*` DOIVENT
  être en `MIT-0` (règle de revue).

## 10. Versionnement du schéma

- `schema` est un entier. Une version de l'app supporte la version courante **et la précédente**.
- **Sans changement de version** : ajout d'une valeur à une énumération ouverte par le registre (`framework`,
  `library`, topics), changement des limites de taille (§1) et des règles propres au registre (§5.3 règle 5, §9).
- **Avec changement de version** : tout ajout, suppression ou renommage de champ, champ optionnel devenu requis,
  changement de sémantique ou de défaut, nouvelle erreur `E_` au niveau manifeste ou workspace, ajout d'une valeur aux
  énumérations fermées (`language`, `runtime.kind`, `kind` d'exercice, `paradigm`, `level`, `useCase`).
  Un champ ajouté est une nouvelle version parce que la validation refuse les clés inconnues : sans nouvelle version, une app
  qui ne connaît que l'ancien schéma rejetterait un manifeste valide.
- Un nouvel avertissement `W_` ne change pas la version : il n'empêche pas l'ouverture.
- Chaque changement de version s'accompagne d'une migration automatique dans le package `manifest`, exposée par le CLI.
- Le registre refuse les nouvelles entrées dans une version dépréciée et ouvre une PR de migration sur les templates
  `typika/*`.

## 11. Validation

Trois niveaux, du plus local au plus global :

| Niveau | Où | Vérifie |
|---|---|---|
| Manifeste | app, CLI, CI | TOML valide, champs, types, énumérations, formats. |
| Workspace | CLI, CI | Fichiers référencés (`entry`, étapes, exercices, `LICENSE`, `README.md`), front-matter, ancres, tailles. |
| Registre | CI du registre | Refs résolubles, base / variantes cohérentes, unicité de `name`, topics connus, licence OSI, exécution des tests et exercices. |

### 11.1 Codes

Les erreurs bloquent ; les avertissements (`W_`) n'empêchent pas l'ouverture dans la sandbox.

| Code | Niveau | Message (anglais, affiché tel quel) |
|---|---|---|
| `E_TOML_PARSE` | manifeste | `typika.toml is not valid TOML: {detail} (line {line})` |
| `E_SCHEMA_VERSION_UNSUPPORTED` | manifeste | `Manifest schema {found} is not supported. Supported: {supported}.` |
| `E_MISSING_FIELD` | manifeste | `Missing required field "{path}".` |
| `E_UNKNOWN_FIELD` | manifeste | `Unknown field "{path}". Extensions must live under [x-*].` |
| `E_INVALID_VALUE` | manifeste | `Invalid value for "{path}": {reason}.` |
| `E_INVALID_REF` | manifeste | `"{ref}" is not a valid template reference (expected github:<owner>/<repo>[/<path>][@<ref>]).` |
| `E_RUNTIME_LANGUAGE_MISMATCH` | manifeste | `Runtime "{kind}" cannot run language "{language}".` |
| `E_VARIANT_SELF` | manifeste | `A template cannot declare a variant in its own language ("{language}").` |
| `E_EXERCISE_DUPLICATE_NAME` | manifeste | `Exercise name "{name}" is used more than once.` |
| `E_EXERCISE_FROM_BASE_WITHOUT_BASE` | manifeste | `Exercise "{name}" starts from base but the template has no [base].` |
| `E_EXERCISE_SOLUTION_FROM_SELF` | manifeste | `Exercise "{name}": solutionFrom = "self" requires from = "base".` |
| `E_LICENSE_INVALID` | manifeste | `"{license}" is not a valid SPDX license identifier.` |
| `E_BASE_FORBIDDEN_FIELD` | manifeste | `A base template cannot declare [{field}].` |
| `E_ENTRY_NOT_FOUND` | workspace | `Entry file "{path}" does not exist.` |
| `E_LICENSE_FILE_MISSING` | workspace | `LICENSE file is missing.` |
| `E_README_FILE_MISSING` | workspace | `README.md file is missing.` |
| `E_TOUR_STEP_NOT_FOUND` | workspace | `Tour step "{path}" does not exist.` |
| `E_TOUR_FRONTMATTER` | workspace | `Tour step "{path}": {reason}.` |
| `E_TOUR_DUPLICATE_ID` | workspace | `Tour step id "{id}" is used more than once.` |
| `E_TOUR_ANCHOR_OUT_OF_RANGE` | workspace | `Tour step "{id}": lines {lines} are outside "{file}" ({count} lines).` |
| `E_TOUR_REGION_NOT_FOUND` | workspace | `Tour step "{id}": region "{region}" not found in "{file}".` |
| `E_EXERCISE_PATH_NOT_FOUND` | workspace | `Exercise "{name}": "{path}" does not exist.` |
| `E_REF_UNRESOLVABLE` | registre | `Cannot resolve "{ref}": {reason}.` |
| `E_BASE_MISMATCH` | registre | `Base "{ref}" must use language "{language}" and runtime "{kind}".` |
| `E_VARIANT_LANGUAGE_MISMATCH` | registre | `Variant "{key}" points to a "{found}" template.` |
| `E_NAME_TAKEN` | registre | `Template name "{name}" is already registered.` |
| `E_LICENSE_NOT_OSI` | registre | `License "{license}" is not OSI-approved.` |
| `E_EXERCISE_START_STATE` | registre | `Exercise "{name}": starting state is wrong ({reason}).` |
| `E_EXERCISE_SOLUTION_FAILS` | registre | `Exercise "{name}": reference solution does not pass all tests.` |
| `W_SIZE` | workspace | `Template exceeds {limit}: {actual}.` |
| `W_UNKNOWN_TOPIC` | workspace | `Topic "{topic}" is not in the registry vocabulary yet.` |
| `W_EXERCISE_UNDECLARED` | workspace | `Folder "exercises/{name}" is not declared in [[exercises]].` |
| `W_TOUR_ORDER_DIVERGES` | registre | `Tour steps {ids} are not in the same order as the reference variant.` |
| `W_VARIANT_NOT_SYMMETRIC` | registre | `"{other}" does not list this template as a variant.` |
| `W_VARIANT_TOPIC_DIVERGES` | registre | `Variant "{key}" has a different primary topic.` |
| `W_BASE_NOT_BASE_ROLE` | registre | `Base "{ref}" does not declare role = "base".` |

Le package `manifest` renvoie chaque problème sous la forme d'un `ManifestIssue` (`code`, `path`, `message`). `path` est
le chemin du champ (`exercises[1].failing`) ou du fichier (`tour/02-context.md`), pour que l'éditeur souligne l'endroit
fautif. Un manifeste ou un workspace invalide échoue avec une seule `ManifestInvalidError` qui porte tous les problèmes
trouvés, avertissements compris : l'auteur les voit tous en une fois.

## 12. Exemple complet

```toml
schema = 1
name = "strategy-ts"
title = "Strategy: shipping options"
summary = "Pick an algorithm at runtime without the caller knowing which one runs."
license = "MIT-0"
authors = ["github:maoudin"]

[facets]
language = "typescript"
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy", "principle/open-closed"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "browser-js"
entry = "src/main.ts"

[commands]
test = "vitest"

[tests]
include = ["tests/**/*.test.ts"]

[tour]
steps = [
  "tour/01-overview.md",
  "tour/02-the-problem.md",
  "tour/03-strategy-interface.md",
  "tour/04-context.md",
  "tour/05-choosing-at-runtime.md",
  "tour/06-trade-offs.md",
]

[base]
template = "github:typika/templates/strategy-base/ts"
focus = ["src/checkout/**"]

[variants]
go = "github:typika/templates/strategy/go"
kotlin = "github:typika/templates/strategy/kotlin"

[[exercises]]
name = "add-pickup-point-option"
kind = "refactor"
title = "Add a pickup-point shipping option"
from = "base"
solutionFrom = "self"
failing = ["tests/pickup-point.test.ts"]

[[exercises]]
name = "implement-express"
kind = "fix"
title = "Implement the express shipping strategy"
failing = ["tests/express-shipping.test.ts"]
hints = ["hint-1.md", "hint-2.md"]
```
