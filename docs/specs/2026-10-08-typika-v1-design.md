# Typika — Spec V1

Statut : brouillon à débattre · 2026-10-08

> Spec de conception initiale, conservée comme trace des discussions. Les documents de [docs/](../README.md) et les
> [ADR](../decisions/README.md) la détaillent et font foi en cas de divergence.

## 1. Vision

Un outil **gratuit et open source** pour explorer, exécuter et comparer des templates de code — par langage, librairie,
framework et surtout **par pattern / concept d'architecture** (hexagonal, CQRS, event sourcing, outbox, saga…).

Le **hub de templates est le produit** ; la sandbox est le moyen de les explorer. Un template doit rester utile hors de
la sandbox (`npx typika create <template>`, export GitHub).

### Cibles

- **Primaire — le développeur intermédiaire qui apprend l'architecture.** Il maîtrise un langage, a déjà livré du
  code, et veut comprendre CQRS ou l'hexagonal autrement qu'avec un article et un diagramme. C'est lui qui justifie les
  tours, la comparaison, le diff depuis la base et les exercices.
- **Secondaire — l'auteur de contenu** (blog, doc, formation). Il n'est pas la cible, c'est le **canal** : chaque embed
  amène des apprenants.
- **Non ciblé V1 — le prototypage rapide.** StackBlitz et CodeSandbox le font déjà mieux que nous.

Règle d'arbitrage : en cas de conflit, la fonctionnalité qui sert l'apprenant gagne.

## 2. Principes

1. **Navigateur d'abord** — toute exécution de code a lieu côté client. Seule exception tolérée : un service de
   **compilation** sans état quand aucun compilateur ne tourne dans le navigateur (Kotlin, §7.2). Le serveur compile,
   il n'exécute jamais le code.
2. **Zéro backend métier** — pas de base de données. Le hub est un index statique généré depuis un dépôt registre.
3. **Sans compte par défaut** — compte GitHub uniquement pour publier ou pousser vers un repo.
4. **Pédagogie > exhaustivité** — 15 templates excellents valent mieux que 500 templates morts.
5. **Santé visible** — chaque template est testé en continu ; un template cassé se voit.

## 3. Périmètre

### V1

- Langages : TypeScript, JavaScript, Go, Kotlin — exécutés dans le navigateur (§7.1), livrés par paliers.
- Catalogue initial (§6.1) : 5 patterns d'architecture, 5 principes SOLID, 5 design patterns GoF et 1 template de
  fondamentaux POO. TS couvre tout le catalogue ; les autres langages en couvrent une sélection (§6.1).
- Hub : navigation par facettes, recherche, page template, badge de santé.
- Sandbox : éditeur, arbre de fichiers, console, preview, panneau tests.
- Visites guidées, mode comparaison, vue « diff depuis la base », exercices (tests rouges → verts).
- Embed iframe.
- Partage par URL / gist, export zip / GitHub, CLI `create`.

### Hors V1

- Collaboration temps réel.
- Génération de templates par IA.
- Exécution serveur sur l'instance publique (le runner auto-hébergeable est V2).
- Templates composables (base + add-ons) — V2, sous forme de *stacks* curées.
- Python, Rust et autres langages — V2.
- Runner serveur auto-hébergeable — V2, et plan de repli si un runtime navigateur échoue en spike.

## 4. Glossaire du domaine

| Terme | Définition |
|---|---|
| **Template** | Projet de référence décrit par un manifeste `typika.toml`, vivant dans un repo Git. |
| **Manifest** | Métadonnées, facettes, runtime, commandes, tour, exercices, variantes, base. |
| **Facet** | Axe de classement : `language`, `framework`, `library`, `paradigm`, `topic`, `level`, `useCase`. |
| **Topic** | Ce que le template enseigne, rangé par catégorie : `architecture` (hexagonal, CQRS…), `design-pattern` (GoF), `principle` (SOLID, loi de Déméter…), `fundamental` (encapsulation, polymorphisme…). |
| **Variant** | Le même concept implémenté dans un autre langage / framework. Alimente le mode comparaison. |
| **Base** | Template de référence « naïf » dont le template dérive. Alimente la vue diff. |
| **Tour** | Suite d'étapes Markdown ancrées sur des fichiers / plages de lignes. |
| **Exercise** | Défi attaché à un template. `fix` : des tests sont rouges, il faut les passer au vert. `refactor` : les tests sont verts, il faut ajouter une nouvelle exigence (tests rouges fournis) qui n'est simple qu'après avoir restructuré le code. |
| **Project** | Instance locale (IndexedDB) d'un template, modifiable par l'utilisateur. |
| **Runtime** | Environnement d'exécution navigateur (`browser-js`, `go`, `kotlin`). |
| **Registry** | Dépôt Git qui référence les templates publiés ; génère l'index statique du hub. |
| **Health** | État calculé par la CI du registre : `healthy`, `degraded`, `broken`, `deprecated`. |

## 5. Format du manifeste

```toml
schema = 1
name = "hexagonal-architecture"
title = "Architecture hexagonale"
summary = "Ports & adapters : le domaine ne dépend de rien, les adapters dépendent du domaine."
license = "MIT-0"
authors = ["github:maoudin"]

[facets]
language = "typescript"
paradigm = ["oop"]
topic = ["architecture/hexagonal", "architecture/ports-adapters", "principle/dependency-inversion"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "browser-js"          # browser-js | node | go | kotlin
entry = "src/main.ts"

[commands]
start = "src/main.ts"
test = "vitest"

[tour]
steps = ["tour/01-domain.md", "tour/02-ports.md", "tour/03-adapters.md"]

[base]
template = "github:typika/templates/hexagonal-base/ts"

[variants]
kotlin = "github:typika/templates/hexagonal/kotlin"
go = "github:typika/templates/hexagonal/go"

[[exercises]]
kind = "fix"
name = "add-email-adapter"
title = "Ajouter un adapter d'envoi d'e-mail"
failing = ["tests/notification.test.ts"]
```

Règles :

- Le manifeste est validé par un schema Effect partagé entre l'app, le CLI et la CI du registre (package `manifest`).
- Les étapes de tour ancrent du code via un front-matter `file` + `lines` (`src/domain/order.ts#L10-L24`).
- Une référence de template est toujours `github:<owner>/<repo>[/<path>][@<ref>]`.
- `schema` est versionné ; l'app refuse un manifeste de version inconnue avec un message explicite.

## 6. Hub et registre

### 6.1 Catalogue initial

| Catégorie | Templates | Base (vue diff) |
|---|---|---|
| Architecture | Hexagonal, CQRS, event sourcing, outbox, machine à états | CRUD naïf |
| Principes | SRP, OCP, LSP, ISP, DIP | Le même code qui viole le principe |
| Design patterns | Strategy, Observer, Decorator, Factory Method, Adapter | Le code avant le pattern (`switch`, couplage direct…) |
| Fondamentaux POO | Composition vs héritage | Hiérarchie d'héritage profonde |

Principes de rédaction :

- Chaque template principe / design pattern a une **base** qui montre le problème : la vue diff est la leçon.
- Chaque template a au moins un exercice `refactor` : une nouvelle exigence pénible dans la base, triviale avec le
  pattern.
- Les variantes ne sont pas des traductions littérales. Quand le pattern se dissout dans le langage, la variante le
  montre et le tour le dit : en Go, pas d'héritage ni de classes, les interfaces sont implicites — Strategy devient une
  fonction, « composition vs héritage » n'a qu'une réponse. Le mode comparaison devient une leçon sur le langage.
- Les templates se référencent entre eux : le tour DIP renvoie vers l'hexagonal (« le DIP appliqué à l'échelle d'une
  application »).

Design patterns au-delà de la V1, par vagues de 5, chaque vague mélangeant les trois familles GoF :

| Famille | V1 | Ensuite |
|---|---|---|
| Création | Factory Method | Abstract Factory, Builder, Singleton (présenté avec ses pièges), Prototype |
| Structure | Decorator, Adapter | Facade, Composite, Proxy, Bridge, Flyweight |
| Comportement | Strategy, Observer | Command, State, Template Method, Chain of Responsibility, Iterator, Visitor, Mediator, Memento, Interpreter |
| Hors GoF | — | Repository, Unit of Work, Specification, Null Object, Result / Either, Dependency Injection |

La famille est une sous-catégorie du topic : `design-pattern/behavioral/strategy`.

Fondamentaux POO (encapsulation, polymorphisme, classes abstraites…) : un seul template en V1 pour valider l'intérêt ;
ils visent un public plus débutant que la cible primaire.

### 6.2 Couverture par langage

On ne décline pas tout dans tous les langages : chaque langage couvre ce qu'il enseigne le mieux.
**TypeScript est la langue de référence** : tout le catalogue y existe, et c'est elle qui définit l'ordre des étapes des
tours, que les variantes suivent pour que la comparaison reste alignée.

| Concept | TS | JS | Go | Kotlin |
|---|---|---|---|---|
| Architecture (5) | ✓ | — | hexagonal, CQRS, outbox | ✓ |
| SOLID (5) | ✓ | — | DIP, ISP | ✓ |
| GoF V1 (5) | ✓ | Observer, Decorator | Strategy, Decorator, Adapter | ✓ |
| Composition vs héritage | ✓ | ✓ (prototypes vs classes) | ✓ | ✓ |

Soit environ 44 templates.

- **JS** n'est pas une copie de TS sans types : il n'a de variante que là où il enseigne autre chose (prototypes,
  événements natifs).
- **Go** n'a que les concepts qui ont un sens idiomatique (pas de classes, pas d'héritage, interfaces implicites) ; le
  reste serait de la POO classique écrite en Go.
- **Kotlin** est le langage POO de référence du catalogue : couverture complète. Ses fonctionnalités en font un excellent
  sujet de comparaison — délégation `by` (Decorator, composition), `object` (Singleton), `sealed` + `when` (State,
  Visitor), fonctions de premier ordre (Strategy), `data class` (Value Object).

### 6.3 Registre et index

- **Registre** = repo `typika/registry`. Une PR ajoute une entrée `{ ref, maintainers }`. Revue humaine pour la
  curation.
- **Index** = `index.json` généré par la CI du registre (manifestes résolus + santé), publié en asset statique.
- **CI de santé** hebdomadaire : pour chaque template, installer, démarrer, lancer les tests dans le même runtime
  navigateur que l'app (Playwright headless).
  - `healthy` : tout passe. `degraded` : warnings / deps obsolètes. `broken` : échec.
  - `broken` depuis 90 jours → `deprecated`, masqué par défaut du hub.
- **Renovate** activé sur les repos `typika/*`.
- **Recherche** côté client (MiniSearch ou Orama) sur l'index statique. Dérogation assumée à la règle « pas de filtre
  côté client » : il n'y a pas de backend, et l'index (quelques centaines d'entrées) tient en mémoire.
- **Remix** : forker un template conserve un lien `parent` ; la page affiche le diff avec le parent.

## 7. Exécution

### 7.1 Runtimes V1

| Runtime | Techno | Usage |
|---|---|---|
| `browser-js` | esbuild-wasm + Web Worker, test runner maison compatible API Vitest (describe/it/expect) | Patterns en TS pur, librairies, front Vite simple. Couvre la majorité des templates d'architecture. |
| `go` | Toolchain Go (`cmd/compile`, `cmd/link`) compilée en WASM ([ADR 0018](../decisions/0018-go-runtime.md)) | Templates Go. |
| `kotlin` | Compilation vers Kotlin/JS ou Kotlin/Wasm par un service de compilation (§7.2), exécution et `kotlin.test` dans le navigateur | Templates Kotlin. Spike R8. |

Paliers :

| Palier | Runtimes | Jalon |
|---|---|---|
| 1 | `browser-js` | M1 |
| 2 | `go` | M4 |
| 3 | `kotlin` | M6 |

Pas de runtime `node` en V1 (§7.3).

Tests : chaque runtime traduit la sortie de son outil natif (reporter Vitest, `go test -json`, reporter
`kotlin.test`) vers les événements normalisés du §7.4.

Bases de données : PGlite et SQLite WASM, exposées comme dépendances de template, pas comme service de la plateforme.

### 7.2 Kotlin : compiler sans compilateur navigateur

Le compilateur Kotlin est un programme JVM ; il n'existe pas de version officielle exécutable dans le navigateur.

- **Option retenue** : service de compilation basé sur `kotlin-compiler-server` (JetBrains, open source — licence à
  confirmer), le même que celui de play.kotlinlang.org. Il reçoit des sources, renvoie du JS ou du Wasm ; le navigateur
  exécute le résultat et les tests `kotlin.test`. Sans état, sans stockage, conteneur Docker à part, rate limiting par
  IP, sources limitées en taille.
- **Option explorée** : `kotlinc` exécuté dans le navigateur via une JVM WASM (CheerpJ). Supprimerait le service, mais
  téléchargement de plusieurs dizaines de Mo et compilation lente.
- **Contrainte pour les templates** : cibles JS / Wasm uniquement, donc pas d'API spécifique JVM (`java.*`). Sans
  impact pour du code d'architecture et de patterns.

### 7.3 Licence WebContainers : pas de runtime `node`

L'API WebContainers exige une licence commerciale dès qu'une instance sert des clients ou des employés, et dépend des
serveurs de StackBlitz. Nodebox est sous une licence non OSI réservée aux usages non commerciaux. Aucun template du
catalogue n'a besoin de Node : le runtime `node` sort de la V1 ([ADR 0017](../decisions/0017-node-runtime.md)).

### 7.4 Contrat de runtime

Chaque runtime implémente le même port (`RuntimePort`, `Context.Tag`) :

- `boot(project)` → ressource scopée (`Effect.acquireRelease`) ; quitter le projet libère le worker.
- `run(command)` → `Stream` de sorties stdout / stderr, interruptible.
- `test()` → `Stream` d'événements de test normalisés (`suite`, `pass`, `fail`, `done`), utilisés par le panneau tests
  et les exercices.
- `preview()` → URL de preview si le runtime en expose une.

### 7.5 Isolation cross-origin

`SharedArrayBuffer` (threads WASM) impose COOP/COEP sur la page. Une iframe dans une page tierce ne
peut pas être isolée : l'embed exécute `browser-js`, qui n'en a pas besoin, et renvoie vers l'app pour les autres
runtimes ([0016](../decisions/0016-isolation-and-embed.md)).

## 8. Fonctionnalités UI

### Hub

- Accueil : entrées par pattern (mise en avant), par langage, par framework.
- Facettes combinables, recherche plein texte, filtre de santé.
- Page template : résumé, facettes, santé, variantes, base, tour, bouton « Ouvrir dans la sandbox », commande CLI.

### Sandbox

- Layout : arbre de fichiers · éditeur · panneau bas (console / tests) · preview ou tour à droite.
- Éditeur **CodeMirror 6** ; TS via un language service TypeScript en worker.
- Reset au template d'origine, diff de mes modifications.

### Pédagogie

- **Tour** : panneau d'étapes ; chaque étape ouvre le fichier et surligne les lignes ancrées.
- **Comparaison** : deux variantes côte à côte, navigation synchronisée par étape de tour quand les tours sont alignés.
- **Diff depuis la base** : vue fichier par fichier de ce que le pattern ajoute par rapport au template `base`.
- **Exercices** : charge l'état « tests rouges », affiche la progression, valide quand tout est vert.

### Embed

- Route `/embed/<template>` : UI réduite (éditeur + sortie), options par query string (`file`, `tour-step`, `readonly`,
  `theme`).
- Snippet iframe copiable depuis la page template.

## 9. Persistance, partage, export

- Projets en IndexedDB, liste « mes projets » locale.
- Partage :
  - petit projet → état compressé dans le fragment d'URL (pas envoyé au serveur) ;
  - au-delà d'un seuil → gist via le token GitHub de l'utilisateur.
- Export : zip, push vers un nouveau repo GitHub.
- CLI `typika create <template> [dir]` : télécharge le template, retire les fichiers propres à Typika (tour,
  exercices) sauf `--keep-tour`.
- Composants serveur : l'échange de token OAuth GitHub (une fonction, aucun stockage) et le service de compilation
  Kotlin (§7.2).

## 10. Langues

- **Interface** : i18n dès le départ (`react-i18next`), livrée en anglais et en français.
- **Contenu des templates** (titre, résumé, tours, énoncés d'exercices) : **anglais uniquement en V1**. Un contributeur
  écrit une fois, et une traduction non maintenue finit par contredire le code.
- Le format prévoit l'extension : `tour/<locale>/*.md` optionnel, repli sur l'anglais. Activé en V2 si la demande existe.

## 11. Hébergement

L'app est **agnostique de l'hébergeur** : un build statique + un unique endpoint (`POST /api/github/token`, échange
OAuth, sans stockage).

- **Service de compilation Kotlin** : conteneur séparé dans le `docker-compose.yml`, désactivable (les templates Kotlin
  sont alors masqués). Sur Vercel, déployé à part (VPS ou conteneur managé) et pointé par une variable d'env.
- **Docker (cible principale, VPS)** : image multi-stage — build pnpm, puis runtime Node minimal qui sert le statique
  et l'endpoint. Caddy en frontal pour le TLS automatique et les headers. `docker-compose.yml` fourni.
- **Vercel / Cloudflare / autres** : même build ; headers déclarés dans la config de la plateforme (`vercel.ts`, etc.).
- **Headers obligatoires sur toutes les cibles** : `Cross-Origin-Opener-Policy: same-origin` et
  `Cross-Origin-Embedder-Policy: require-corp` sur les routes sandbox, pas sur l'embed
  ([0016](../decisions/0016-isolation-and-embed.md)). Vérifiés par un test E2E pour qu'aucune cible de déploiement ne
  les oublie.
- **Assets lourds** (runtime Go, esbuild-wasm) : servis depuis un CDN public compatible COEP (jsDelivr) par défaut,
  auto-hébergeables via une variable d'env pour les instances privées. Évite de payer la bande passante sur un VPS.

## 12. Licences

- **Plateforme** (app, packages, CLI) : **MIT**. Standard de l'écosystème JS, aucune friction pour contribuer ou
  réutiliser.
- **Templates officiels** (`typika/*`) : **MIT-0** (MIT sans obligation d'attribution). Un template est fait pour
  être copié dans des projets, y compris propriétaires, via `typika create` ; exiger une notice de licence dans chaque
  projet généré serait un frein.
- **Templates tiers** : licence libre au choix de l'auteur, déclarée dans le manifeste et affichée sur la page template.
  Le registre refuse les templates sans licence OSI.

## 13. Stack

### Ce qu'on garde de la stack habituelle

| Élément | Raison |
|---|---|
| TypeScript, Effect | Schema du manifeste partagé app / CLI / CI ; cycle de vie des runtimes (Scope, interruption, Stream) — c'est exactement le terrain d'Effect. |
| Architecture modulaire `core/` + `ui/`, `domain-model`, TaggedError, constants `as const` | Inchangé. |
| Ports via `Context.Tag` + Layers | Runtimes, stockage, registre, GitHub sont des ports avec adapters. |
| React 19 + Compiler, Tailwind v4, Base UI | Inchangé. |
| TanStack Router (via TanStack Start, prérendu statique du hub) | Pages hub indexables par les moteurs de recherche ; sandbox en SPA. |
| Composants purs + presenter hooks, features minces, routes coquilles | Inchangé. |
| Vitest, Playwright, oxlint, oxfmt | Inchangé. Playwright sert aussi à la CI de santé du registre. |

### Ce qu'on retire

| Élément | Raison |
|---|---|
| Nitro API routes, Drizzle, Neon, commands / queries serveur | Pas de backend métier. |
| Redux Toolkit, redux-persist, outbox, connectivity | L'état chaud (contenu de fichiers, sorties de process) change trop vite pour Redux ; l'app est hors ligne par nature, il n'y a pas de mutation serveur à mettre en file. Remplacé par **Effect Atom** (`@effect-atom/atom-react`), déjà utilisé via effect-form, branché directement sur les services Effect. |
| Gateways HTTP + `extraArgument` | Remplacés par les Layers côté client. |
| Auth, multi-tenant | Pas de comptes ; GitHub OAuth uniquement. |

## 14. Organisation du code

Monorepo pnpm + Turborepo.

```
apps/
  web/                         # hub + sandbox + embed (TanStack Start)
packages/
  manifest/                    # schema Effect du manifeste, parser TOML, résolution des refs
  runtime-core/                # RuntimePort, événements de test normalisés
  runtime-browser-js/
  runtime-go/
  runtime-kotlin/
  test-runner/                 # runner compatible Vitest pour browser-js
  cli/                         # npx typika create
  registry-tools/              # génération d'index + CI de santé
services/
  kotlin-compiler/             # image Docker du service de compilation
```

Modules de `apps/web/src/modules/` : `shared`, `app`, `hub`, `project`, `editor`, `runtime`, `tour`, `compare`,
`exercise`, `share`, `github`.

Topologie d'un module :

```
<module>/
├── core/
│   ├── domain/        # schemas, errors, constants
│   ├── ports/         # Context.Tag + interfaces
│   ├── adapters/      # implémentations (IndexedDB, GitHub, workers…)
│   ├── programs/      # opérations métier Effect (ex-commands/queries, côté client)
│   └── atoms/         # Effect Atoms exposés à l'UI
└── ui/
    ├── components/
    └── hooks/
```

## 15. Risques et spikes

| # | Risque | Spike |
|---|---|---|
| R1 | Licence WebContainers incompatible | Lire les conditions, tester Nodebox, mesurer la couverture de `browser-js` seul. |
| R2 | COOP/COEP casse l'embed | Prototype iframe embarquée sur un domaine tiers. |
| R3 | Poids des runtimes (10 à 30 Mo) | Lazy-load à l'ouverture d'un template du langage, cache Service Worker, indicateur de chargement explicite. |
| R4 | IntelliSense TS dans CodeMirror 6 | Prototype language service en worker sur un template de 20 fichiers. |
| R5 | Pourrissement des templates | CI de santé + Renovate dès le premier template. |
| R6 | Nom du projet | Premier nom, Temenos, abandonné (Temenos AG, éditeur de logiciels bancaires coté). Typika retenu, recherche de marques à faire ([ADR 0014](../decisions/0014-name-typika.md)). |
| R7 | Go dans le navigateur | Couverture du langage par Yaegi (génériques, `testing`) contre poids de la toolchain complète. |
| R8 | Kotlin | Déployer `kotlin-compiler-server` en conteneur, mesurer latence de compilation et RAM ; confirmer sa licence ; tester `kotlinc` via CheerpJ comme alternative. |
| R9 | Abus du service de compilation | Rate limiting, taille max des sources, timeout de compilation, aucun accès réseau sortant depuis le conteneur. |

## 16. Jalons

Progression pas à pas, sans date ni lancement : chaque jalon livre quelque chose d'utilisable, et on décide du suivant
une fois le précédent terminé.

1. **M0 — Spikes** R1, R2, R4, R7, R8. Choix techniques Go et Kotlin.
2. **M1 — Socle** : `manifest`, `runtime-browser-js`, `test-runner`, sandbox minimale (arbre + éditeur + console + tests).
3. **M2 — Pédagogie** : tour, diff depuis la base, exercices `fix` et `refactor`. Catalogue §6.1 en TS, variantes JS.
4. **M3 — Hub** : registre, index, CI de santé, pages hub prérendues, recherche.
5. **M4 — Go & comparaison** : `runtime-go`, variantes Go, mode comparaison.
6. **M5 — Partage** : embed, partage URL / gist, export, CLI.
7. **M6 — Kotlin** : service de compilation, `runtime-kotlin`, variantes Kotlin.

## 17. Décisions prises

| Sujet | Décision |
|---|---|
| Exécution | Navigateur d'abord, runner auto-hébergeable en V2 |
| Templates | Statiques en V1, stacks composables en V2 |
| Cible | Développeur intermédiaire qui apprend l'architecture ; auteurs de contenu comme canal |
| Catalogue initial | 5 architectures, 5 SOLID, 5 GoF, 1 fondamental POO (§6.1) |
| Langues | UI en + fr ; contenu des templates en anglais |
| Hébergement | Docker sur VPS en cible principale, compatible Vercel et autres |
| Licences | MIT pour la plateforme, MIT-0 pour les templates officiels |
| Langages | TS, JS, Go, Kotlin ; TS langue de référence ; Kotlin compilé côté serveur, exécuté dans le navigateur |

## 18. Questions ouvertes

1. Résultat du spike R8 (service de compilation Kotlin).
2. Recherche de marques sur « Typika » (R6).
