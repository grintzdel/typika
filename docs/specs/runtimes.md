# Runtimes

Statut : spec · détaille le §7 de la [spec V1](./2026-10-08-typika-v1-design.md)

Un runtime exécute un projet dans le navigateur : il écrit les fichiers, lance une commande, exécute les tests et expose
éventuellement une preview. Trois runtimes sont prévus :

| `kind` | Langages | Palier | Jalon | Spike bloquant |
|---|---|---|---|---|
| `browser-js` | TS, JS | 1 | M1 | — |
| `go` | Go | 2 | M4 | [R7](../spikes.md) |
| `kotlin` | Kotlin (cible JS) | 3 | M6 | [R9](../spikes.md) (R8 levé : [ADR 0019](../decisions/0019-kotlin-runtime.md)) |

Le format des templates, le panneau tests et les exercices ne connaissent que le contrat décrit ici. Un runtime qui
échoue en spike est remplacé derrière ce contrat (plan de repli : runner serveur auto-hébergeable, V2) sans toucher aux
templates.

Le runtime `node` (WebContainers) est écarté de la V1 ([ADR 0017](../decisions/0017-node-runtime.md)).

## 1. Contrat

### 1.1 Port

`packages/runtime-core` expose le contrat. Il dépend d'`effect` et de `@typika/manifest` (types du manifeste,
`RuntimeKind`, validation des chemins).

```ts
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import type * as Scope from 'effect/Scope'
import type * as Stream from 'effect/Stream'

export interface RuntimePort {
  readonly kind: RuntimeKind
  readonly load: Stream.Stream<RuntimeLoadProgress, RuntimeAssetLoadError>
  readonly boot: (
    snapshot: ProjectSnapshot
  ) => Effect.Effect<RuntimeSession, RuntimeBootError | RuntimeAssetLoadError, Scope.Scope>
}

export interface RuntimeSession {
  readonly fs: RuntimeFs
  readonly run: (command: RunCommand) => Stream.Stream<ProcessOutput, RuntimeExecutionError>
  readonly test: (options: TestOptions) => Stream.Stream<TestEvent, RuntimeExecutionError>
  readonly preview: Effect.Effect<Option.Option<PreviewHandle>>
}

export interface RuntimeFs {
  readonly writeFile: (path: ProjectPath, content: FileContent) => Effect.Effect<void, RuntimeFsError>
  readonly deleteFile: (path: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly rename: (from: ProjectPath, to: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly sync: (snapshot: ProjectSnapshot) => Effect.Effect<void, RuntimeFsError>
}

export type RuntimeExecutionError =
  | RuntimeCompileError
  | RuntimeProcessError
  | RuntimeTimeoutError
  | KotlinCompilerRateLimitedError
  | KotlinCompilerUnavailableError

export class RuntimeRegistry extends Context.Service<
  RuntimeRegistry,
  {
    readonly get: (kind: RuntimeKind) => Effect.Effect<RuntimePort, RuntimeUnsupportedError | RuntimeAssetLoadError>
  }
>()('@typika/RuntimeRegistry') {}
```

Points de conception :

- **`boot` est scopé.** La session vit dans le `Scope` du projet ouvert. Fermer le scope (quitter la sandbox, changer de
  template, démonter l'embed) termine les workers, libère la mémoire WASM et coupe les processus. Aucun `dispose()`
  manuel.
- **`load` est séparé de `boot`.** Il télécharge les assets du runtime et émet la progression pour l'indicateur de
  chargement ([R3](../spikes.md)). `boot` l'appelle si nécessaire ; l'UI peut l'appeler en avance (préchargement au
  survol du bouton « Ouvrir dans la sandbox »).
- **`run` et `test` renvoient des `Stream`.** Interrompre le fiber consommateur interrompt le processus (§4).
- **`preview`** renvoie `Option.none()` pour les runtimes sans preview (`go`, `kotlin` en V1).
- **`RuntimeRegistry`** résout un `kind` en `RuntimePort` par import dynamique : le code d'un runtime n'est chargé que
  si un template de ce langage est ouvert. `makeRuntimeRegistry(loaders)` le construit à partir d'un import par `kind` ;
  un `kind` sans import donne `RuntimeUnsupportedError`, un import qui échoue donne `RuntimeAssetLoadError` et sera
  retenté au prochain appel. Un port chargé est gardé pour la durée de vie du registre.
- **`RuntimeExecutionError`** regroupe tout ce qui peut interrompre un `run` ou un `test`, watchdog et service Kotlin
  compris.

Ce contrat raffine le §7.4 de la spec V1 : `boot` renvoie une session qui porte `run`, `test`, `preview` et le système de
fichiers, plutôt que d'exposer ces opérations au niveau du port.

### 1.2 Types d'entrée

```ts
// RuntimeKind vient de @typika/manifest.

export const ProjectPathSchema = Schema.String.pipe(Schema.check(/* chemin relatif, §3.2 */), Schema.brand('ProjectPath'))
export type ProjectPath = typeof ProjectPathSchema.Type
export type FileContent = string | Uint8Array

export interface ProjectSnapshot {
  readonly files: ReadonlyMap<ProjectPath, FileContent>
  readonly manifest: Manifest
}

export interface RunCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly env?: Readonly<Record<string, string>>
}

export interface TestOptions {
  readonly files?: ReadonlyArray<ProjectPath>
  readonly namePattern?: string
}

export const ProcessOutputSchema = Schema.Union([
  Schema.TaggedStruct('Stdout', { chunk: Schema.String }),
  Schema.TaggedStruct('Stderr', { chunk: Schema.String }),
  Schema.TaggedStruct('Exit', { code: Schema.Int }),
])
export type ProcessOutput = typeof ProcessOutputSchema.Type

export interface PreviewHandle {
  readonly url: string
  readonly reload: Effect.Effect<void>
}
```

`RunCommand` vient de `[commands]` du manifeste ([manifest.md](./manifest.md)). Chaque runtime interprète la commande
dans son propre langage : `browser-js` attend un point d'entrée, `go` un package, `kotlin` une
fonction `main`.

## 2. Événements de test

Chaque runtime traduit la sortie de son outil natif vers ce schéma unique. Le panneau tests, les exercices, la CI de
santé du registre et le mode comparaison ne consomment que lui.

### 2.1 Schéma

Défini en Effect Schema dans `packages/runtime-core/src/domain/test-event.domain-model.ts`. Les champs facultatifs
sont des `Schema.optionalKey` : absents, jamais `undefined`, pour traverser `postMessage` et JSON sans perte.

```ts
export const TestLocationSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Int,
  column: Schema.optional(Schema.Int),
})

export const TestFailureSchema = Schema.Struct({
  message: Schema.String,
  expected: Schema.optional(Schema.String),
  actual: Schema.optional(Schema.String),
  stack: Schema.optional(Schema.String),
  location: Schema.optional(TestLocationSchema),
})

export const DiagnosticSchema = Schema.Struct({
  severity: Schema.Literal('error', 'warning'),
  message: Schema.String,
  location: Schema.optional(TestLocationSchema),
})

export const TestEventSchema = Schema.Union(
  Schema.TaggedStruct('RunStarted', { runId: Schema.String, startedAt: Schema.Number }),
  Schema.TaggedStruct('Diagnostics', { runId: Schema.String, diagnostics: Schema.Array(DiagnosticSchema) }),
  Schema.TaggedStruct('SuiteStarted', {
    runId: Schema.String,
    suiteId: Schema.String,
    parentId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
  }),
  Schema.TaggedStruct('TestPassed', {
    runId: Schema.String,
    testId: Schema.String,
    suiteId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
    durationMs: Schema.Number,
  }),
  Schema.TaggedStruct('TestFailed', {
    runId: Schema.String,
    testId: Schema.String,
    suiteId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
    durationMs: Schema.Number,
    failure: TestFailureSchema,
  }),
  Schema.TaggedStruct('TestSkipped', {
    runId: Schema.String,
    testId: Schema.String,
    suiteId: Schema.optional(Schema.String),
    name: Schema.String,
    file: Schema.String,
    reason: Schema.optional(Schema.Literal('skip', 'todo', 'filtered')),
  }),
  Schema.TaggedStruct('Output', {
    runId: Schema.String,
    testId: Schema.optional(Schema.String),
    stream: Schema.Literal('stdout', 'stderr'),
    chunk: Schema.String,
  }),
  Schema.TaggedStruct('SuiteFinished', { runId: Schema.String, suiteId: Schema.String }),
  Schema.TaggedStruct('RunFinished', {
    runId: Schema.String,
    status: Schema.Literal('passed', 'failed', 'errored'),
    passed: Schema.Int,
    failed: Schema.Int,
    skipped: Schema.Int,
    durationMs: Schema.Number,
  })
)
export type TestEvent = Schema.Schema.Type<typeof TestEventSchema>
```

### 2.2 Règles

- **Identifiant stable.** `testId = makeTestId(file, chemin des suites, nom)` et `suiteId = makeSuiteId(file, chemin
  des suites)` : FNV-1a 64 bits, 16 caractères hexadécimaux. On n'utilise pas `effect/Hash`, dont la valeur peut changer
  d'une version d'Effect à l'autre. Le même test garde le même id d'un run à
  l'autre et d'une session à l'autre : le panneau tests peut afficher « était rouge, maintenant vert », et un exercice
  peut suivre sa progression.
- **Ordre garanti** : `RunStarted` en premier, `RunFinished` en dernier, chaque `SuiteStarted` fermé par son
  `SuiteFinished`. Un runtime qui ne fournit pas de suites (Go) n'émet que des tests sans `suiteId`.
- **Erreur de compilation** : `Diagnostics` puis `RunFinished` avec `status: 'errored'`. Ce n'est pas un échec du
  `Stream` : l'utilisateur doit voir ses erreurs dans le panneau tests, pas un écran d'erreur.
- **Interruption** : le `Stream` est interrompu, aucun `RunFinished` n'est émis. Le consommateur affiche « interrompu ».
- **`RunFinished.status`** : `passed` si `failed === 0`, `failed` sinon, `errored` si le run n'a pas pu exécuter les
  tests (compilation, crash du worker, timeout global).
- **Conformité** : `checkTestEventSequence(events)` vérifie ces règles sur un run complet (ordre, `runId` unique,
  imbrication des suites, `testId` uniques, compteurs et `status` de `RunFinished`) et renvoie la liste des violations.
  Les tests de chaque runtime et la CI de santé du registre s'en servent.
- Un exercice est validé quand un `RunFinished` `passed` couvre tous les fichiers listés dans `failing` (voir
  [manifest.md](./manifest.md)).

### 2.3 Mapping des sorties natives

| Runtime | Source native | Traduction |
|---|---|---|
| `browser-js` | `@typika/test-runner` émet directement des `TestEvent` | Aucune |
| `go` | Format `test2json` (`go test -json`) : `Action` = `run` / `pass` / `fail` / `skip` / `output` | `run` → aucun événement, `pass` → `TestPassed`, `fail` → `TestFailed` (message = sorties `output` accumulées du test), `skip` → `TestSkipped`, `output` → `Output` ; sous-tests `TestX/sub` → `SuiteStarted` pour `TestX` |
| `kotlin` | Le compilateur enregistre chaque classe de test comme suite et chaque `@Test` comme test auprès de l'adaptateur de `kotlin.test` ; le harness du runtime fournit cet adaptateur (`describe` / `it`) | Par fichier de test : suite racine = package (aucune pour le package par défaut), puis une suite par classe ; test réussi → `TestPassed`, exception → `TestFailed` (§6.4), `@Ignore` sur un test ou une classe → `TestSkipped` |

Une ligne qui ne valide pas le schéma est transmise en `Output` `stderr` et logguée ; elle ne casse pas le run
(`decodeTestEventLine(runId, line)`).

## 3. Système de fichiers virtuel

### 3.1 Source de vérité

Le module `project` est la source de vérité : arborescence et contenus vivent dans IndexedDB, l'éditeur écrit dans le
projet, jamais dans le runtime. Le runtime reçoit une **copie** :

1. `boot(snapshot)` monte l'état complet.
2. Chaque modification du projet est relayée par `fs.writeFile` / `deleteFile` / `rename`.
3. `fs.sync(snapshot)` réaligne tout (après un reset, un import, ou si le runtime signale une désynchronisation).

Les fichiers produits par le runtime (artefacts de build, binaires compilés) ne remontent **jamais** dans le projet : ils
ne sont ni persistés, ni partagés, ni exportés.

### 3.2 Règles

- Chemins POSIX relatifs à la racine du projet, sans `..`, sans chemin absolu. Validés par le schema `ProjectPath`.
- Texte en UTF-8 ; binaire accepté (`Uint8Array`) dans la limite du §8.
- Les fichiers propres à Typika (`typika.toml`, `tour/`) sont présents dans le FS du runtime : un template peut les
  lire, il ne doit pas en dépendre.

### 3.3 Implémentation par runtime

| Runtime | FS cible |
|---|---|
| `browser-js` | `Map` en mémoire dans la session, qui applique les limites du §8 ; elle est transmise au worker de build à chaque build, et le plugin esbuild résout les imports dessus |
| `go` | FS en mémoire installé sous l'API `fs` qu'attend `wasm_exec.js` ; partagé par `compile`, `link` et le programme |
| `kotlin` | Aucun FS persistant : les sources sont envoyées au service de compilation à chaque `run` / `test` |

## 4. Cycle de vie et interruption

```
         load()            boot()
Idle ──────────▶ Loaded ──────────▶ Ready ◀──────────┐
  ▲                                   │ run() / test()│
  │                                   ▼               │
  │                                Busy ──────────────┘
  │                                   │ fin du Stream ou interruption
  └──────── fermeture du Scope ───────┘
```

- **Une seule exécution de premier plan par session.** Lancer `test` pendant un `run` interrompt le `run`.
- **Interruption dure.** Une boucle infinie dans du code utilisateur ne rend jamais la main : on ne compte pas sur une
  interruption coopérative. Interrompre le fiber appelle `worker.terminate()` ; la session recrée un worker propre au
  prochain `run` / `test`, à partir de son FS.
- **Watchdog.** Chaque `run` / `test` a un timeout (§8). Dépassé, la session interrompt et émet `RuntimeTimeoutError`.
- **Crash du worker** (erreur WASM, mémoire épuisée) : `RuntimeProcessError`, le worker est recréé au prochain appel.
- **Fermeture du scope** : `acquireRelease` termine tous les workers et révoque les URL de preview.

## 5. Chargement paresseux et cache

- **Code** : chaque `runtime-*` est un chunk séparé, chargé par `RuntimeRegistry` à la première ouverture d'un template
  de ce `kind`.
- **Assets** (fichiers `.wasm`, bundle du test runner, harness) : servis par l'origine runtime, depuis l'image de l'app
  ([0027](../decisions/0027-go-assets-delivery.md)). Chaque asset est versionné dans son URL et listé dans un manifeste
  d'assets avec sa taille et son SHA-256, vérifié après le téléchargement. Un CDN (`TYPIKA_ASSETS_BASE_URL`) reste
  possible : le runtime reçoit une URL de base.
- **Cache** : le chargeur du runtime met ses assets en Cache Storage, dans un cache nommé d'après la clé des assets, et
  supprime les caches des autres clés. URL versionnées ⇒ cache immuable, pas d'invalidation à gérer. Pas de Service
  Worker pour ces assets ([0027](../decisions/0027-go-assets-delivery.md)).
- **Progression** : `load` émet `RuntimeLoadProgress` (`{ asset, loadedBytes, totalBytes }`) ; l'UI affiche la taille à
  télécharger avant le premier chargement d'un runtime lourd.
- **Préchargement** : au survol de « Ouvrir dans la sandbox », au plus un runtime à la fois.

## 6. Runtimes

### 6.1 `browser-js`

Runtime par défaut pour TS et JS. Couvre les templates d'architecture, SOLID et design patterns, qui sont de la logique
pure.

**Pipeline**

1. Un worker de build, créé au `boot` et gardé pour la session, exécute **esbuild-wasm** à partir du module WASM compilé
   par `load`. Un plugin résout les imports relatifs sur le FS virtuel (extension absente, `index`, `.js` qui désigne un
   `.ts`) et les imports de paquets vers un CDN ESM, en versions lues dans le `package.json` du projet. Le
   `tsconfig.json` du projet est passé à esbuild : `verbatimModuleSyntax` y garde les imports inutilisés, comme `tsc`.
2. Le bundle est exécuté dans un **worker d'exécution** dédié, recréé à chaque `run` / `test`, qui importe le code par
   une URL `blob:`. `console.*` est capturé et émis en `Stdout` / `Stderr`.
3. Pour `test`, la session sélectionne les fichiers selon `[tests]` (ou `TestOptions.files`) et produit **un bundle par
   fichier de test** : chaque fichier a ses propres modules, comme l'isolation par défaut de Vitest. Le worker
   d'exécution embarque `@typika/test-runner` ; dans les bundles, `vitest` est un module qui relit l'API du runner sur
   le global du worker. Le runner émet directement des `TestEvent`.
4. Preview : si le template a un `index.html`, le bundle est servi dans une iframe de preview sur l'origine runtime par
   le Service Worker. Pas de DOM dans les workers : un template qui a besoin du DOM passe par la preview. Pas encore
   implémenté : `preview` renvoie `Option.none()` tant qu'aucun template du catalogue n'en a besoin.

**`run`**

- `RunCommand.command` est le chemin du fichier à exécuter ; `args` et `env` sont ignorés en V1.
- Comme Node, le programme se termine quand il n'a plus de timer en attente (`setTimeout`, `setInterval` non annulé) :
  `Exit` `0`. Une erreur non rattrapée, au chargement ou plus tard, est écrite sur `Stderr` et donne `Exit` `1`.
- Une erreur de build donne `RuntimeCompileError`. Pour `test`, elle donne `Diagnostics` puis `RunFinished` `errored`.
- Le watchdog couvre le build et l'exécution.

**Compatibilité Vitest**

Les templates importent depuis `vitest`. Dans la sandbox, `vitest` est aliasé vers `@typika/test-runner`. Hors de la
sandbox (après `typika create`), le même code tourne avec le vrai Vitest. Un template ne doit utiliser que l'API
supportée ci-dessous ; la CI du registre exécute les tests dans les deux environnements pour le garantir.

| Supporté en V1 | Non supporté en V1 |
|---|---|
| `describe`, `it` / `test`, `.skip`, `.only`, `.todo`, `.each`, `.skipIf`, `.runIf` | Snapshots (`toMatchSnapshot`, inline) |
| `beforeAll`, `afterAll`, `beforeEach`, `afterEach` | `vi.mock` (mock de module) |
| `expect` : `toBe`, `toEqual`, `toStrictEqual`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeNaN`, `toBeTypeOf`, `toBeInstanceOf`, `toContain`, `toContainEqual`, `toHaveLength`, `toHaveProperty`, `toMatch`, `toMatchObject`, `toThrow`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toBeCloseTo`, `.not`, `.resolves`, `.rejects` | Couverture de code |
| `expect.any`, `anything`, `objectContaining`, `arrayContaining`, `stringContaining`, `stringMatching` | `expect.extend`, `expect.soft`, `expect.assertions` |
| `vi.fn`, `vi.spyOn`, `toHaveBeenCalled*`, `toHaveReturned(With)` | Environnements DOM (`jsdom`, `happy-dom`) |
| `vi.useFakeTimers` (minimal : `advanceTimersByTime`, `runAllTimers`, `runOnlyPendingTimers`, `setSystemTime`, `Date`) | Configuration `vitest.config.*` (ignorée) |
| Timeout par test (`it(name, fn, ms)`) | Exécution parallèle de fichiers |

**Conformité et traduction**

`@typika/test-runner` est vérifié contre le vrai Vitest : les fixtures de `packages/test-runner/conformance/` passent
dans les deux, `@typika/vitest-reporter` traduit la sortie de Vitest en `TestEvent`, et les deux suites d'événements
doivent être identiques (identifiants, ordre, statuts, première ligne des messages d'échec, sorties console des tests).
Les tests TS des templates du dépôt tournent aussi dans le runner et doivent être verts.

Là où Vitest n'a pas d'équivalent dans le schéma, la traduction est fixée ainsi, des deux côtés :

| Situation | Vitest | `TestEvent` |
|---|---|---|
| `beforeAll` en échec | Suite en échec, tests non exécutés | `TestFailed` pour chaque test, avec l'erreur du hook et `durationMs: 0` |
| `afterAll` en échec | Suite en échec, tests passés | `Diagnostics` avant `SuiteFinished`, `RunFinished` `errored` |
| Erreur au chargement du fichier ou dans le corps d'un `describe` | Module en échec, aucun test | `Diagnostics`, aucun test, `RunFinished` `errored` |
| Test écarté par un `.only` | Mode `skip` | `TestSkipped` `skip` |
| Test écarté par `TestOptions.namePattern` | — | `TestSkipped` `filtered` |
| Valeur lancée qui n'est pas une `Error` | Message absent | `message` = la chaîne lancée, ou `Thrown value: <JSON>` |
| `console.*` dans un `beforeAll` / `afterAll` | Rattaché à la suite | `Output` sans `testId` (hors conformité) |

**Dépendances npm**

Résolues depuis un CDN ESM par un gabarit d'URL (`{name}`, `{version}`, `{path}`) ; par défaut jsDelivr,
`https://cdn.jsdelivr.net/npm/{name}@{version}{path}/+esm`, déjà utilisé pour les assets. Un paquet absent du
`package.json` est une erreur de build ; la version est celle du `package.json`, telle quelle.

Un module importé par un worker est chargé en CORS, donc compatible avec COEP `require-corp` si le CDN répond
`Access-Control-Allow-Origin`. Vérifié au M1 (2026-10-09) : jsDelivr (`+esm`) envoie `Access-Control-Allow-Origin: *` et
`Cross-Origin-Resource-Policy: cross-origin` ; esm.sh envoie `Access-Control-Allow-Origin: *` et peut remplacer jsDelivr
par le gabarit `https://esm.sh/{name}@{version}{path}`. Les imports `node:*` et les modules intégrés de Node (`fs`,
`path`…) sont refusés au build ; les paquets qui en dépendent ne sont pas supportés en V1.

**Poids** (mesuré le 2026-10-09, esbuild minifié) : `esbuild.wasm` 13,3 Mio (3,6 Mio en gzip, 2,6 Mio en brotli) ; worker
d'exécution avec le test runner 32 Kio (11 Kio en gzip), dont 30 Kio (10 Kio en gzip) pour le runner ; worker de build
4,5 Kio hors esbuild-wasm.

### 6.2 `node` — hors V1

Écarté par le spike [R1](../spikes.md) ([ADR 0017](../decisions/0017-node-runtime.md)) : WebContainers et Nodebox
exigent une licence commerciale pour une partie des instances et dépendent des serveurs de leur éditeur. Aucun
template du catalogue n'en a besoin. Les templates qui exigent un serveur HTTP ou `npm install` attendent le runner
auto-hébergeable (V2).

### 6.3 `go`

**Toolchain Go officielle compilée en WASM** ([ADR 0018](../decisions/0018-go-runtime.md)) : `compile.wasm`,
`link.wasm` et une stdlib précompilée pour `GOOS=js GOARCH=wasm`, dans le worker d'exécution, sur un FS en mémoire.

- **Pilote** : le runtime fait le travail de la commande `go`. Il lit `go.mod`, ordonne les packages du module selon
  leurs imports, écrit l'`importcfg`, compile chaque package (`-p`, `-complete`, `-pack`), puis linke.
- `run` compile le package `main` qui contient `[commands].start` et exécute le binaire produit.
- `test` compile le package testé avec ses tests internes, le package `_test` externe s'il existe, puis un
  `_testmain.go` généré. Celui-ci liste les `TestXxx` découverts et fournit sa propre implémentation de `testDeps`, pour
  ne pas tirer `testing/internal/testdeps`. Le binaire tourne avec `-test.v=test2json` ; le pilote convertit la sortie
  au format `test2json`, puis le mapping du §2.3 s'applique.
- **Commande `test`** : `go test` teste chaque package du module qui a des fichiers de test, comme `go test ./...` hors
  de Typika. `TestOptions.files` restreint aux packages de ces fichiers. `TestOptions.namePattern` devient `-test.run`,
  mais chaque niveau du motif est cherché comme sous-chaîne du nom : `regexp` n'est pas dans la stdlib embarquée. Les
  exemples, benchmarks et cibles de fuzzing ne sont pas lancés, et `go vet` ne passe pas avant les tests.
- **Cache** : archives compilées en mémoire, par hash des sources et des archives dont elles dépendent ; seul ce qui a
  changé est recompilé. Un package que les tests d'un autre recompilent (fichiers `_test.go` internes) change de hash,
  et ceux qui l'importent sont recompilés contre lui, comme le fait `go test`.
- **Assets** : versionnés par version de Go, avec la licence BSD de Go. `pnpm --filter @typika/runtime-go build:assets`
  les reconstruit avec le Go local, qui doit être la version épinglée : `compile.wasm`, `link.wasm`, `std.pack` (les
  archives de la stdlib bout à bout, derrière un index JSON), `LICENSE` et `manifest.json` (taille, taille en brotli et
  SHA-256 de chaque fichier). 11,9 Mo en brotli avec Go 1.24.5.
- **Stdlib** : un jeu fermé, défini par ses racines dans `std-roots.constant.ts` et complété par leurs dépendances (76
  packages avec Go 1.24.5). Un template n'importe que ces packages, hors `internal/` ; un autre import est une erreur de
  compilation au run, et `E_GO_IMPORT_UNAVAILABLE` dans `template-check` et au registre.
- **Dans le navigateur** : `@typika/runtime-go/browser` charge les assets (Cache Storage, progression par asset), puis
  fait tourner le pilote dans un worker gardé pour la session, avec son cache d'archives. `run` et `test` envoient au
  worker l'état complet du FS. Une interruption ou le watchdog termine le worker, et le prochain appel en recrée un.
  Le serveur sert les `.br` précompressés par `build:assets` avec `Content-Encoding: br`.
- **Hors navigateur** : `@typika/runtime-go/node` charge les assets depuis le disque et fait tourner le même pilote dans
  Node. `template-check` s'en sert pour les exercices Go. La suite de `conformance/` compare ses résultats à ceux de
  `go test` natif sur des fixtures et sur `strategy-go`.
- **Isolation** : aucune exigence. Pas de `SharedArrayBuffer`, le runtime tourne aussi en embed.
- Erreurs de compilation : `fichier:ligne:colonne: message`, chemins relatifs à la racine du projet après retrait du
  préfixe du FS.
- Pas de preview en V1 (pas de serveur `net/http` dans le navigateur).
- Contrainte templates : bibliothèque standard du jeu précompilé uniquement ; pas de `cgo`, de `go:embed` ni
  d'`os/exec`.

### 6.4 `kotlin`

Le compilateur Kotlin est un programme JVM ; aucune version officielle ne tourne dans le navigateur. Le code est
**compilé par un service, exécuté dans le navigateur**.

**Chaîne**

```
Projet (app) ──POST /compile──▶ kotlin-compiler (service) ──▶ module JS
     │                                                          │
     └──────────── artefact transmis à la session ◀─────────────┘
                              │
                     worker d'exécution (origine runtime)
```

- L'appel au service part de l'**app**, pas de l'origine runtime (voir [security.md](./security.md) : l'origine runtime
  n'a pas d'accès réseau sortant). La session Kotlin de la frame demande chaque compilation à l'app par le même
  `MessagePort` (`CompileKotlin`, réponse `KotlinCompiled` ou `KotlinCompileFailed`) ; l'app compile avec son cache et
  renvoie la compilation. Elle appelle `/api/kotlin/compile` sur sa propre origine, que son serveur relaie vers le
  service avec un rate limiting par IP ([0029](../decisions/0029-kotlin-relay-rate-limit.md)).
- Le service est maison ([ADR 0019](../decisions/0019-kotlin-runtime.md)) : un serveur HTTP minimal autour de
  `kotlin-compiler-embeddable`, avec la stdlib et `kotlin.test` de la même version comme seules bibliothèques. Il ne
  fait que compiler ; aucun endpoint n'exécute de code.
- Compilation en deux phases : sources vers klib, puis klib vers un module ES avec DCE et source map. En mode `test`,
  sources et tests sont compilés ensemble et `main` n'est pas appelé.
- **Cible : JS.** Le harness sait exécuter Wasm, mais Wasm n'apporte rien en V1 (artefact trois fois plus lourd, pas de
  position d'échec). La cible est un choix du runtime, pas du template.
- `run` importe le module produit : `main` s'exécute au chargement, `println` est capturé en `Stdout`.
- `test` installe l'adaptateur `kotlin.test` du harness (`describe`, `it`, `xit`), importe le module, puis exécute les
  tests enregistrés et émet les `TestEvent` (§2.3). Le fichier d'une classe de test vient des sources : sa déclaration
  `package` et ses classes de premier niveau. Les tests passent dans l'ordre d'enregistrement, fichier par fichier ;
  `TestOptions.files` restreint aux tests de ces fichiers, `TestOptions.namePattern` suit la règle de `browser-js`
  (expression régulière sur « suites nom », sinon sous-chaîne ; un test écarté est `TestSkipped` `filtered`).
- **Échecs.** Le message est celui de l'exception ; une exception autre qu'une `AssertionError` est préfixée de son
  nom simple (`IllegalStateException: cannot divide 1 by zero`), comme dans le rapport de `gradle test`. `expected` et
  `actual` sont tirés de la forme `Expected <…>, actual <…>.`. La pile est ramenée par la source map aux fichiers du
  projet ; `location` est la première frame dans le fichier du test, sinon la première frame du projet.
- **Messages** : ceux de l'asserter de `kotlin.test`. Sur la JVM, `kotlin-test-junit5` confie `assertEquals`,
  `assertNotEquals`, `assertNull` et `assertNotNull` à JUnit 5, qui les formule autrement (`expected: <1> but was:
  <2>` pour `Expected <1>, actual <2>.`) ; les autres assertions et `fail` donnent le même texte. Un message qui nomme
  un type diffère aussi : la JVM écrit `java.lang.String`, JS `String`.
- **Dans le navigateur** : `@typika/runtime-kotlin/browser`. La session reçoit un compilateur (celui de l'app, par la
  frame), puis exécute l'artefact
  dans un worker neuf par `run` ou `test`, importé depuis une URL `blob:`. Le worker est terminé à la fin, à
  l'interruption ou au watchdog : pas d'état d'une exécution à l'autre. `load` n'a rien à télécharger.
- **Hors navigateur** : `@typika/runtime-kotlin/node` exécute l'artefact dans un contexte `node:vm` sans `process`,
  pour que `println` passe par la console du harness comme dans le navigateur. `template-check` s'en sert pour les
  exercices Kotlin quand `KOTLIN_COMPILER_URL` désigne un service. La suite de `conformance/` compare ses résultats
  à ceux de `gradle test` (statut, message après la correspondance JUnit 5 ci-dessus, `fichier:ligne` de la frame du
  test), et la sortie de `main` à celle de `gradle run`, sur des fixtures et sur `strategy-kotlin`.
- **Isolation** : aucune exigence. Pas de `SharedArrayBuffer`, le runtime tourne aussi en embed.
- Contrainte templates : pas d'API spécifique JVM (`java.*`), stdlib et `kotlin.test` uniquement.

**Protocole**

Un contrat propre à Typika, implémenté directement par le service. Le client ne dépend que de ce contrat : changer de
compilateur ou ajouter la cible Wasm ne le touche pas.

```http
POST /compile
Content-Type: application/json

{
  "protocol": 1,
  "target": "js",
  "kotlinVersion": "2.4",
  "mode": "test",
  "files": [{ "path": "src/main/kotlin/Order.kt", "content": "..." }]
}
```

| Réponse | Corps | Effet côté client |
|---|---|---|
| `200` | `{ "ok": true, "artifact": { "kind": "js", "code": "...", "sourceMap": "..." }, "diagnostics": [...] }` | Exécution ; les warnings vont en `Diagnostics` |
| `200` | `{ "ok": false, "diagnostics": [...] }` | `Diagnostics` puis `RunFinished` `errored` (ou `RuntimeCompileError` pour `run`) |
| `400` | `{ "error": "..." }` | Requête refusée (protocole, cible, version de Kotlin, chemin) : bug du client, `KotlinCompilerUnavailableError` |
| `413` | `{ "error": "..." }` | Diagnostic « projet trop gros » : `RuntimeCompileError` pour `run`, run `errored` pour `test` |
| `429` | `Retry-After` | `KotlinCompilerRateLimitedError { retryAfterSeconds }` |
| `503` | `{ "error": "..." }`, `Retry-After` si la file est pleine | File pleine, ou processus de compilation mort et relancé : `KotlinCompilerUnavailableError` |
| `504` | `{ "error": "..." }` | Compilation interrompue au timeout du service : `KotlinCompilerUnavailableError` |
| réseau | — | `KotlinCompilerUnavailableError` |

`mode: "test"` compile les tests avec les sources et n'appelle pas `main` ; le harness reste côté navigateur. Les
diagnostics suivent `DiagnosticSchema`, chemins relatifs à la racine du projet. Le service n'accepte que des fichiers
`.kt` aux chemins relatifs, 500 au plus, et la version de Kotlin qu'il embarque (`GET /health` la donne). Le code de
l'artefact ne contient pas de commentaire `sourceMappingURL` : la source map arrive à côté.

**Cache de compilation**

- Clé : `sha256(protocol + target + kotlinVersion + mode + fichiers triés par chemin)`.
- **Cache client** : IndexedDB, LRU borné (§8), sur l'origine de l'app. Relancer les tests sans modification, même
  après un rechargement, ne rappelle pas le service.
  Le client de compilation prend un `CompileCache` : IndexedDB dans l'app, aucun par défaut hors navigateur. Un échec
  de compilation est mis en cache comme un succès ; un projet trop gros, un `429` ou une erreur du service ne le sont
  pas.
- **Artefacts précompilés** : la CI du registre (`registry-tools build`) compile chaque template Kotlin, sans son
  dossier `exercises/`, en modes `test` et `run`. Elle écrit chaque compilation sous sa clé de cache dans
  `artifacts/kotlin/<clé>.json` du registre, publié à côté de l'index. L'app les lit à cette adresse, relative à
  `TYPIKA_REGISTRY_INDEX_URL`, derrière son cache IndexedDB et en lecture seule : un artefact absent ou illisible
  compte comme absent du cache. Ouvrir un template et lancer ses tests ne coûte aucun appel au service tant que
  l'utilisateur n'a rien modifié : une modification change la clé. La CI compile de même l'état de départ de chaque
  exercice, dans les deux modes ([0030](../decisions/0030-kotlin-exercise-artifacts.md)).
- **Cache serveur** : facultatif, en mémoire uniquement (LRU), perdu au redémarrage. Le service reste sans stockage.
- Compilation **à la demande** (`run` / `test`), jamais à la frappe. Les diagnostics de l'éditeur Kotlin viennent du
  dernier `run` / `test`, pas d'un language server (hors V1).

**Désactivation** : si `KOTLIN_COMPILER_URL` n'est pas configuré, la config publique n'a pas de `kotlinCompilerUrl`,
`RuntimeRegistry.get('kotlin')` échoue avec `RuntimeUnsupportedError` et la sandbox l'explique sans proposer de
réessayer. Le hub est prérendu au build, avant de connaître la config : il masque les templates, variantes et
facettes Kotlin une fois hydraté.

## 7. Erreurs

Toutes en `Data.TaggedError`, dans `packages/runtime-core/src/domain/errors/`.

| Erreur | Champs | Cause typique | Affichage |
|---|---|---|---|
| `RuntimeUnsupportedError` | `kind` | Runtime désactivé (Kotlin sans service) ou inconnu | Template masqué ; message si ouvert par lien |
| `RuntimeAssetLoadError` | `asset`, `cause` | Réseau, CDN, échec SRI, chunk du runtime introuvable | Bandeau avec « Réessayer » |
| `RuntimeBootError` | `kind`, `cause` | Échec d'initialisation (WASM, worker) | Écran d'erreur de la sandbox |
| `RuntimeFsError` | `path`, `reason` | Chemin invalide, limite dépassée | Toast, fichier non écrit |
| `RuntimeCompileError` | `diagnostics` | Erreur de build / compilation sur `run` | Console + soulignement dans l'éditeur |
| `RuntimeProcessError` | `cause` | Crash du worker, mémoire épuisée | Console, worker recréé |
| `RuntimeTimeoutError` | `limitMs` | Watchdog dépassé | Console : « interrompu après N s » |
| `KotlinCompilerRateLimitedError` | `retryAfterSeconds` | `429` | Toast avec délai |
| `KotlinCompilerUnavailableError` | `cause` | Service injoignable | Toast, retry manuel |

Une erreur de test (assertion qui échoue) n'est **jamais** une erreur Effect : c'est un `TestFailed`.

## 8. Limites

Valeurs initiales, centralisées dans `RuntimeLimit` (`packages/runtime-core/src/domain/constants/runtime-limits.constant.ts`),
à ajuster après les spikes.

| Limite | Valeur initiale | Appliquée par |
|---|---|---|
| Fichiers par projet | 500 | `project` + `RuntimeFs` |
| Taille totale du projet | 10 Mio | `project` + `RuntimeFs` |
| Taille d'un fichier | 1 Mio | `project` |
| Timeout `test` (run complet) | 30 s | Watchdog de session |
| Timeout par test | 5 s (surchargeable par test) | Test runner |
| Timeout `run` | 30 s | Watchdog de session |
| Mémoire WASM (`go`) | 512 Mio max par instance | `WebAssembly.Memory` `maximum` |
| Sortie console conservée | 1 Mio par run (tampon circulaire) | UI |
| Requête de compilation Kotlin | 256 Kio de sources | Client + service |
| Timeout de compilation Kotlin | 15 s service, 20 s client | Service + client |
| Cache de compilation client | 50 Mio, LRU | Adapter IndexedDB |

La mémoire d'un worker JavaScript ne se plafonne pas de façon fiable : on se protège par le watchdog et par la recréation
du worker en cas de crash, pas par un quota.
