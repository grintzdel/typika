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

`packages/runtime-core` expose le contrat. Il dépend uniquement d'`effect`.

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
  readonly run: (command: RunCommand) => Stream.Stream<ProcessOutput, RuntimeCompileError | RuntimeProcessError>
  readonly test: (options: TestOptions) => Stream.Stream<TestEvent, RuntimeCompileError | RuntimeProcessError>
  readonly preview: Effect.Effect<Option.Option<PreviewHandle>>
}

export interface RuntimeFs {
  readonly writeFile: (path: ProjectPath, content: FileContent) => Effect.Effect<void, RuntimeFsError>
  readonly deleteFile: (path: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly rename: (from: ProjectPath, to: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly sync: (snapshot: ProjectSnapshot) => Effect.Effect<void, RuntimeFsError>
}

export class RuntimeRegistry extends Context.Tag('@typika/RuntimeRegistry')<
  RuntimeRegistry,
  { readonly get: (kind: RuntimeKind) => Effect.Effect<RuntimePort, RuntimeUnsupportedError> }
>() {}
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
  si un template de ce langage est ouvert.

Ce contrat raffine le §7.4 de la spec V1 : `boot` renvoie une session qui porte `run`, `test`, `preview` et le système de
fichiers, plutôt que d'exposer ces opérations au niveau du port.

### 1.2 Types d'entrée

```ts
export const RuntimeKind = {
  BROWSER_JS: 'browser-js',
  GO: 'go',
  KOTLIN: 'kotlin',
} as const
export type RuntimeKind = (typeof RuntimeKind)[keyof typeof RuntimeKind]

export type ProjectPath = string & Brand.Brand<'ProjectPath'>
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

export type ProcessOutput =
  | { readonly _tag: 'Stdout'; readonly chunk: string }
  | { readonly _tag: 'Stderr'; readonly chunk: string }
  | { readonly _tag: 'Exit'; readonly code: number }

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

Défini en Effect Schema dans `packages/runtime-core/src/test-event.domain-model.ts`.

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

- **Identifiant stable.** `testId = hash(file + chemin des suites + nom)`. Le même test garde le même id d'un run à
  l'autre et d'une session à l'autre : le panneau tests peut afficher « était rouge, maintenant vert », et un exercice
  peut suivre sa progression.
- **Ordre garanti** : `RunStarted` en premier, `RunFinished` en dernier, chaque `SuiteStarted` fermé par son
  `SuiteFinished`. Un runtime qui ne fournit pas de suites (Go) n'émet que des tests sans `suiteId`.
- **Erreur de compilation** : `Diagnostics` puis `RunFinished` avec `status: 'errored'`. Ce n'est pas un échec du
  `Stream` : l'utilisateur doit voir ses erreurs dans le panneau tests, pas un écran d'erreur.
- **Interruption** : le `Stream` est interrompu, aucun `RunFinished` n'est émis. Le consommateur affiche « interrompu ».
- **`RunFinished.status`** : `passed` si `failed === 0`, `failed` sinon, `errored` si le run n'a pas pu exécuter les
  tests (compilation, crash du worker, timeout global).
- Un exercice est validé quand un `RunFinished` `passed` couvre tous les fichiers listés dans `failing` (voir
  [manifest.md](./manifest.md)).

### 2.3 Mapping des sorties natives

| Runtime | Source native | Traduction |
|---|---|---|
| `browser-js` | `@typika/test-runner` émet directement des `TestEvent` | Aucune |
| `go` | Format `test2json` (`go test -json`) : `Action` = `run` / `pass` / `fail` / `skip` / `output` | `run` → aucun événement, `pass` → `TestPassed`, `fail` → `TestFailed` (message = sorties `output` accumulées du test), `skip` → `TestSkipped`, `output` → `Output` ; sous-tests `TestX/sub` → `SuiteStarted` pour `TestX` |
| `kotlin` | Le compilateur enregistre chaque classe de test comme suite et chaque `@Test` comme test auprès de l'adaptateur de `kotlin.test` ; le harness du runtime fournit cet adaptateur (`describe` / `it`) | Suite racine = package, puis une suite par classe ; test réussi → `TestPassed`, exception → `TestFailed` (message de l'`AssertionError`, `location` tirée de la source map), `@Ignore` → `TestSkipped` |

Une ligne qui ne valide pas le schéma est transmise en `Output` `stderr` et logguée ; elle ne casse pas le run.

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
| `browser-js` | `Map` en mémoire dans le worker de build ; le plugin esbuild résout les imports dessus |
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
- **Assets** (fichiers `.wasm`, bundle du test runner, harness) : servis depuis `TYPIKA_ASSETS_BASE_URL` (CDN par
  défaut, auto-hébergeable — voir [hosting.md](../guides/hosting.md)). Chaque asset est versionné dans son URL et listé
  dans un manifeste d'assets avec son hash SRI.
- **Cache** : un Service Worker sur l'origine runtime met les assets en Cache Storage. URL versionnées ⇒ cache
  immuable, pas d'invalidation à gérer.
- **Progression** : `load` émet `RuntimeLoadProgress` (`{ asset, loadedBytes, totalBytes }`) ; l'UI affiche la taille à
  télécharger avant le premier chargement d'un runtime lourd.
- **Préchargement** : au survol de « Ouvrir dans la sandbox », au plus un runtime à la fois.

## 6. Runtimes

### 6.1 `browser-js`

Runtime par défaut pour TS et JS. Couvre les templates d'architecture, SOLID et design patterns, qui sont de la logique
pure.

**Pipeline**

1. Un worker de build exécute **esbuild-wasm**. Un plugin résout les imports relatifs sur le FS virtuel et les imports de
   paquets vers un CDN ESM, en versions épinglées depuis le `package.json` du template.
2. Le bundle est exécuté dans un **worker d'exécution** dédié, recréé à chaque `run` / `test`. `console.*` est capturé
   et émis en `Stdout` / `Stderr`.
3. Pour `test`, le bundle inclut `@typika/test-runner`, qui découvre les fichiers `*.test.ts` / `*.test.js` (ou ceux de
   `TestOptions.files`) et émet directement des `TestEvent`.
4. Preview : si le template a un `index.html`, le bundle est servi dans une iframe de preview sur l'origine runtime par
   le Service Worker. Pas de DOM dans les workers : un template qui a besoin du DOM passe par la preview.

**Compatibilité Vitest**

Les templates importent depuis `vitest`. Dans la sandbox, `vitest` est aliasé vers `@typika/test-runner`. Hors de la
sandbox (après `typika create`), le même code tourne avec le vrai Vitest. Un template ne doit utiliser que l'API
supportée ci-dessous ; la CI du registre exécute les tests dans les deux environnements pour le garantir.

| Supporté en V1 | Non supporté en V1 |
|---|---|
| `describe`, `it` / `test`, `.skip`, `.only`, `.todo`, `.each` | Snapshots (`toMatchSnapshot`, inline) |
| `beforeAll`, `afterAll`, `beforeEach`, `afterEach` | `vi.mock` (mock de module) |
| `expect` : `toBe`, `toEqual`, `toStrictEqual`, `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeInstanceOf`, `toContain`, `toContainEqual`, `toHaveLength`, `toHaveProperty`, `toMatch`, `toMatchObject`, `toThrow`, `toBeGreaterThan(OrEqual)`, `toBeLessThan(OrEqual)`, `toBeCloseTo`, `.not`, `.resolves`, `.rejects` | Couverture de code |
| `vi.fn`, `vi.spyOn`, `toHaveBeenCalled*` | Environnements DOM (`jsdom`, `happy-dom`) |
| `vi.useFakeTimers` (minimal : `advanceTimersByTime`, `runAllTimers`) | Configuration `vitest.config.*` (ignorée) |
| Timeout par test (`it(name, fn, ms)`) | Exécution parallèle de fichiers |

**Dépendances npm**

Résolues depuis un CDN ESM. Le CDN doit renvoyer des en-têtes compatibles COEP (`Cross-Origin-Resource-Policy` ou CORS) :
à vérifier pour chaque CDN candidat pendant M1. Les paquets qui dépendent d'API Node (`fs`, `net`, `child_process`)
ne sont pas supportés en V1.

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
- **Cache** : archives compilées en mémoire, par hash des sources et de l'`importcfg` ; seul ce qui a changé est
  recompilé.
- **Assets** : versionnés par version de Go, avec la licence BSD de Go. La stdlib est un jeu fermé (76 packages à
  l'ADR 0018), étendu à la demande ; la CI du registre refuse un import hors du jeu.
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
  n'a pas d'accès réseau sortant).
- Le service est maison ([ADR 0019](../decisions/0019-kotlin-runtime.md)) : un serveur HTTP minimal autour de
  `kotlin-compiler-embeddable`, avec la stdlib et `kotlin.test` de la même version comme seules bibliothèques. Il ne
  fait que compiler ; aucun endpoint n'exécute de code.
- Compilation en deux phases : sources vers klib, puis klib vers un module ES avec DCE et source map. En mode `test`,
  sources et tests sont compilés ensemble et `main` n'est pas appelé.
- **Cible : JS.** Le harness sait exécuter Wasm, mais Wasm n'apporte rien en V1 (artefact trois fois plus lourd, pas de
  position d'échec). La cible est un choix du runtime, pas du template.
- `run` importe le module produit : `main` s'exécute au chargement, `println` est capturé en `Stdout`.
- `test` installe l'adaptateur `kotlin.test` du harness (`describe`, `it`, `xit`), importe le module, puis exécute les
  tests enregistrés et émet les `TestEvent` (§2.3).
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
| `413` | — | `RuntimeCompileError` « projet trop gros » |
| `429` | `Retry-After` | `KotlinCompilerRateLimitedError { retryAfterSeconds }` |
| `503` / `504` / réseau | — | `KotlinCompilerUnavailableError` |

`mode: "test"` compile les tests avec les sources et n'appelle pas `main` ; le harness reste côté navigateur. Les
diagnostics suivent `DiagnosticSchema`, chemins relatifs à la racine du projet.

**Cache de compilation**

- Clé : `sha256(protocol + target + kotlinVersion + mode + fichiers triés par chemin)`.
- **Cache client** : IndexedDB, LRU borné (§8). Relancer les tests sans modification ne rappelle pas le service.
- **Artefacts précompilés** : la CI du registre compile chaque template Kotlin non modifié et publie l'artefact avec
  l'index. Ouvrir un template et lancer ses tests ne coûte aucun appel au service tant que l'utilisateur n'a rien
  modifié.
- **Cache serveur** : facultatif, en mémoire uniquement (LRU), perdu au redémarrage. Le service reste sans stockage.
- Compilation **à la demande** (`run` / `test`), jamais à la frappe. Les diagnostics de l'éditeur Kotlin viennent du
  dernier `run` / `test`, pas d'un language server (hors V1).

**Désactivation** : si `KOTLIN_COMPILER_URL` n'est pas configuré, `RuntimeRegistry.get('kotlin')` échoue avec
`RuntimeUnsupportedError` et le hub masque les templates Kotlin.

## 7. Erreurs

Toutes en `Data.TaggedError`, dans `packages/runtime-core/src/errors/`.

| Erreur | Champs | Cause typique | Affichage |
|---|---|---|---|
| `RuntimeUnsupportedError` | `kind` | Runtime désactivé (Kotlin sans service) ou inconnu | Template masqué ; message si ouvert par lien |
| `RuntimeAssetLoadError` | `asset`, `cause` | Réseau, CDN, échec SRI | Bandeau avec « Réessayer » |
| `RuntimeBootError` | `kind`, `cause` | Échec d'initialisation (WASM, worker) | Écran d'erreur de la sandbox |
| `RuntimeFsError` | `path`, `reason` | Chemin invalide, limite dépassée | Toast, fichier non écrit |
| `RuntimeCompileError` | `diagnostics` | Erreur de build / compilation sur `run` | Console + soulignement dans l'éditeur |
| `RuntimeProcessError` | `cause` | Crash du worker, mémoire épuisée | Console, worker recréé |
| `RuntimeTimeoutError` | `limitMs` | Watchdog dépassé | Console : « interrompu après N s » |
| `KotlinCompilerRateLimitedError` | `retryAfterSeconds` | `429` | Toast avec délai |
| `KotlinCompilerUnavailableError` | `cause` | Service injoignable | Toast, retry manuel |

Une erreur de test (assertion qui échoue) n'est **jamais** une erreur Effect : c'est un `TestFailed`.

## 8. Limites

Valeurs initiales, centralisées dans `packages/runtime-core/src/constants/runtime-limits.constant.ts`, à ajuster après
les spikes.

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
