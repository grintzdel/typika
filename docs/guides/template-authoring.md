# Guide — Writing a template

For: anyone who writes an official (`typika-app/*`) or third-party template.
References: normative format in [manifest.md](../specs/manifest.md), expected catalogue content in
[catalogue.md](../specs/catalogue.md), registry entry in [registry.md](../specs/registry.md).

A good template teaches **one** idea. The code shows it, the base makes the problem felt, the tour explains it, the
exercises make you practice it. If you cannot sum up the idea in one sentence for `summary`, the template is too broad.

## 1. Layout

```
strategy-ts/
├── typika.toml
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── shop/
│   │   ├── money.ts
│   │   └── order.ts
│   └── checkout/
│       ├── checkout.ts
│       ├── shipping-cost.ts
│       ├── shipping-quote.ts
│       └── options/
│           ├── standard.ts
│           └── express.ts
├── tests/
│   ├── standard-shipping.test.ts
│   ├── express-shipping.test.ts
│   └── shipping-quote.test.ts
├── tour/
│   ├── 01-overview.md
│   ├── 02-the-problem.md
│   ├── …
│   └── 06-trade-offs.md
└── exercises/
    ├── add-pickup-point-option/          # from = "base", solutionFrom = "self"
    │   ├── README.md
    │   ├── start/tests/pickup-point.test.ts
    │   └── solution/src/checkout/
    │       ├── checkout.ts
    │       ├── shipping-option.ts
    │       └── options/pickup-point.ts
    └── implement-express/
        ├── README.md
        ├── hint-1.md
        ├── start/src/checkout/options/express.ts
        └── solution/src/checkout/options/express.ts
```

Rules:

- Numeric prefix on tour files (`01-`, `02-`) so that they read in order on GitHub. The authoritative order remains
  `tour.steps`.
- `README.md`: what the template teaches, how to run it outside Typika, links to the variants. In English.
- `src/main.ts` (or equivalent) MUST produce readable console output: it is what the learner sees when clicking
  "Run" before even opening the tour.

## 2. Writing the base

The base is the code **before** the concept. The "diff since the base" view is the lesson: the base matters as much as
the template.

- **Realistic, not a caricature.** The base is the code a competent developer writes under pressure, not a straw
  man. If the learner thinks "nobody writes that", the lesson is lost.
- **Same behavior.** The base and the template pass the same test suite. The template is a refactoring, not a new
  feature. Exception: tests that target the new structure (e.g. the LSP contract test).
- **Same names, same layout** wherever possible. Every difference unrelated to the concept pollutes the diff.
  Fill in `base.focus` to hide the files that are not involved.
- **A single test suite.** Shared tests go through an entry point that the base and the template expose identically
  (`openShop()`, a constructor with the same signature, a function at the same path) and are copied byte for byte,
  fixtures included. If the concept changes how an object is built (the DIP injects its dependencies), the shared tests
  go through the composition root, and the tests that build the object go in the template only.
- **A shared base** (`naive-crud-<lang>`, the base of the architectures) contains the problems of all its
  templates. Its tests go through the simulated HTTP handler and through the infrastructure fakes that `openShop`
  returns (`cards`, `broker`, `mailer`, `clock`), which each template keeps identical: the templates change only what
  sits behind them. An id is assigned only to a valid order, so that all entries number the same way.
  When the concept lives in an infrastructure file (the outbox table, the state column of a state machine), the
  template modifies it and adds it to `base.focus`, so that the diff shows it.
- **The problem must be felt in an exercise.** The base is the starting point of `refactor` exercises: the requirement
  must be painful there (duplication, one more `switch`, an impossible test).
- `role = "base"`, no tour, no variants, no exercises.

## 3. Writing the template code

- **The domain of the common thread** (shop: orders, prices, payment, shipping, notifications) and its shared
  vocabulary ([catalogue.md §1](../specs/catalogue.md#1-common-thread-a-small-online-shop)). Do not invent
  `Purchase` when the catalogue says `Order`.
- **Small.** Target: 5 to 15 source files, fewer than 400 lines excluding tests. Beyond that, the concept drowns.
- **No dependencies** outside the standard library and the test tool. A dependency is one more thing to explain,
  to update and to load in the browser.
- **Deterministic.** No implicit clock, randomness or network: inject a `Clock`, an id generator. Failures
  (broker unavailable, payment declined) are simulated by fakes controllable from the tests.
- **Few comments.** The explanation lives in the tour, not in the code: the learner who exports the template must
  get clean code. A comment is justified only if the code alone is misleading.
- **Amounts as integers** (cents) via `Money`. Never a float for money, even in an example.

## 4. Writing the tour

### 4.1 Structure

- 4 to 6 steps ([catalogue.md](../specs/catalogue.md) gives the canonical `id`s of each concept).
- First step `overview`: the problem in two sentences, what the learner will see, with no code anchor or anchored on
  `main`.
- Last step `trade-offs`: when **not** to use the concept, what it costs, the neighboring concepts (`typika:<name>`
  links). Mandatory: a pattern presented without its costs is advertising.
- In between: one step = one idea = one anchor.

### 4.2 Style

| Rule | Why |
|---|---|
| Simple English, short sentences, second person ("you"). | International audience, read next to the code. |
| 60 to 180 words per step. | Beyond that, the learner reads instead of looking at the code. |
| Start with **why**, then **what**. Never a paraphrase of the highlighted code. | The code is already on screen. |
| Name symbols in `code` exactly as in the file. | The learner looks for them on screen. |
| No "simply", "just", "obviously". | What is obvious to the author is not obvious to the learner. |
| An image only if it shows a structure the code does not show (flow, sequence). | Weight and maintenance. |

### 4.3 Anchoring

- Prefer `region` to `lines`: the `// #region tour:<name>` / `// #endregion` markers survive edits.
  They are removed on export.
- Highlighted range ≤ 40 lines; aim for 5 to 20. If the idea needs more, it needs two steps.
- `also` to open a context file without highlighting it (the implemented interface, for example).

Example:

```markdown
+++
id = "strategy-interface"
title = "One interface, many prices"
file = "src/checkout/shipping-cost.ts"
region = "contract"
also = ["src/checkout/options/standard.ts"]
+++

Every shipping option answers the same question: *how much does this order cost to ship?*
`ShippingCost` is that question, and nothing else. …
```

## 5. Writing the exercises

Each template has **at least one `refactor` exercise**; a `fix` is recommended.

### 5.1 `refactor`

- Starts from the base (`from = "base"`).
- The requirement MUST be **painful without the concept and simple with it**: this contrast is what the learner must
  feel. Design test: write the solution in the base without restructuring. If it is quick and clean, the requirement
  demonstrates nothing; pick another one.
- The `failing` tests describe the requirement through public behavior, never through structure: no check
  targets the shape of the code ([manifest.md §6.3](../specs/manifest.md)). A learner who succeeds without applying the
  pattern has solved the exercise; the reference solution and the tour show the other path.
- `solution/` contains the restructured version + the requirement, consistent with the template. Declare
  `solutionFrom = "self"`: `solution/` then contains only the gap between the template and the solution, instead of
  copying the template.
- If the requirement brings a new service, add its fake to the test fixtures from `start/` on
  (`tests/services-fixture.ts` in `observer-ts`): otherwise, once the service is required, the existing tests no longer
  pass the typecheck. Copy this fixture into `solution/`, because only the `failing` files of `start/` carry over into
  the solution state.
- `solution/` cannot be empty. If the template already is the solution (the DIP, where the exercise asks for exactly the
  restructuring), keep `solutionFrom = "start"` and copy into `solution/` the files that the template changes.
- If the requirement widens a type that the template's own tests use (one more key in a
  `Record<PaymentMethod, …>`), these tests no longer pass the typecheck in the solution state: put their updated version
  in `solution/`.
- A `start/` can provide the naive first attempt a colleague would have written (`GiftCard extends PhysicalProduct` in
  `liskov-substitution-ts`): the learner sees the flaw instead of guessing it, and the test can import the class by
  its name.
- A `failing` file can keep a non-regression test that is green from the start ("keeps emailing the text invoice"):
  only the tests of the requirement have to be red.

### 5.2 `fix`

- Starts from the template (`from = "self"`) with one piece removed or broken via `start/`.
- Targets the **mechanics** of the concept (the stacking order of decorators, the idempotency of the consumer), not a
  typo.
- A single point to fix per exercise.

### 5.3 Statement and hints

- The exercise's `README.md`: business context (2-3 sentences), requirement, "done" criterion ("all tests pass"), files
  to start from. No solution.
- `hints`: from the vaguest to the most precise. The last hint may name the concept, never give the code.

## 6. Variants and alignment

- **TypeScript is the reference.** Write the TS variant first; its step `id`s are canonical.
- **Idiom before translation.** A Go variant that reproduces a TS class hierarchy is wrong even if its tests
  pass. Write what an experienced developer of that language would write.
- **Keep the `id`s** in the same order. A step with no equivalent may be omitted; a language-specific step may
  be added ([manifest.md §5.3](../specs/manifest.md)).
- **When the pattern dissolves into the language, keep the step and say so** ("In Go, a strategy is just a function:
  there is no interface to declare"). It is the most valuable lesson of compare mode.
- **Same business tests** in every variant (same scenarios, same translated names), so that the learner compares
  identical behaviors.
- Declare the variants on both sides (symmetric `[variants]`).

## 7. Tests

- Test names = business behavior sentences (`charges express shipping at 12.90 for orders under 2 kg`).
- Fast: aim for less than 2 s for the whole suite in the browser, runtime loaded.
- Independent of execution order, with no state shared between tests.
- No snapshots: a snapshot does not say what is expected.
- Tests are read by the learner: they document the behavior as much as they check it.

## 8. Conventions per language

| | TypeScript / JavaScript | Go | Kotlin |
|---|---|---|---|
| Runtime | `browser-js` | `go` | `kotlin` |
| Layout | `src/`, `tests/` | `go.mod` (`module example.com/shop`), `cmd/shop/main.go`, `internal/<package>/` | `src/main/kotlin/`, `src/test/kotlin/` |
| Tests | Vitest-compatible API: `describe`, `it` / `test`, `expect`, `beforeEach` — exact subset in [runtimes.md](../specs/runtimes.md) | `testing` package, `*_test.go` files | `kotlin.test` (`@Test`, `assertEquals`…) |
| `commands.test` | `"vitest"` | `"go test"` | `"kotlin.test"` |
| Dependencies | None | Standard library only | Kotlin standard library + `kotlin.test` |
| Formatting | oxfmt (repo config) | `gofmt` | Official Kotlin style |
| Files | kebab-case (`shipping-quote.ts`) | snake_case (`shipping_quote.go`) | PascalCase (`ShippingQuote.kt`) |
| Outside Typika | `package.json` (`vitest`, `typescript` in devDependencies), `tsconfig.json`, Node ≥ 23.6 | `go.mod` | `settings.gradle.kts`, `build.gradle.kts` (JVM), JDK ≥ 17, Gradle ≥ 8 |

### 8.1 TypeScript without a build tool

A TS template runs outside Typika with `node src/main.ts`, without `tsx` or compilation: Node strips the types on
the fly. This requires:

- relative imports with the `.ts` extension (`import { money } from './money.ts'`).
- erasable syntax only: no `enum`, no `namespace`, no parameter properties declared in the
  constructor.
- `import type` for type-only imports.
- `failing` tests that bundle against the start state: execution ignores types, but a named import of an export
  that the start state does not have yet makes the bundle fail, and so all the tests. Import the module as a
  namespace (`import * as notifiers from …`, then `notifiers.createSmsNotifier(…)`): the missing function is `undefined`
  and only the tests that call it fail.
- no DOM API outside the preview: the `browser-js` runtime runs in a worker, and the editor only loads
  `lib.es2022` ([0015](../decisions/0015-editor.md)).

The `tsconfig.json` checks it:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

Expected scripts in `package.json`: `start` (`node src/main.ts`), `test` (`vitest run --dir tests`, to ignore the tests in `exercises/`), `typecheck` (`tsc`).

### 8.2 JavaScript

A JS variant is not the TS variant without its types: it exists only if the platform or the language brings
something ([catalogue.md §8.3](../specs/catalogue.md)), and that is what its code and its tour show
(`EventTarget` and `AbortSignal` in `observer-js`, higher-order functions instead of classes in
`decorator-js`, the prototype chain under `class` and a factory function in `composition-over-inheritance-js`). It runs with `node src/main.js`, Node ≥ 22. This requires:

- relative imports with the `.js` extension; no `tsconfig.json`, no `typescript` in `package.json`, no
  `typecheck` script.
- no file that exists only for a type: service interfaces disappear, duck typing replaces them.
  Private fields with `#`, not the `_` convention.
- the same business tests as the TS variant, same files and same names, as `.test.js`. Only the call changes when
  the idiomatic form changes: `notify(...)` instead of `notifier.notify(...)` in `decorator-js`.

In the editor, the language service reads `.js` files without typing them (`allowJs`, no `checkJs`): completion and
hover, no type errors.

An error thrown by an `EventTarget` listener does not propagate to `dispatchEvent`: it goes to the global handler.
The browser logs it, Node stops the process, and the other listeners are still called. A `fix` exercise that
removes an isolation therefore only fails the test that checks the error report. The Tests tab and
`template-check` ignore these uncaught errors, like the browser's test worker.

### 8.3 Go

A Go template runs outside Typika with `go run ./cmd/shop` and `go test ./...`. Go compiles and runs tests per
package, which requires:

- **An `exercises/go.mod`** (`module example.com/shop/exercises`). The `start/` and `solution/` overlays do not compile
  on their own; a nested module takes them out of the template's `./...` patterns.
- **`failing` tests that compile against the start state.** A test file that does not compile breaks its whole
  package, and so all its tests. For a value the base does not know yet, write the conversion
  (`checkout.ShippingOption("pickup-point")`) rather than the solution's constant.
- **A new API declared by `start/`.** When the requirement changes the signature the test calls (the DIP, whose
  test builds the service with its dependencies), the test cannot compile against the base. `start/` then
  declares the expected API with a body that ignores its arguments (`func New(orders OrderRepository, notifier Notifier)
  *Service { return NewService() }` in `dependency-inversion-go`): the test compiles, only its behavior is red.
  The template puts these declarations in the same file, so that `solution/` replaces it.
- **A `fix` `start/` that does not panic.** A `panic` in a test stops the test binary: the following tests
  do not run. Return a wrong value (`shop.Zero`), not `panic("not implemented")`. The rule also applies to
  the helpers of shared tests: `lastEmail` in `naive-crud-go` indexed the list of sent e-mails, and panicked
  as soon as the exercise's adapter sent nothing. A helper returns an empty value when it has nothing to return.
- **No `net/http`** in the precompiled set: an HTTP handler stays simulated (`web.Request` / `web.Response`),
  with JSON bodies read and written by `encoding/json`. Compare a JSON whose key order depends on the
  implementation (a `map` sorts its keys, a struct follows its fields) by decoding it (`sameJSON`), not as a
  string.
- **A goroutine in a test** synchronizes explicitly: wait for a condition read under a lock with a
  deadline, cancel the `context`, then wait for the goroutine to finish on a channel before reading what it
  wrote. `outbox-go` does it for its relay, and passes `go test -race`.
- Black-box tests in the `<pkg>_test` package, with subtests `t.Run("<behavior sentence>", …)`: the
  names stay those of the TS variant.

The `go` runtime is the official Go toolchain ([0018](../decisions/0018-go-runtime.md)): the whole language is
available, goroutines, generics and `context` included. Still forbidden: third-party modules, stdlib packages
outside the precompiled set (`E_GO_IMPORT_UNAVAILABLE`, list in [runtimes §6.3](../specs/runtimes.md)), `cgo`,
`go:embed`, `os/exec` and `net/http` servers. `pnpm template-check` runs the Go exercises with this runtime.

### 8.4 Kotlin

A Kotlin template runs outside Typika with `gradle run` and `gradle test`, on the JVM. In Typika, the same code
is compiled to JavaScript ([0019](../decisions/0019-kotlin-runtime.md)): it must therefore compile and pass its tests
on both platforms. This requires:

- **Stdlib and `kotlin.test` only**: no `java.*` API (`String.format` included), no `kotlinx.coroutines`
  or other library. The JS compiler rejects `java.*`, so the registry CI catches it.
- **A minimal JVM Gradle build**: `kotlin("jvm")` and `application` plugins, `testImplementation(kotlin("test"))`,
  `tasks.test { useJUnitPlatform() }`. `main` in `src/main/kotlin/Main.kt`, with no package, hence
  `mainClass = "MainKt"`. No Gradle wrapper: it would add a binary to the template.
- **Test names without `.`**: the JVM rejects `.`, `;`, `[`, `]`, `/`, `<`, `>`, `:` and `\` in a method name,
  even between backticks. Amounts are written with a comma: ``fun `charges 12,90 for orders up to 2 kg`()``.
  One test class per TS test file, one method per `it`.
- **`failing` tests that compile against the start state.** All the tests of a project are compiled together: a
  single file that does not compile, and no test runs. For a value the base does not know yet, look it
  up at run time (`ShippingOption.entries.find { it.label == "pickup-point" }`) rather than naming the
  solution's constant.
- **A new API declared by `start/`.** When the test calls a member that the base does not have
  (`downloadInvoice` in `single-responsibility-kotlin`), `start/` replaces the base's file with the same class
  with this member as `TODO()`, and copies the files that no longer compile (`Main.kt` when the constructor gains a
  parameter). An exception stays within its test: only the tests of the requirement are red.
- Exercise overlays live outside `src/`: Gradle does not see them, no extra file is needed.
- **Contract tests in an abstract class.** The tests a subtype must pass live in an
  `abstract class` with its `@Test`s and an abstract function that builds the object (`ShippableContract` in
  `liskov-substitution-kotlin`). The test class of each subtype inherits from it and overrides it. Both the JVM and
  Typika run inherited tests, and Typika files them under the subclass's file: an exercise can target that file.
- **Failure messages that do not depend on the platform.** Typika shows those of `kotlin.test`
  (`Expected <12.90 EUR>, actual <0.00 EUR>.`); Gradle, those of JUnit 5 for `assertEquals`, `assertNotEquals`,
  `assertNull` and `assertNotNull`. A tour that quotes a failure message quotes Typika's. A message that names a
  type (`assertIs`, `assertFailsWith`) differs: the JVM writes `java.lang.String`.
- **Numbers checked by their value.** In JavaScript, all numbers are `Number`s: `0.5 as? Int`
  succeeds, where the JVM returns `null`. To require an integer in a request body (`Map<String, Any?>`s in
  `naive-crud-kotlin`), read a `Number` and compare `toInt()` with the value, like `wholeNumber`. `template-check` does
  not run the tests of a base: open the base in the browser to see them pass in JavaScript.

`KOTLIN_COMPILER_URL=http://… pnpm template-check` runs the Kotlin exercises against this service; without the variable,
they are not run and the command reports it.

## 9. License

- Official `typika-app/*` templates: `license = "MIT-0"` and the MIT-0 text in `LICENSE`. No license header
  in source files: the code is made to be copied.
- Third-party templates: any OSI-approved license, SPDX identifier in the manifest, text in `LICENSE`.
- No code copied from a source whose license is incompatible or unknown (book examples, articles).

## 10. Checklist before the registry PR

Manifest and structure:

- [ ] The validator reports no error; each remaining warning is justified in the PR.
- [ ] `keywords` contains the words a learner would type to describe their problem and that are missing from the
  title, the summary and the tour (`switch` for Strategy); empty otherwise.
- [ ] `name` follows the catalogue convention (`<concept>-<lang>`, `<concept>-base-<lang>`).
- [ ] Main topic first in `facets.topic`; `level` consistent with the catalogue.
- [ ] `LICENSE` present and matching `license`.
- [ ] In this repository: the folder is added to the git index (`git add`) before `pnpm test`, because the validator
  test only reads tracked files.

Code:

- [ ] Common thread vocabulary respected; no dependency outside the standard library and the test tool.
- [ ] "Run" produces readable output; all tests pass in the sandbox.
- [ ] Base and template pass the same business test suite; `base.focus` limits the diff to the relevant files.
- [ ] No comment that repeats the tour.

Tour:

- [ ] 4 to 6 steps, `overview` first, `trade-offs` last.
- [ ] `id`s aligned with the TS variant; relative order respected.
- [ ] Anchors as `region`; each range highlights the code the step talks about.
- [ ] `typika:<name>` links to the neighboring concepts listed in the catalogue.

Exercises:

- [ ] At least one `refactor` that starts from the base; the requirement is painful in the base (checked by writing it
  there).
- [ ] Start state: only the `failing` tests are red. With `solution/`: everything is green. `pnpm template-check` checks
  it for `browser-js` and `go` templates.
- [ ] Statements without the solution; progressive hints.

Variants:

- [ ] Idiomatic code for the language, not a translation.
- [ ] "Dissolved" steps kept and explained.
- [ ] `[variants]` declared on both sides.

Review:

- [ ] Reviewed by someone who does not know the concept: did they understand the idea in one session?
