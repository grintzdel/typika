# Spec — Template manifest (`typika.toml`)

Status: normative · schema `1`, frozen on 2026-10-08 · details §5 of the
[design spec](./2026-10-08-typika-v1-design.md)

Schema 1 is frozen: any change to this document that changes what a valid manifest can contain follows the
versioning rules (§10).

This document defines the format of a template manifest, of tour steps and of exercises, as well as the validation
rules. It is authoritative for the `manifest` package (Effect schema shared by the app, the CLI and the registry CI).

The words **MUST**, **MUST NOT**, **SHOULD** and **MAY** have the meaning of RFC 2119.

## 1. Structure of a template folder

```
<template>/
├── typika.toml                 # manifest (required)
├── README.md                    # long description, in English (required)
├── LICENSE                      # text of the declared license (required)
├── <sources>                    # language-specific layout (see the authoring guide)
├── <tests>
├── tour/                        # tour steps (optional)
│   ├── 01-overview.md
│   ├── 02-….md
│   └── <locale>/                # reserved (V2), ignored in schema 1
└── exercises/                   # exercises (optional)
    ├── <files>                  # ignored by Typika (e.g. exercises/go.mod, see the authoring guide)
    └── <exercise-name>/
        ├── README.md            # statement
        ├── start/               # overlay applied to the start state
        └── solution/            # overlay applied to the start state to get the solution
```

**Typika-specific** files: `typika.toml`, `tour/`, `exercises/`. What the CLI keeps of them on export is defined
in [sharing-and-cli.md](./sharing-and-cli.md).

A template MAY live at the root of a repo or in a subfolder (multi-template repo).

### Size limits (initial values)

| Limit | Value | Reason |
|---|---|---|
| Number of files (excluding `exercises/`) | 200 | Loading in the sandbox and in the URL fragment. |
| Total text size | 1 MB | Same. |
| Binary file | images only (`png`, `jpg`, `svg`, `webp`), 200 KB max each | Tour illustrations. |

Exceeded: `W_SIZE` warning locally, error on entry into the registry.

## 2. Top-level fields

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `schema` | integer | yes | — | `1`. Any other value → `E_SCHEMA_VERSION_UNSUPPORTED`. |
| `name` | string | yes | — | Kebab-case slug `^[a-z0-9]+(-[a-z0-9]+)*$`, 3 to 64 characters. Unique in the registry. |
| `title` | string | yes | — | 1 to 80 characters, English. |
| `summary` | string | yes | — | 1 to 200 characters, one sentence, English. Shown in the hub cards. |
| `keywords` | array of strings | no | `[]` | ≤ 10 lowercase words (`^[a-z0-9]+(-[a-z0-9]+)*$`, 32 characters at most), English. Added to the search text of the index: the words the learner types to describe their problem, when the title and the summary do not contain them (`switch` for Strategy). |
| `license` | string | yes | — | SPDX identifier (`MIT-0`, `MIT`, `Apache-2.0`…). See §9. |
| `authors` | array of strings | yes | — | ≥ 1 element, each `github:<login>`. |
| `role` | `"template"` \| `"base"` | no | `"template"` | `base`: template used only as a diff base (§7). Hidden from the hub lists. |
| `parent` | ref | no | — | Template this one is a remix of (§8). Set automatically by the "remix" action. |
| `[facets]` | table | yes | — | §3. |
| `[runtime]` | table | yes | — | §4. |
| `[commands]` | table | no | depends on the runtime | §4.2. |
| `[tests]` | table | no | depends on the language | §4.3. |
| `[tour]` | table | no | — | §5. |
| `[base]` | table | no | — | §7. |
| `[variants]` | table | no | — | §7. |
| `[[exercises]]` | array of tables | no | `[]` | §6. |
| `[x-*]` | table | no | — | Extension space, ignored by validation. MUST NOT be required for a template to work. |

Any other key → `E_UNKNOWN_FIELD`. The strictness is deliberate: a typo (`varaints`) must not pass silently. It
applies to all the tables of the manifest (`[facets]`, `[runtime]`, `[[exercises]]`…) and to the front matter of the
steps (§5.1); only the top level accepts `[x-*]`.

## 3. Facets

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

| Facet | Type | Required | Values |
|---|---|---|---|
| `language` | string | yes | `typescript` \| `javascript` \| `go` \| `kotlin` |
| `framework` | array | no (default `[]`) | Slugs from the controlled vocabulary of the registry ([registry.md](./registry.md)). |
| `library` | array | no (default `[]`) | Same. |
| `paradigm` | array | no (default `[]`) | `oop` \| `functional` \| `procedural` \| `reactive` |
| `topic` | array | yes, ≥ 1 | Topic identifiers (§3.1). The **first** one is the primary topic: it determines the display category in the hub. |
| `level` | string | yes | `beginner` \| `intermediate` \| `advanced` |
| `useCase` | array | no (default `[]`) | `backend` \| `frontend` \| `fullstack` \| `library` \| `cli` |

### 3.1 Topic identifiers

| Category | Form | Example |
|---|---|---|
| `architecture` | `architecture/<slug>` | `architecture/hexagonal` |
| `principle` | `principle/<slug>` | `principle/dependency-inversion` |
| `design-pattern` | `design-pattern/<family>/<slug>`, `family` ∈ `creational` \| `structural` \| `behavioral` \| `other` | `design-pattern/structural/adapter` |
| `fundamental` | `fundamental/<slug>` | `fundamental/composition-over-inheritance` |

- Slugs are in kebab-case.
- The list of existing topics is kept by the registry. An unknown topic → `E_INVALID_VALUE` on entry into the
  registry, `W_UNKNOWN_TOPIC` warning locally (lets you write a template before opening the topic PR).
- `other` groups the non-GoF patterns (Repository, Unit of Work…).

## 4. Runtime, commands, tests

### 4.1 `[runtime]`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `kind` | string | yes | — | `browser-js` \| `go` \| `kotlin` |
| `entry` | path | yes | — | Existing file, relative to the template root. Entry point of "Run". |

Language / runtime compatibility (otherwise `E_RUNTIME_LANGUAGE_MISMATCH`):

| `language` | Allowed `kind` |
|---|---|
| `typescript`, `javascript` | `browser-js` |
| `go` | `go` |
| `kotlin` | `kotlin` |

The `node` runtime does not exist in schema 1 ([ADR 0017](../decisions/0017-node-runtime.md)). Adding it later
will be a version change (§10).

### 4.2 `[commands]`

| Field | `browser-js` | `go` | `kotlin` |
|---|---|---|---|
| `start` | Path of the file to run. Default: `runtime.entry`. | Same. | Same. |
| `test` | Runner identifier: `"vitest"` (only value, default). | `"go test"` (only value, default). | `"kotlin.test"` (only value, default). |

The sandbox does not run a shell: the values are not commands but selectors. The `vitest` runner refers to the
built-in runner compatible with a subset of the Vitest API ([runtimes.md](./runtimes.md)).

### 4.3 `[tests]`

| Field | Type | Default |
|---|---|---|
| `include` | array of globs | TS: `["**/*.test.ts"]` · JS: `["**/*.test.js"]` · Go: `["**/*_test.go"]` · Kotlin: `["src/test/kotlin/**/*.kt"]` |
| `exclude` | array of globs | `["exercises/**"]` (always added, cannot be removed) |

## 5. Tour

```toml
[tour]
steps = ["tour/01-overview.md", "tour/02-context.md", "tour/03-strategy.md", "tour/04-trade-offs.md"]
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `steps` | array of paths | yes if `[tour]` is present | 1 to 12 elements. Existing `.md` files under `tour/`. The order of the array is the order of the tour. |

### 5.1 Front matter of a step

Each step file starts with a TOML front matter delimited by `+++`:

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

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | string | yes | Kebab-case slug, unique in the tour. **Stable**: does not change when the step is rewritten. Used for alignment between variants (§5.3). |
| `title` | string | yes | 1 to 60 characters. |
| `file` | path | no | File opened when the step is shown. Absent → the step is text only (e.g. `overview`). |
| `lines` | string | no | `"N"` or `"N-M"`, 1-indexed, `N ≤ M`, range ≤ 40 lines. Requires `file`. Exclusive with `region`. |
| `region` | string | no | Name of a region marked in `file` (§5.2). Requires `file`. Exclusive with `lines`. |
| `also` | array of paths | no | Files opened in secondary tabs, without highlighting. |

The Markdown body is in English. Links to another template: `typika:<name>` (resolved by the hub).

### 5.2 Anchoring: lines or regions

- **`lines`**: simple, but breaks when the code moves. The CI checks that the range exists (`E_TOUR_ANCHOR_OUT_OF_RANGE`);
  it cannot check that it points at the right code.
- **`region`**: robust to changes. The code carries comment markers on their own line:

  | Language | Opening | Closing |
  |---|---|---|
  | TS / JS / Go / Kotlin | `// #region tour:<name>` | `// #endregion` |

  The marker lines are not highlighted. The markers are removed on export (see
  [sharing-and-cli.md](./sharing-and-cli.md)). Region not found → `E_TOUR_REGION_NOT_FOUND`.

Recommendation: `region` for official templates, `lines` acceptable for third-party templates.

### 5.3 Alignment between variants

Comparison mode synchronizes two variants by step `id`. Rules:

1. The tour of the **TypeScript variant** (reference language) defines the canonical `id`s of a concept.
2. A variant SHOULD reuse the canonical `id`s. It MAY omit some (shown as "no equivalent in <language>")
   and add some (shown on one side only).
3. Shared `id`s MUST appear in the same relative order as in the reference. Otherwise `W_TOUR_ORDER_DIVERGES`
   (warning: the comparison goes out of sync).
4. When a pattern dissolves in the language, the variant **keeps the step** and explains why the code is absent
   or reduced. Removing the step would hide the lesson.
5. The `id`s `overview` (first step) and `trade-offs` (last step) are required for official templates
   (registry rule, not a schema rule).

## 6. Exercises

```toml
[[exercises]]
name = "add-pickup-point-option"
kind = "refactor"
title = "Add a pickup-point shipping option"
from = "base"
failing = ["tests/pickup-point.test.ts"]
```

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `name` | string | yes | — | Kebab-case slug, unique among the exercises of the template. Name of the `exercises/<name>/` folder. |
| `kind` | `"fix"` \| `"refactor"` | yes | — | §6.1. |
| `title` | string | yes | — | 1 to 80 characters, English. |
| `level` | level | no | `facets.level` | Same vocabulary as `facets.level`. |
| `from` | `"self"` \| `"base"` | no | `"self"` | Start state before the overlay: the template itself or its `base`. `"base"` requires `[base]`. |
| `failing` | array of paths | yes | — | ≥ 1. Test files that MUST be red in the start state. |
| `solutionFrom` | `"start"` \| `"self"` | no | `"start"` | State on which `solution/` is applied (§6.2). `"self"` requires `from = "base"`. |
| `hints` | array of paths | no | `[]` | Markdown files under `exercises/<name>/`, revealed one by one. |

Expected content of `exercises/<name>/`:

| Element | Required | Role |
|---|---|---|
| `README.md` | yes | Statement, in English. |
| `start/` | no | Overlay applied to the `from` state: files added or replaced (including the `failing` tests). |
| `start/.typika-remove` | no | List of paths (one per line) removed from the `from` state. |
| `solution/` | yes | Overlay that produces a reference solution, applied according to `solutionFrom` (§6.2). |

### 6.1 Semantics of the two kinds

| | `fix` | `refactor` |
|---|---|---|
| Typical start | `from = "self"`, part of the implementation removed | `from = "base"`: the naive code |
| Start state | `failing` tests red; the others green | existing tests green; `failing` tests (new requirement) red |
| What the learner does | Complete the implementation | Restructure, then implement the requirement |
| Lesson | Understand the mechanics of the pattern | Feel why the pattern exists |

### 6.2 Solution state

| `solutionFrom` | Solution state |
|---|---|
| `"start"` | start state + `solution/` |
| `"self"` | template + `failing` files from `start/` + `solution/` |

`"self"` serves the `refactor` exercises that start from the base: their solution is the restructured template plus
the requirement. With `"start"`, `solution/` would have to copy every file the template changes relative to the base,
copies that would diverge from the template at every change.

### 6.3 Success criteria

An exercise is **passed** when, in the learner's project, **all** the tests selected by `[tests]` (including
`failing`) pass. No structural check in schema 1: we do not check *how* the requirement was implemented. The
relevance of a `refactor` therefore rests on the design of the requirement (see the authoring guide).

### 6.4 CI checks

For each exercise, the registry CI MUST observe:

1. Start state: each `failing` file has at least one red test; no other test is red.
2. Solution state (§6.2): all tests are green.

Only the tests count. In TypeScript and JavaScript, a start state that does not pass the typecheck (a test that uses
a value the base does not know yet) is valid: execution ignores types. In Go and Kotlin, the tests are compiled
together: a `failing` file that does not compile turns all the tests red, which violates rule 1. It MUST therefore
compile against the start state (see the authoring guide).

A subfolder of `exercises/` that no `[[exercises]]` declares → `W_EXERCISE_UNDECLARED`. Files placed directly under
`exercises/` are not exercises and are ignored.

Failure → template `broken` (see [registry.md](./registry.md)).

## 7. Base and variants

### 7.1 `[base]`

```toml
[base]
template = "github:typika-app/templates/strategy-base/ts"
focus = ["src/checkout/**"]
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `template` | ref | yes | Template with `role = "base"` (otherwise `W_BASE_NOT_BASE_ROLE`). |
| `focus` | array of globs | no | Restricts the "diff from the base" view to the relevant files. Default: all files except `tour/` and `exercises/`. |

The base MUST have the same `language` and the same `runtime.kind` as the template (`E_BASE_MISMATCH`). A base has
no `[base]`, no `[variants]` and no `[tour]` (`E_BASE_FORBIDDEN_FIELD`).

### 7.2 `[variants]`

```toml
[variants]
kotlin = "github:typika-app/templates/strategy/kotlin"
go = "github:typika-app/templates/strategy/go"
```

- Keys: values of `facets.language`, different from the language of the template (`E_VARIANT_SELF`).
- The referenced variant MUST have the language of its key (`E_VARIANT_LANGUAGE_MISMATCH`, checked at resolution).
- Variants SHOULD be symmetric: if A declares B, B declares A. Otherwise `W_VARIANT_NOT_SYMMETRIC`; the registry
  completes the graph in the index so that the comparison works both ways.
- A variant SHOULD share the primary topic of the template (`W_VARIANT_TOPIC_DIVERGES`).

## 8. Template references

```
github:<owner>/<repo>[/<path>][@<ref>]
```

| Part | Constraints |
|---|---|
| `owner`, `repo` | GitHub naming rules. |
| `path` | Subfolder containing `typika.toml`. No `..`, no trailing `/`. |
| `ref` | Tag, branch or commit SHA. |

Resolution:

- Without `@ref`: default branch of the repo **at indexing time**.
- The registry index always stores a **commit SHA**: the hub serves a frozen, reproducible version that the health
  CI has tested.
- Syntactically invalid ref → `E_INVALID_REF`; not found at resolution → `E_REF_UNRESOLVABLE`.

`parent` (remix): set by the "remix" action with the SHA of the original template. It has no effect on execution;
the hub uses it to show the lineage and the diff with the parent.

## 9. License

- `license` MUST be a valid SPDX identifier (`E_LICENSE_INVALID`).
- A `LICENSE` file MUST exist (`E_LICENSE_FILE_MISSING`).
- Registry: the license MUST be OSI-approved (`E_LICENSE_NOT_OSI`); the official `typika-app/*` templates MUST
  be under `MIT-0` (review rule).

## 10. Schema versioning

- `schema` is an integer. A version of the app supports the current version **and the previous one**.
- **Without a version change**: adding a value to an enumeration opened by the registry (`framework`,
  `library`, topics), changing the size limits (§1) and the registry-specific rules (§5.3 rule 5, §9).
- **With a version change**: any addition, removal or renaming of a field, an optional field made required, a
  change of semantics or of default, a new `E_` error at the manifest or workspace level, adding a value to the
  closed enumerations (`language`, `runtime.kind`, exercise `kind`, `paradigm`, `level`, `useCase`).
  An added field is a new version because validation rejects unknown keys: without a new version, an app
  that only knows the old schema would reject a valid manifest.
- Exception: as long as no manifest is published outside this repository (slice 7 of M3), schema 1 still accepts
  optional fields without a version change ([0024](../decisions/0024-manifest-keywords.md)). `keywords` is one of them.
- A new `W_` warning does not change the version: it does not prevent opening.
- Each version change comes with an automatic migration in the `manifest` package, exposed by the CLI.
- The registry refuses new entries in a deprecated version and opens a migration PR on the `typika-app/*`
  templates.

## 11. Validation

Three levels, from the most local to the most global:

| Level | Where | Checks |
|---|---|---|
| Manifest | app, CLI, CI | Valid TOML, fields, types, enumerations, formats. |
| Workspace | CLI, CI | Referenced files (`entry`, steps, exercises, `LICENSE`, `README.md`), front matter, anchors, sizes. |
| Registry | registry CI | Resolvable refs, consistent base / variants, uniqueness of `name`, known topics, OSI license, running the tests and exercises. |

### 11.1 Codes

Errors block; warnings (`W_`) do not prevent opening in the sandbox.

| Code | Level | Message (English, shown as is) |
|---|---|---|
| `E_TOML_PARSE` | manifest | `typika.toml is not valid TOML: {detail} (line {line})` |
| `E_SCHEMA_VERSION_UNSUPPORTED` | manifest | `Manifest schema {found} is not supported. Supported: {supported}.` |
| `E_MISSING_FIELD` | manifest | `Missing required field "{path}".` |
| `E_UNKNOWN_FIELD` | manifest | `Unknown field "{path}". Extensions must live under [x-*].` |
| `E_INVALID_VALUE` | manifest | `Invalid value for "{path}": {reason}.` |
| `E_INVALID_REF` | manifest | `"{ref}" is not a valid template reference (expected github:<owner>/<repo>[/<path>][@<ref>]).` |
| `E_RUNTIME_LANGUAGE_MISMATCH` | manifest | `Runtime "{kind}" cannot run language "{language}".` |
| `E_VARIANT_SELF` | manifest | `A template cannot declare a variant in its own language ("{language}").` |
| `E_EXERCISE_DUPLICATE_NAME` | manifest | `Exercise name "{name}" is used more than once.` |
| `E_EXERCISE_FROM_BASE_WITHOUT_BASE` | manifest | `Exercise "{name}" starts from base but the template has no [base].` |
| `E_EXERCISE_SOLUTION_FROM_SELF` | manifest | `Exercise "{name}": solutionFrom = "self" requires from = "base".` |
| `E_LICENSE_INVALID` | manifest | `"{license}" is not a valid SPDX license identifier.` |
| `E_BASE_FORBIDDEN_FIELD` | manifest | `A base template cannot declare [{field}].` |
| `E_ENTRY_NOT_FOUND` | workspace | `Entry file "{path}" does not exist.` |
| `E_LICENSE_FILE_MISSING` | workspace | `LICENSE file is missing.` |
| `E_README_FILE_MISSING` | workspace | `README.md file is missing.` |
| `E_TOUR_STEP_NOT_FOUND` | workspace | `Tour step "{path}" does not exist.` |
| `E_TOUR_FRONTMATTER` | workspace | `Tour step "{path}": {reason}.` |
| `E_TOUR_DUPLICATE_ID` | workspace | `Tour step id "{id}" is used more than once.` |
| `E_TOUR_ANCHOR_OUT_OF_RANGE` | workspace | `Tour step "{id}": lines {lines} are outside "{file}" ({count} lines).` |
| `E_TOUR_REGION_NOT_FOUND` | workspace | `Tour step "{id}": region "{region}" not found in "{file}".` |
| `E_EXERCISE_PATH_NOT_FOUND` | workspace | `Exercise "{name}": "{path}" does not exist.` |
| `E_REF_UNRESOLVABLE` | registry | `Cannot resolve "{ref}": {reason}.` |
| `E_BASE_MISMATCH` | registry | `Base "{ref}" must use language "{language}" and runtime "{kind}".` |
| `E_VARIANT_LANGUAGE_MISMATCH` | registry | `Variant "{key}" points to a "{found}" template.` |
| `E_NAME_TAKEN` | registry | `Template name "{name}" is already registered.` |
| `E_LICENSE_NOT_OSI` | registry | `License "{license}" is not OSI-approved.` |
| `E_EXERCISE_START_STATE` | registry | `Exercise "{name}": starting state is wrong ({reason}).` |
| `E_EXERCISE_SOLUTION_FAILS` | registry | `Exercise "{name}": reference solution does not pass all tests.` |
| `E_TESTS_FAIL` | registry | `The tests of the template do not pass ({reason}).` |
| `E_REF_NOT_PINNED` | registry | `Ref "{ref}" must be pinned to a commit SHA.` |
| `E_ENTRY_NAME_MISMATCH` | registry | `Entry file "{file}" must be named after its template "{name}".` |
| `E_CATEGORY_MISMATCH` | registry | `An official template must live under github:typika-app/.` |
| `E_LICENSE_NOT_MIT0` | registry | `An official template must use the MIT-0 license.` |
| `E_REFACTOR_EXERCISE_MISSING` | registry | `A {category} template needs at least one refactor exercise.` |
| `E_TOUR_REQUIRED_STEP` | registry | `An official tour must start with "overview" and end with "trade-offs".` |
| `E_SIZE` | registry | `Template exceeds {limit}: {actual}.` |
| `E_GO_IMPORT_UNAVAILABLE` | registry | `package {path} is not available: Typika runs Go with the standard library only.` |
| `W_SIZE` | workspace | `Template exceeds {limit}: {actual}.` |
| `W_UNKNOWN_TOPIC` | workspace | `Topic "{topic}" is not in the registry vocabulary yet.` |
| `W_EXERCISE_UNDECLARED` | workspace | `Folder "exercises/{name}" is not declared in [[exercises]].` |
| `W_TOUR_ORDER_DIVERGES` | registry | `Tour steps {ids} are not in the same order as the reference variant.` |
| `W_VARIANT_NOT_SYMMETRIC` | registry | `"{other}" does not list this template as a variant.` |
| `W_VARIANT_TOPIC_DIVERGES` | registry | `Variant "{key}" has a different primary topic.` |
| `W_BASE_NOT_BASE_ROLE` | registry | `Base "{ref}" does not declare role = "base".` |

The `manifest` package returns each problem as a `ManifestIssue` (`code`, `path`, `message`). `path` is the path of
the field (`exercises[1].failing`) or of the file (`tour/02-context.md`), so that the editor underlines the faulty
spot. An invalid manifest or workspace fails with a single `ManifestInvalidError` that carries all the problems
found, warnings included: the author sees them all at once.

## 12. Full example

```toml
schema = 1
name = "strategy-ts"
title = "Strategy: shipping options"
summary = "Pick an algorithm at runtime without the caller knowing which one runs."
keywords = ["switch", "if-else", "conditional", "polymorphism"]
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
template = "github:typika-app/templates/strategy-base/ts"
focus = ["src/checkout/**"]

[variants]
go = "github:typika-app/templates/strategy/go"
kotlin = "github:typika-app/templates/strategy/kotlin"

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
