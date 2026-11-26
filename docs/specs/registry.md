# Registry and index

Status: draft · 2026-10-08 · See also: [manifest](manifest.md), [catalogue](catalogue.md),
[security](security.md), [author guide](../guides/template-authoring.md)

The registry is the hub's single source of truth. It contains no template code: it references templates
hosted on GitHub and produces the static index that the app consumes.

## 1. The `typika-app/registry` repository

```
registry/
├── templates/
│   ├── official/
│   │   ├── hexagonal-architecture.toml
│   │   └── strategy-ts.toml
│   └── community/
│       └── <name>.toml
├── maintainers.toml           # curation team, roles
├── vocabulary.toml            # known topics and their label
├── health/                    # computed state, written only by CI
│   └── <name>.json
├── artifacts/kotlin/          # compilations of the Kotlin templates and their exercises, written by CI
│   └── <key>.json
├── schema/
│   └── index.schema.json      # JSON schema of index.json
├── CODEOWNERS
└── .github/workflows/
    ├── validate-pr.yml
    ├── build-index.yml
    └── health.yml
```

### 1.1 Entry file

One file per template, named after the manifest's `name`.

```toml
ref = "github:typika-app/templates/strategy/ts@3f2c9a1e7b4d"
maintainers = ["github:maoudin", "github:alice"]
category = "official"          # official | community
added = 2026-10-08
```

| Field | Required | Rule |
|---|---|---|
| `ref` | yes | Full reference, **pinned to a commit SHA** (§6). Branch or tag rejected. |
| `maintainers` | yes | At least one GitHub account. Receives the health notifications. |
| `category` | yes | `official`: repository under `typika-app/*`, maintained by the curation team. `community`: any other repository. |
| `added` | yes | Entry date, filled in by the PR. |
| `parent` | no | Pinned ref of the template this one is a remix of (§7). |
| `deprecated` | no | `true`: team decision to deprecate the template (§5), applied at the next health run. |

The file name must equal the `name` of the manifest it points to. Names are unique across the whole registry, all
categories combined.

### 1.2 Official and community

| | `official` | `community` |
|---|---|---|
| Hosting | `typika-app/*` | Any public GitHub repository |
| License | MIT-0 | Any OSI-approved license, declared in the manifest |
| Review | Curation team, 2 approvals | Curation team, 1 approval |
| Featuring | Home page, paths, catalogue | Faceted list, search |

### 1.3 Repository of the official templates

The official templates live in **a single repository**, `typika-app/templates`, and not one repository per template:
with the bases and the variants, that would make nearly 80 repositories to configure, monitor and update.

```
typika-app/templates/
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

- Ref of an official template: `github:typika-app/templates/<concept>/<lang>@<sha>`.
- Ref of a base: `github:typika-app/templates/<concept>-base/<lang>@<sha>`.
- A PR on the repository runs only the tests of the changed folders.
- A commit changes the SHA of the whole repository: the registry automation updates only the entries whose
  folder changed (§6).

Community templates are free to organize themselves as they like (one repository, a subfolder, a monorepo).
| Dependencies | Renovate managed by the team | Maintainer's responsibility |

## 2. Contribution process

### 2.1 Adding a template

1. The author validates locally: `typika validate` ([sharing-and-cli](sharing-and-cli.md#7-typika-validate)).
2. They open a PR that adds **a single** file `templates/<category>/<name>.toml`.
3. `validate-pr.yml` runs the automatic validations (§2.2) and posts a summary comment.
4. Human review (§2.3).
5. Merge → `build-index.yml` regenerates the index; the template appears at the next deployment.

### 2.2 Automatic validations (blocking)

| # | Check | Codes |
|---|---|---|
| V1 | The entry file follows the schema (§1.1), `ref` pinned to an existing SHA. | `E_MISSING_FIELD`, `E_UNKNOWN_FIELD`, `E_INVALID_VALUE`, `E_INVALID_REF`, `E_REF_NOT_PINNED`, `E_REF_UNRESOLVABLE` |
| V2 | The `typika.toml` manifest is present at the ref and valid (shared `manifest` schema). | Manifest-level codes of [manifest §11](manifest.md) |
| V3 | Unique `name`; file name = `name`. | `E_NAME_TAKEN`, `E_ENTRY_NAME_MISMATCH` |
| V4 | License present and OSI-approved; `official` ⇒ MIT-0, hosted under `typika-app/*`, and placed in `templates/official/`. | `E_LICENSE_NOT_OSI`, `E_LICENSE_NOT_MIT0`, `E_CATEGORY_MISMATCH`, `E_INVALID_VALUE` |
| V5 | All internal refs (`base`, `variants`, `parent`) exist and are themselves in the registry or in the same PR. | `E_REF_UNRESOLVABLE`, `E_BASE_MISMATCH`, `E_VARIANT_LANGUAGE_MISMATCH` |
| V6 | The referenced files exist: `runtime.entry`, tour steps, `file#Lx-Ly` anchors within the bounds of the file. An official tour starts with `overview` and ends with `trade-offs` ([manifest §5.3](manifest.md)). | `workspace` codes of [manifest §11](manifest.md), `E_TOUR_REQUIRED_STEP` |
| V7 | Topics known in `vocabulary.toml` (`<category>/<slug>`); valid facets. | `E_INVALID_VALUE` |
| V8 | Full health run (§4) in `healthy` state. A template cannot enter as `degraded` or `broken`. | — |
| V9 | Exercises: for `fix`, the listed tests fail in the initial state and everything else passes; for `refactor`, the requirement's tests fail and pass on the provided solution. A principle or a design pattern has at least one `refactor` exercise (§2.3). | `E_EXERCISE_START_STATE`, `E_EXERCISE_SOLUTION_FAILS`, `E_REFACTOR_EXERCISE_MISSING` |
| V10 | Total size of the template under the limit of [security](security.md). No binary outside the allowlist. | `E_SIZE` |
| V11 | A Go template imports only the stdlib embedded by the `go` runtime ([runtimes §6.3](runtimes.md)). | `E_GO_IMPORT_UNAVAILABLE` |

`packages/registry-tools` carries these checks: `registry-tools build <registry> --out <index.json>` runs them,
then writes the index. It reads each template at its pinned SHA. As long as `typika-app/templates` does not exist
(slice 7 of M3), the monorepo's `registry/` folder stands in for the registry, and
`github:typika-app/templates/<path>@<sha>` is read from the monorepo's `templates/` folder, at that commit.
`--checkout <owner>/<repo>=<dir>` instead reads a repository from a local clone, from its root: this is how the CI
of `typika-app/registry` will read `typika-app/templates`. V8 depends on the health run (§4), which
`registry-tools health` carries out. Like `template-check`, `registry-tools` runs
the Go exercises and applies V11. It runs the Kotlin exercises (V9) when `KOTLIN_COMPILER_URL` points to a compilation
service, and otherwise reports that it did not; the app build does without it. With this service,
`registry-tools build` also writes the precompiled artifacts of the Kotlin templates and of the start state of their
exercises into `artifacts/kotlin/`
([runtimes §6.4](./runtimes.md)); without it, it reports those that are missing or stale. `registry-tools health` reads
`/config.json` of the target instance and probes Kotlin only if it has a compiler.
`registry-tools mirror <index.json> --out <dir>` writes the files of each entry at its pinned
ref, in jsDelivr's format ([0022](../decisions/0022-template-files-source.md)): this is the source of the files
when the app serves its own registry.

### 2.3 Human review — acceptance criteria

The review judges the educational value, not only that it runs.

- **One concept, well explained.** The template teaches what its topics announce, without off-topic code.
- **Relevant base** (principles and patterns): the base shows the problem credibly, the diff is readable.
- **Tour**: at least 3 steps, anchored on the code, in English, without copying the code into the text.
- **At least one `refactor` exercise** for the principle and design pattern categories.
- **Idiomatic** in its language; a variant is not a literal translation of TS.
- **Alignment**: a variant reuses the step ids of the reference TS template for comparison.
- **No duplicate** of an existing template; otherwise propose an improvement of the existing one.

Target review time: non-binding. A PR with no activity from the author for 30 days is closed.

### 2.4 Updating a template

A PR that changes only `ref` (new SHA). Lighter review: automatic validations + 1 approval, or
auto-merge for `official` templates if only the `ref` changes, the PR comes from the team's automation (§4.4) and
V1-V10 pass.

## 3. `index.json`

Generated by `build-index.yml` on each merge and after each health run. Published as a static asset versioned with
the app, and under a stable URL for self-hosted instances. The app never reads the registry directly. The
Kotlin artifacts are published with it, in `artifacts/kotlin/` next to `index.json`: the app looks for them there
([runtimes §6.4](./runtimes.md)).

### 3.1 Schema

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
      "ref": "github:typika-app/templates/strategy/ts@3f2c9a1e7b4d",
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
        "base": "github:typika-app/templates/strategy-base/ts@9e8d7c6b5a4f",
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
        "runUrl": "https://github.com/typika-app/registry/actions/runs/…"
      },
      "search": { "text": "strategy switch behaviour polymorphism" }
    }
  ]
}
```

Rules:

- The `variants` of the index are resolved to registry template **names**, not to refs; `base` is resolved to the
  pinned ref of the base's entry.
- `manifest.role` is carried over so that the hub hides the bases. `facets.framework` is an array, as in the
  manifest.
- `health` is `null` as long as the health CI has not run on the template.
- `schema/index.schema.json` is generated from the Effect schema of the index (`registry-tools schema`).
- `search.text` gathers, in lowercase and without duplicates, the words of the name, the title, the summary, the
  `keywords`, the topic labels, the tour step titles and the exercise titles.
- The content of the files (code, tours) is not in the index: the app loads it on opening from the pinned ref.
- The index contains only the metadata needed by the hub and search. Target: < 500 KB compressed.
- `schema` is versioned; the app rejects an index with an unknown major version and shows a message.

## 4. Health CI

### 4.1 Frequency

- Weekly on the whole registry.
- On each PR that adds or changes an entry (V8).
- On request from a maintainer (`workflow_dispatch` on a name).

### 4.2 Steps per template

1. **Resolution**: download the ref, validate the manifest.
2. **Boot**: start the declared runtime in the same environment as the app (headless browser driven by
   Playwright), run `commands.start` with a timeout.
3. **Tests**: run `commands.test`, collect the normalized events (see [runtimes](runtimes.md)).
4. **Exercises**: replay V9 for each exercise.
5. **Dependencies**: detect outdated or vulnerable dependencies (depending on the language's tooling).
6. **Writing**: `health/<name>.json`, then regeneration of the index.

### 4.3 Computing the state

| State | Condition |
|---|---|
| `healthy` | Boot, tests and exercises pass; no dependency alert. |
| `degraded` | Everything passes, but with warnings: outdated or vulnerable dependency, boot time over the threshold, compiler warnings. |
| `broken` | Failure at boot, in the tests or in the exercises, or ref not found. |
| `deprecated` | `broken` without interruption for 90 days, or team decision (§5). |

- An isolated failure is retried once before switching to `broken`, to absorb network errors.
- `brokenSince` is kept as long as the state stays `broken`; it resets as soon as a run is `healthy` or `degraded`.
- A `deprecated` template that becomes healthy again through a new ref goes back to `healthy` after review.

`registry-tools health <registry> --app <url> [--only <names>] [--run-url <url>]` carries out this run on an instance
of the app that serves the templates at their pinned ref ([0025](../decisions/0025-health-run.md)). It writes
`health/<name>.json`, which `registry-tools build` copies into the index. Templates whose runtime the app does not run
yet (Go, Kotlin) are skipped and keep `health: null`. The dependency check (step 5) is `skip` for
now, and a boot of more than 20 s makes the template `degraded`.

### 4.4 Renovate

- Enabled on all `typika-app/*` repositories.
- Renovate PRs on a template repository trigger the template's tests; once merged, the team's automation
  opens the `ref` update PR in the registry (§2.4).
- `community` templates are free to enable it; the author guide provides a configuration.

### 4.5 Notifications

| Event | Action |
|---|---|
| Switch to `degraded` | Issue opened on the registry, maintainers mentioned. |
| Switch to `broken` | Issue (or update of the existing issue), maintainers mentioned, deprecation deadline stated. |
| D+60 in `broken` | Reminder on the issue. |
| Switch to `deprecated` | Closing comment, template hidden by default. |
| Back to `healthy` | Issue closed automatically. |

## 5. Deprecation and removal

- **Deprecation**: the template stays in the index with `status: deprecated`. It is hidden from the home page and the
  list by default, reachable by direct URL with a banner, and still exportable.
- **Removal**: deletion of the entry file, by PR. Grounds: invalid license, malicious content, request from
  the author, `deprecated` for 180 days with no active maintainer. Existing local projects and share links
  keep working: they embed their files.
- **Emergency removal** (malicious content, license violation): a team member can merge without delay;
  the index is regenerated and redeployed immediately.

## 6. Versioning

- An entry **always** points to a commit SHA. The content served by the hub is therefore immutable between two
  registry PRs: a force-push or a branch deletion on the author's side changes nothing.
- The manifest can reference `base` and `variants` with any ref; at indexing time, they are resolved to
  the registry entries.
- A local project created from a template records the original pinned ref: the "my changes" diff and the
  reset stay possible even after an update of the template.
- If the SHA can no longer be found (repository deleted), the template switches to `broken` at the next run.

## 7. Remix and parent

- Remixing a template in the app creates a local project (see [sharing-and-cli](sharing-and-cli.md)) whose
  `parent` metadata is the original pinned ref.
- If the user pushes this remix to GitHub, the generated `typika.toml` keeps `parent`.
- If this remix is submitted to the registry, the entry carries over `parent`. The template page then shows the link to
  the parent and a "diff with parent" button.
- `parent` is informational: it imposes nothing on the license beyond the parent's, which the author must respect.

## 8. Governance

- **Curation team** declared in `maintainers.toml` and `CODEOWNERS`. Roles: `curator` (review, merge),
  `admin` (configuration, emergency removals).
- Decisions on the topic vocabulary, the acceptance rules and the categories: by PR on the registry, with
  public discussion, by consensus of the curators. Structuring decisions are recorded as ADRs
  ([decisions](../decisions/)).
- A regular `community` contributor can become a curator on the proposal of an existing curator.
- The registry has its own license (CC0 for the entry files and the index); each template keeps its own.
