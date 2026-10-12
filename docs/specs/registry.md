# Registre et index

Statut : brouillon · 2026-10-08 · Voir aussi : [manifest](manifest.md), [catalogue](catalogue.md),
[security](security.md), [guide d'auteur](../guides/template-authoring.md)

Le registre est la seule source de vérité du hub. Il ne contient pas de code de template : il référence des templates
hébergés sur GitHub et produit l'index statique que l'app consomme.

## 1. Le dépôt `typika/registry`

```
registry/
├── templates/
│   ├── official/
│   │   ├── hexagonal-architecture.toml
│   │   └── strategy-ts.toml
│   └── community/
│       └── <name>.toml
├── maintainers.toml           # équipe de curation, rôles
├── vocabulary.toml            # topics connus et leur libellé
├── health/                    # état calculé, écrit uniquement par la CI
│   └── <name>.json
├── schema/
│   └── index.schema.json      # schéma JSON de index.json
├── CODEOWNERS
└── .github/workflows/
    ├── validate-pr.yml
    ├── build-index.yml
    └── health.yml
```

### 1.1 Fichier d'entrée

Un fichier par template, nommé d'après le `name` du manifeste.

```toml
ref = "github:typika/templates/strategy/ts@3f2c9a1e7b4d"
maintainers = ["github:maoudin", "github:alice"]
category = "official"          # official | community
added = 2026-10-08
```

| Champ | Obligatoire | Règle |
|---|---|---|
| `ref` | oui | Référence complète, **épinglée sur un SHA de commit** (§6). Branche ou tag refusés. |
| `maintainers` | oui | Au moins un compte GitHub. Reçoit les notifications de santé. |
| `category` | oui | `official` : dépôt sous `typika/*`, maintenu par l'équipe de curation. `community` : tout autre dépôt. |
| `added` | oui | Date d'entrée, renseignée par la PR. |
| `parent` | non | Ref épinglée du template dont celui-ci est un remix (§7). |

Le nom du fichier doit être égal au `name` du manifeste pointé. Les noms sont uniques sur tout le registre, toutes
catégories confondues.

### 1.2 Officiel et communauté

| | `official` | `community` |
|---|---|---|
| Hébergement | `typika/*` | N'importe quel dépôt GitHub public |
| Licence | MIT-0 | Toute licence approuvée OSI, déclarée dans le manifeste |
| Revue | Équipe de curation, 2 approbations | Équipe de curation, 1 approbation |
| Mise en avant | Accueil, parcours, catalogue | Liste à facettes, recherche |

### 1.3 Dépôt des templates officiels

Les templates officiels vivent dans **un seul dépôt**, `typika/templates`, et pas un dépôt par template : avec les
bases et les variantes, cela ferait près de 80 dépôts à configurer, surveiller et mettre à jour.

```
typika/templates/
├── strategy/
│   ├── ts/            # typika.toml + sources
│   ├── go/
│   └── kotlin/
├── strategy-base/
│   └── ts/
├── hexagonal/
│   └── …
└── renovate.json
```

- Ref d'un template officiel : `github:typika/templates/<concept>/<langage>@<sha>`.
- Ref d'une base : `github:typika/templates/<concept>-base/<langage>@<sha>`.
- Une PR du dépôt ne lance que les tests des dossiers modifiés.
- Un commit change le SHA de tout le dépôt : l'automatisation du registre ne met à jour que les entrées dont le
  dossier a changé (§6).

Les templates communautaires restent libres de leur organisation (un dépôt, un sous-dossier, un monorepo).
| Dépendances | Renovate géré par l'équipe | Responsabilité du mainteneur |

## 2. Processus de contribution

### 2.1 Ajouter un template

1. L'auteur valide en local : `typika validate` ([sharing-and-cli](sharing-and-cli.md#7-typika-validate)).
2. Il ouvre une PR qui ajoute **un seul** fichier `templates/<category>/<name>.toml`.
3. `validate-pr.yml` lance les validations automatiques (§2.2) et poste un commentaire de synthèse.
4. Revue humaine (§2.3).
5. Merge → `build-index.yml` régénère l'index ; le template apparaît au déploiement suivant.

### 2.2 Validations automatiques (bloquantes)

| # | Vérification | Codes |
|---|---|---|
| V1 | Le fichier d'entrée respecte le schéma (§1.1), `ref` épinglée sur un SHA existant. | `E_MISSING_FIELD`, `E_UNKNOWN_FIELD`, `E_INVALID_VALUE`, `E_INVALID_REF`, `E_REF_NOT_PINNED`, `E_REF_UNRESOLVABLE` |
| V2 | Le manifeste `typika.toml` est présent à la ref et valide (schéma partagé `manifest`). | codes `manifeste` de [manifest §11](manifest.md) |
| V3 | `name` unique ; nom de fichier = `name`. | `E_NAME_TAKEN`, `E_ENTRY_NAME_MISMATCH` |
| V4 | Licence présente et approuvée OSI ; `official` ⇒ MIT-0, hébergé sous `typika/*`, et rangé dans `templates/official/`. | `E_LICENSE_NOT_OSI`, `E_LICENSE_NOT_MIT0`, `E_CATEGORY_MISMATCH`, `E_INVALID_VALUE` |
| V5 | Toutes les refs internes (`base`, `variants`, `parent`) existent et sont elles-mêmes au registre ou dans la même PR. | `E_REF_UNRESOLVABLE`, `E_BASE_MISMATCH`, `E_VARIANT_LANGUAGE_MISMATCH` |
| V6 | Les fichiers référencés existent : `runtime.entry`, étapes de tour, ancres `file#Lx-Ly` dans les bornes du fichier. Un tour officiel commence par `overview` et finit par `trade-offs` ([manifest §5.3](manifest.md)). | codes `workspace` de [manifest §11](manifest.md), `E_TOUR_REQUIRED_STEP` |
| V7 | Topics connus de `vocabulary.toml` (`<category>/<slug>`) ; facettes valides. | `E_INVALID_VALUE` |
| V8 | Run de santé complet (§4) en état `healthy`. Un template ne peut pas entrer en `degraded` ou `broken`. | — |
| V9 | Exercices : pour `fix`, les tests listés échouent à l'état initial et tout le reste passe ; pour `refactor`, les tests de l'exigence échouent et passent sur la solution fournie. Un principe ou un design pattern a au moins un exercice `refactor` (§2.3). | `E_EXERCISE_START_STATE`, `E_EXERCISE_SOLUTION_FAILS`, `E_REFACTOR_EXERCISE_MISSING` |
| V10 | Taille totale du template sous la limite de [security](security.md). Pas de binaire hors liste blanche. | `E_SIZE` |

`packages/registry-tools` porte ces vérifications : `registry-tools build <registre> --out <index.json>` les exécute,
puis écrit l'index. Elle lit chaque template à son SHA épinglé. Tant que `typika/templates` n'existe pas (lot 7 du M3),
le dossier `registry/` du monorepo tient lieu de registre, et `github:typika/templates/<chemin>@<sha>` se lit dans le
dossier `templates/` du monorepo, à ce commit. V8 arrive avec la CI de santé ; les exercices Go et Kotlin ne sont pas
encore exécutés (V9). `registry-tools mirror <index.json> --out <dossier>` écrit les fichiers de chaque entrée à sa ref
épinglée, au format de jsDelivr ([0022](../decisions/0022-template-files-source.md)) : c'est la source des fichiers
quand l'app sert son propre registre.

### 2.3 Revue humaine — critères d'acceptation

La revue juge la valeur pédagogique, pas seulement que ça tourne.

- **Un concept, bien expliqué.** Le template enseigne ce que ses topics annoncent, sans code hors sujet.
- **Base pertinente** (principes et patterns) : la base montre le problème de façon crédible, le diff est lisible.
- **Tour** : au moins 3 étapes, ancrées sur le code, en anglais, sans copier le code dans le texte.
- **Au moins un exercice `refactor`** pour les catégories principe et design pattern.
- **Idiomatique** dans son langage ; une variante n'est pas une traduction littérale de TS.
- **Alignement** : une variante reprend les ids d'étapes du template TS de référence pour la comparaison.
- **Pas de doublon** avec un template existant ; sinon proposer une amélioration de l'existant.

Délai de revue visé : non engageant. Une PR sans activité de l'auteur pendant 30 jours est fermée.

### 2.4 Mettre à jour un template

Une PR qui ne modifie que `ref` (nouveau SHA). Revue allégée : validations automatiques + 1 approbation, ou
auto-merge pour les `official` si seul le `ref` change, que la PR vient de l'automatisation de l'équipe (§4.4) et que
V1-V10 passent.

## 3. `index.json`

Généré par `build-index.yml` à chaque merge et après chaque run de santé. Publié comme asset statique versionné avec
l'app, et sous une URL stable pour les instances auto-hébergées. L'app ne lit jamais le registre directement.

### 3.1 Schéma

```jsonc
{
  "schema": 1,
  "generatedAt": "2026-10-08T12:00:00Z",
  "registryCommit": "a1b2c3d",
  "vocabulary": {
    "topics": [
      { "id": "design-pattern/behavioral/strategy", "label": "Strategy", "category": "design-pattern",
        "family": "behavioral" }
    ],
    "languages": ["typescript", "javascript", "go", "kotlin"]
  },
  "templates": [
    {
      "name": "strategy-ts",
      "ref": "github:typika/templates/strategy/ts@3f2c9a1e7b4d",
      "category": "official",
      "maintainers": ["github:maoudin"],
      "addedAt": "2026-10-08",
      "updatedAt": "2026-10-08",
      "manifest": {
        "title": "Strategy",
        "summary": "Replace a growing switch with interchangeable behaviours.",
        "license": "MIT-0",
        "authors": ["github:maoudin"],
        "role": "template",
        "facets": {
          "language": "typescript",
          "framework": [],
          "library": [],
          "paradigm": ["oop"],
          "topic": ["design-pattern/behavioral/strategy", "principle/open-closed"],
          "level": "intermediate",
          "useCase": []
        },
        "runtime": { "kind": "browser-js" },
        "base": "github:typika/templates/strategy-base/ts@9e8d7c6b5a4f",
        "variants": { "kotlin": "kotlin-strategy", "go": "go-strategy" },
        "tour": { "steps": [{ "id": "the-switch", "title": "The growing switch" }] },
        "exercises": [{ "name": "add-shipping-rule", "kind": "refactor", "title": "Add a new shipping rule" }]
      },
      "parent": null,
      "health": {
        "status": "healthy",
        "checkedAt": "2026-10-06T03:00:00Z",
        "brokenSince": null,
        "checks": { "boot": "pass", "tests": "pass", "exercises": "pass", "deps": "pass" },
        "runUrl": "https://github.com/typika/registry/actions/runs/…"
      },
      "search": { "text": "strategy switch behaviour polymorphism" }
    }
  ]
}
```

Règles :

- Les `variants` de l'index sont résolues en **noms** de templates du registre, pas en refs ; `base` est résolue en
  ref épinglée de l'entrée de la base.
- `manifest.role` est repris pour que le hub masque les bases. `facets.framework` est un tableau, comme dans le
  manifeste.
- `health` vaut `null` tant que la CI de santé n'a pas tourné sur le template.
- `schema/index.schema.json` est généré depuis le schéma Effect de l'index (`registry-tools schema`).
- `search.text` réunit, en minuscules et sans doublon, les mots du nom, du titre, du résumé, des `keywords`, des
  libellés de topic, des titres d'étapes du tour et des titres d'exercices.
- Le contenu des fichiers (code, tours) n'est pas dans l'index : l'app le charge à l'ouverture depuis la ref épinglée.
- L'index ne contient que les métadonnées nécessaires au hub et à la recherche. Cible : < 500 Ko compressé.
- `schema` est versionné ; l'app refuse un index de version majeure inconnue et affiche un message.

## 4. CI de santé

### 4.1 Fréquence

- Hebdomadaire sur tout le registre.
- À chaque PR qui ajoute ou modifie une entrée (V8).
- À la demande d'un mainteneur (`workflow_dispatch` sur un nom).

### 4.2 Étapes par template

1. **Résolution** : télécharger la ref, valider le manifeste.
2. **Boot** : démarrer le runtime déclaré dans le même environnement que l'app (navigateur headless piloté par
   Playwright), lancer `commands.start` avec un timeout.
3. **Tests** : lancer `commands.test`, collecter les événements normalisés (voir [runtimes](runtimes.md)).
4. **Exercices** : rejouer V9 pour chaque exercice.
5. **Dépendances** : détecter les dépendances obsolètes ou vulnérables (selon l'outillage du langage).
6. **Écriture** : `health/<name>.json`, puis régénération de l'index.

### 4.3 Calcul de l'état

| État | Condition |
|---|---|
| `healthy` | Boot, tests et exercices passent ; pas d'alerte de dépendance. |
| `degraded` | Tout passe, mais avertissements : dépendance obsolète ou vulnérable, temps de boot au-delà du seuil, warnings du compilateur. |
| `broken` | Échec au boot, aux tests ou aux exercices, ou ref introuvable. |
| `deprecated` | `broken` sans interruption depuis 90 jours, ou décision de l'équipe (§5). |

- Un échec isolé est relancé une fois avant de passer `broken`, pour absorber les erreurs réseau.
- `brokenSince` est conservé tant que l'état reste `broken` ; il repart à zéro dès un run `healthy` ou `degraded`.
- Un template `deprecated` qui redevient sain via une nouvelle ref repasse `healthy` après revue.

### 4.4 Renovate

- Activé sur tous les dépôts `typika/*`.
- Les PR Renovate sur un dépôt de template déclenchent les tests du template ; une fois mergées, l'automatisation de
  l'équipe ouvre la PR de mise à jour de `ref` dans le registre (§2.4).
- Les templates `community` sont libres de l'activer ; le guide d'auteur fournit une configuration.

### 4.5 Notifications

| Événement | Action |
|---|---|
| Passage à `degraded` | Issue ouverte sur le registre, mainteneurs mentionnés. |
| Passage à `broken` | Issue (ou mise à jour de l'issue existante), mainteneurs mentionnés, échéance de dépréciation indiquée. |
| J+60 en `broken` | Rappel sur l'issue. |
| Passage à `deprecated` | Commentaire de clôture, template masqué par défaut. |
| Retour à `healthy` | Issue fermée automatiquement. |

## 5. Dépréciation et retrait

- **Dépréciation** : le template reste dans l'index avec `status: deprecated`. Il est masqué de l'accueil et de la
  liste par défaut, accessible par URL directe avec un bandeau, et toujours exportable.
- **Retrait** : suppression du fichier d'entrée, par PR. Motifs : licence invalide, contenu malveillant, demande de
  l'auteur, `deprecated` depuis 180 jours sans mainteneur actif. Les projets locaux et les liens de partage existants
  continuent de fonctionner : ils embarquent leurs fichiers.
- **Retrait d'urgence** (contenu malveillant, violation de licence) : un membre de l'équipe peut merger sans délai ;
  l'index est régénéré et redéployé immédiatement.

## 6. Versionnement

- Une entrée pointe **toujours** sur un SHA de commit. Le contenu servi par le hub est donc immuable entre deux PR du
  registre : un force-push ou une suppression de branche côté auteur ne change rien.
- Le manifeste peut référencer `base` et `variants` avec n'importe quelle ref ; à l'indexation, elles sont résolues vers
  les entrées du registre.
- Un projet local créé depuis un template enregistre la ref épinglée d'origine : le diff « mes modifications » et le
  reset restent possibles même après une mise à jour du template.
- Si le SHA devient introuvable (dépôt supprimé), le template passe `broken` au run suivant.

## 7. Remix et parent

- Remixer un template dans l'app crée un projet local (voir [sharing-and-cli](sharing-and-cli.md)) dont la métadonnée
  `parent` est la ref épinglée d'origine.
- Si l'utilisateur pousse ce remix sur GitHub, le `typika.toml` généré conserve `parent`.
- Si ce remix est proposé au registre, l'entrée reprend `parent`. La page template affiche alors le lien vers le parent
  et un bouton « diff avec le parent ».
- `parent` est informatif : il n'impose rien sur la licence au-delà de celle du parent, que l'auteur doit respecter.

## 8. Gouvernance

- **Équipe de curation** déclarée dans `maintainers.toml` et `CODEOWNERS`. Rôles : `curator` (revue, merge),
  `admin` (configuration, retraits d'urgence).
- Décisions sur le vocabulaire de topics, les règles d'acceptation et les catégories : par PR sur le registre, avec
  discussion publique, consensus des curateurs. Les décisions structurantes sont consignées en ADR
  ([decisions](../decisions/)).
- Un contributeur `community` régulier peut devenir curateur sur proposition d'un curateur existant.
- Le registre a sa propre licence (CC0 pour les fichiers d'entrée et l'index) ; chaque template garde la sienne.
