# Architecture du code

Statut : spec · détaille les §13 et §14 de la [spec V1](./2026-10-08-typika-v1-design.md)

## 1. Vue d'ensemble

Typika est une app presque entièrement côté client. Le serveur sert du statique et un seul endpoint, plus un service de
compilation Kotlin facultatif.

```
┌───────────────────────────── navigateur ──────────────────────────────┐
│ Origine app (TYPIKA_PUBLIC_URL)          Origine runtime              │
│ ┌──────────────────────────────┐          (TYPIKA_RUNTIME_ORIGIN)    │
│ │ hub · sandbox · embed        │ postMsg  ┌──────────────────────────┐ │
│ │ React + Effect Atom          │◀────────▶│ runtime frame            │ │
│ │ IndexedDB (projets)          │          │ workers · WASM · preview │ │
│ └──────────────────────────────┘          └──────────────────────────┘ │
└────────┬──────────────────────────┬───────────────────────────────────┘
         │ statique + index.json    │ POST /compile (Kotlin uniquement)
         │ POST /api/github/token   ▼
   ┌─────┴──────┐          ┌──────────────────┐        ┌──────────────┐
   │ web (Node) │          │ kotlin-compiler  │        │ CDN d'assets │
   └────────────┘          └──────────────────┘        └──────────────┘
```

Le code utilisateur ne s'exécute jamais sur l'origine app : voir [security.md](./security.md).

## 2. Monorepo

pnpm workspaces + Turborepo.

```
apps/
  web/                    # hub + sandbox + embed + runtime frame (TanStack Start)
packages/
  config/                 # tsconfig de base, config oxlint / oxfmt partagée
  manifest/               # schema Effect de typika.toml, parser TOML, résolution des refs github:
  runtime-core/           # RuntimePort, RuntimeSession, TestEvent, erreurs et limites des runtimes
  runtime-browser-js/     # esbuild-wasm + workers
  runtime-go/             # toolchain Go (compile, link) en WASM et pilote de build
  runtime-kotlin/         # client du service de compilation + exécution
  test-runner/            # runner compatible Vitest pour browser-js, sans dépendance
  vitest-reporter/        # reporter Vitest → TestEvent, pour la conformité du test-runner (privé)
  cli/                    # npx typika create
  registry-tools/         # génération de l'index, CI de santé, précompilation Kotlin
services/
  kotlin-compiler/        # image Docker : service de compilation (kotlin-compiler-embeddable), protocole Typika
```

Note : la spec V1 (§14) range par erreur `test-runner`, `cli` et `registry-tools` sous `services/`. Ce sont des
packages TypeScript ; `services/` ne contient que des services déployables.

### 2.1 Dépendances autorisées

| Package | Peut dépendre de |
|---|---|
| `config` | — |
| `manifest` | `effect`, `smol-toml` (parser TOML), `spdx-license-ids` (liste SPDX) |
| `runtime-core` | `effect`, `manifest` (types) |
| `runtime-*` | `runtime-core`, `manifest`, ses dépendances techniques |
| `test-runner` | rien (il est injecté dans le bundle de code utilisateur : zéro dépendance, taille minimale) |
| `vitest-reporter` | `vitest` (peer) |
| `cli` | `manifest`, `effect` |
| `registry-tools` | `manifest`, `runtime-core`, `runtime-*` |
| `apps/web` | tous les packages sauf `cli` et `registry-tools` |

Interdits :

- un package qui dépend d'une app ;
- un `runtime-x` qui dépend d'un `runtime-y` ;
- `manifest` ou `runtime-core` qui dépend de React ou du DOM : ils tournent aussi dans le CLI et la CI.

Vérification : `turbo boundaries` si la fonctionnalité convient à ces règles (à évaluer au M1), sinon un script CI
`scripts/check-package-boundaries.ts` qui lit les `package.json`.

## 3. `apps/web`

### 3.1 Arborescence

```
apps/web/src/
├── modules/             # logique et UI par domaine (§3.2)
├── features/            # pages : orchestrent presenter hooks + composants, aucun composant propre
├── routes/              # coquilles TanStack (§5)
├── ui/                  # design system (Base UI + cva), sans logique métier
└── i18n/                # ressources react-i18next (en, fr)
```

### 3.2 Modules

| Module | Responsabilité | Ports principaux |
|---|---|---|
| `shared` | Helpers Effect, erreurs de base, client HTTP, configuration runtime (`/config.json`) | `AppConfig` |
| `app` | Composition : `AppLayer`, runtime d'atoms, providers React | — |
| `hub` | Chargement de l'index, recherche et facettes, pages template | `RegistryIndexPort`, `SearchIndexPort` |
| `project` | Projets locaux : création depuis un template, fichiers, état modifié, reset, persistance | `ProjectStoragePort`, `TemplateSourcePort` |
| `editor` | CodeMirror 6, onglets, langages, adaptateur du language service TS en worker ([0015](../decisions/0015-editor.md)), décorations (tour, diagnostics) | `LanguageServicePort` |
| `runtime` | Pont entre un projet et une `RuntimeSession` : boot, synchro FS, run, tests, console, preview | `RuntimeRegistry`, `RuntimeFramePort` |
| `tour` | Étapes de tour, rendu Markdown sûr, ancrage sur fichiers et lignes | `MarkdownRendererPort` |
| `compare` | Deux variantes côte à côte, alignement des étapes, diff depuis la base | `DiffPort` |
| `exercise` | Chargement d'un exercice, suivi des tests, validation | — |
| `share` | Partage par fragment d'URL ou gist, export zip, import d'un lien | `ShareCodecPort`, `ArchivePort` |
| `github` | OAuth, gists, création de repo, push | `GitHubPort`, `GitHubTokenPort` |

Dépendances entre modules : `exercise` → `runtime`, `project` ; `compare` → `project`, `tour` ; `share` → `project`,
`github` ; `runtime` → `project`. Tout module peut utiliser `shared`. Pas de cycle.

### 3.3 Topologie d'un module

```
<module>/
├── core/
│   ├── domain/
│   │   ├── <module>.domain-model.ts      # schemas Effect + types dérivés
│   │   ├── errors/<contexte>.error.ts    # TaggedError <Module><Contexte>Error
│   │   └── constants/<nom>.constant.ts   # objets as const
│   ├── ports/
│   │   └── <nom>.port.ts                 # interface + Context.Tag
│   ├── adapters/
│   │   ├── <nom>.<techno>.adapter.ts     # ex. project-storage.indexeddb.adapter.ts
│   │   └── <nom>.<techno>.adapter.test.ts
│   ├── programs/
│   │   └── <action>/
│   │       ├── <action>.program.ts       # opération Effect.gen
│   │       └── <action>.program.test.ts
│   ├── atoms/
│   │   ├── <module>.atoms.ts
│   │   └── <module>.atoms.test.ts
│   ├── <module>.layer.ts                 # Layer des adapters du module
│   └── <module>.test-layer.ts            # adapters en mémoire pour les tests
└── ui/
    ├── components/<Name>.tsx             # purs : props in, events out
    └── hooks/use-<action>-<module>.ts    # presenter hooks
```

Écarts assumés par rapport à la topologie habituelle (`commands/`, `queries/`, `repository/`, `gateway/`, `store/`) :

| Habituel | Ici | Raison |
|---|---|---|
| `commands/` + `queries/` serveur | `programs/` client | Pas de backend métier ; la séparation lecture / écriture reste visible dans le nom (`open-project`, `list-projects`) |
| `repository/` + `gateway/` | `ports/` + `adapters/` | Les dépendances sont variées (IndexedDB, workers, GitHub, CDN) ; un seul vocabulaire |
| `store/` Redux | `atoms/` Effect Atom | Décision de la spec V1 §13 |

Nouveaux suffixes : `.port.ts`, `.adapter.ts`, `.program.ts`, `.atoms.ts`, `.layer.ts`. Les autres suivent les
conventions habituelles (`.domain-model.ts`, `.error.ts`, `.constant.ts`, `.test-layer.ts`, `.test.ts`,
`.test.e2e.ts`, composants en PascalCase).

### 3.4 Flux de données

```
composant pur ──event──▶ presenter hook ──useAtomSet──▶ atom (fn) ──▶ program ──▶ port ──▶ adapter
      ▲                        │                                                          │
      └──────props────── useAtomValue ◀──────────── atom (valeur / Result) ◀───────────────┘
```

- **`AppLayer`** (`modules/app/app.layer.ts`) fusionne les `<module>.layer.ts` avec `Layer.mergeAll`. Un seul runtime
  d'atoms est créé à partir de lui (`Atom.runtime(AppLayer)`).
- **Atoms** : un atom de lecture expose un `Result` (chargement, succès, échec) ; un atom fonction déclenche un program.
  Les atoms ne contiennent pas de logique : ils appellent des programs.
- **Presenter hooks** : lisent les atoms, exposent une API simple (`{ files, isDirty, save, reset }`). Pas de
  `useMemo` / `useCallback` : React Compiler s'en charge.
- **Composants** : props et callbacks uniquement. Aucun import d'atom, de port ou d'adapter.
- **Features** : seul endroit où hooks et composants se rencontrent.

**État chaud** : le contenu du fichier en cours d'édition vit dans l'état CodeMirror, pas dans un atom. Le module
`editor` émet les modifications ; `project` les persiste (écriture IndexedDB regroupée, ~300 ms) et `runtime` les relaie
au `RuntimeFs`. Un atom ne reçoit jamais une frappe clavier.

**Runtime frame** : `RuntimeFramePort` encapsule l'iframe de l'origine runtime et un `MessageChannel`. Côté app, une
`RuntimeSession` est un proxy qui sérialise les appels ; côté frame, les vrais runtimes s'exécutent. Messages validés
par Effect Schema des deux côtés.

### 3.5 Serveur

Un seul handler serveur, `POST /api/github/token`, en server route TanStack Start
(`src/routes/api/github/token.ts`). Il lit le body, appelle `exchangeGitHubCodeProgram` (`modules/github/core/programs/`)
et renvoie le résultat. Aucune logique dans la route.

Le service Kotlin est hors de `apps/web` (`services/kotlin-compiler`).

## 4. Rendu

| Zone | Mode | Raison |
|---|---|---|
| Hub (`/`, `/templates`, `/t/$templateId`) | Prérendu statique | Indexation par les moteurs de recherche, coût serveur nul |
| Sandbox, comparaison, projets, embed | SPA (`ssr: false`) | IndexedDB, workers et iframe runtime : rien à rendre côté serveur |
| Runtime frame | Page statique minimale, hors React | Charge vite, ne partage rien avec l'app |

Le prérendu du hub dépend de l'index au moment du build : une mise à jour de l'index déclenche un rebuild (voir
[hosting.md](../guides/hosting.md)). Côté client, le hub recharge l'index pour afficher la santé à jour.

## 5. Routes

| Route | Feature | Rendu | En-têtes d'isolation |
|---|---|---|---|
| `/` | `hub/home.page.tsx` | prérendu | non |
| `/templates` (facettes en search params) | `hub/templates.page.tsx` | prérendu + client | non |
| `/t/$templateId` | `hub/template.page.tsx` | prérendu | non |
| `/play/new?template=…` | `play/new-project.page.tsx` | SPA | oui |
| `/play/$projectId` | `play/project.page.tsx` | SPA | oui |
| `/compare?left=…&right=…` | `compare/compare.page.tsx` | SPA | oui |
| `/projects` | `projects/projects.page.tsx` | SPA | non |
| `/s` (état dans le fragment `#…`) | `share/open-shared.page.tsx` | SPA | oui |
| `/embed/$templateId` | `embed/embed.page.tsx` | SPA | non ([0016](../decisions/0016-isolation-and-embed.md)) |
| `/auth/github/callback` | `github/callback.page.tsx` | SPA | non |
| `/api/github/token` | server route | — | — |
| `/runtime/frame.html` (origine runtime) | hors router | statique | oui |

« En-têtes d'isolation » = `Cross-Origin-Opener-Policy` + `Cross-Origin-Embedder-Policy` (détail dans
[security.md](./security.md) et [hosting.md](../guides/hosting.md)). Les routes coquilles importent la page et ne font
rien d'autre.

## 6. Règles d'import

Vérifiées par `import/no-restricted-paths` (oxlint) ou, à défaut, par `scripts/check-import-rules.ts` en CI.

- `modules/*/ui/components/**` n'importe ni `core/atoms`, ni `core/ports`, ni `core/adapters`, ni `core/programs`.
- `modules/*/core/domain/**` n'importe rien d'autre que `effect` et `shared/core/domain`.
- `modules/*/core/programs/**` n'importe pas `core/adapters` : il ne connaît que les ports.
- `modules/*/core/**` n'importe ni React ni `ui/`.
- `features/**` ne contient aucun composant ; `routes/**` n'importe que des features.
- Un module importe un autre module uniquement via ses ports, ses atoms ou ses types de domaine, jamais ses adapters.
- Effect s'importe par module : `import * as Effect from 'effect/Effect'`.

## 7. Conventions

- Fichiers et dossiers en kebab-case avec suffixe de rôle ; composants React en PascalCase (fichier et export).
- TaggedError : `<Module><Contexte>Error` (`ProjectNotFoundError`, `GitHubTokenExchangeError`).
- Schemas : `<Entity>Schema`, type dérivé `<Entity>` sans suffixe.
- Constantes : objets `as const` + type dérivé ; jamais d'`enum`.
- Ports : interface `<Nom>Port` + tag du même nom. Adapters : `make<Nom><Techno>(deps)` + `<Nom><Techno>Layer`.
- Programs : `<action><Entité>Program` (`openProjectProgram`, `listProjectsProgram`).
- Presenter hooks : `use<Action><Module>` (`useOpenProject`).
- Commentaires : aucun par défaut, voir les règles globales.

## 8. Tests

TDD : E2E Playwright rouges, puis tests unitaires rouges couche par couche, puis implémentation.

| Cible | Outil | Dépendances |
|---|---|---|
| Schemas (`manifest`, domaines, messages runtime) | Vitest | aucune |
| Programs | Vitest + `Effect.runPromiseExit` | `<module>.test-layer.ts` (adapters en mémoire) |
| Adapters IndexedDB | Vitest | `fake-indexeddb` |
| Runtimes (`runtime-*`), workers, WASM | Vitest en mode navigateur (provider Playwright) | vrais workers, assets servis localement |
| `test-runner` | Vitest | suite de conformité : les mêmes fichiers de test donnent les mêmes `TestEvent` qu'avec le vrai Vitest + `@typika/vitest-reporter` |
| Atoms | Vitest | registre d'atoms de test + test layer |
| Presenter hooks | Vitest + Testing Library (`renderHook`) | registre d'atoms de test |
| Composants | Vitest + Testing Library | props uniquement |
| Parcours utilisateur | Playwright, `.test.e2e.ts` colocalisés dans `features/` | app buildée, templates de fixture locaux |
| Service Kotlin | Tests HTTP (Vitest) contre le conteneur | Docker |

Tests transverses obligatoires :

- **En-têtes** : un E2E vérifie les en-têtes de chaque route du §5 et que `self.crossOriginIsolated === true` dans la
  runtime frame. Il tourne contre le serveur de dev, l'image Docker (`docker compose up` en CI) et chaque déploiement
  de preview.
- **Isolation** : un E2E exécute un template de fixture qui tente de lire IndexedDB et `localStorage` de l'origine app
  et de faire un `fetch` externe ; tout doit échouer.
- **Templates de fixture** : `apps/web/e2e/fixtures/templates/` contient un template minimal par runtime ; pas de
  dépendance au registre réel dans la CI de l'app.

## 9. Outillage

- **Lint / format** : oxlint et oxfmt, config partagée dans `packages/config`.
- **Types** : `tsc --noEmit` par package via Turborepo.
- **CI (GitHub Actions)**, à chaque PR : `pnpm install --frozen-lockfile` → `turbo run lint format:check typecheck test
  build` → E2E Playwright → `docker build` + E2E en-têtes sur l'image.
- **Dépendances** : Renovate, lockfile obligatoire.
- **Publication** : `cli` et `test-runner` publiés sur npm avec provenance ; noms de paquets sous le
  scope `@typika` ([ADR 0014](../decisions/0014-name-typika.md)).
