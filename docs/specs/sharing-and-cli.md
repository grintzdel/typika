# Persistence, sharing, export and CLI

Status: draft · 2026-10-08 · See also: [ui](ui.md), [registry](registry.md), [manifest](manifest.md),
[security](security.md)

Typika stores no user data. Projects live in the browser; sharing goes through the URL or through the user's GitHub
account.

## 1. Local persistence

### 1.1 IndexedDB schema

Database `typika`, versioned.

| Store | Key | Content |
|---|---|---|
| `projects` | `id` (UUID) | `{ id, name, origin, createdAt, updatedAt, exercise?, ui }` |
| `files` | `[projectId, path]` | `{ projectId, path, content, updatedAt }`; index on `projectId` |
| `templateCache` | pinned `ref` | Original files of a template: used for reset, diff and offline mode |
| `exerciseProgress` | `[templateName, exerciseName]` | `{ status: 'started' \| 'passed', hintsRevealed, passedAt? }` |
| `meta` | key | Version of the application schema, preferences (language, theme, layout) |

In M1, only `projects` and `files` exist (version 1 of the database); the other stores will arrive with their
milestone, through migration. Templates are then built into the app and have no ref: `origin` is
`{ kind: 'template', name }`, and reset reads the built-in template again. The pinned ref and `templateCache` arrive
with the registry (M3).

`origin` of a project:

```ts
type ProjectOrigin =
  | { kind: 'template'; name: string }
  | { kind: 'exercise'; name: string; exercise: string }
  | { kind: 'share-url'; name: string; exercise?: string }
  | { kind: 'gist'; name: string; gistId: string; exercise?: string }
  | { kind: 'personal'; name: string; language: Language }
```

The pinned ref of the template sits next to the origin, in `projects.ref`. It is the `parent` of a remix, kept on
export (§4, §5). `projects.gistId` keeps the gist the project was shared to (§3).

A `personal` project ("New project", [ui](ui.md) §11) no longer depends on the catalog: its start state is kept in
`projects.baseline` (path → content), and is used for reset and diff. `name` is the `name` of its `typika.toml`, read
from this start state; its exercises, if any, are ignored. A copy of a catalog template keeps its ref in
`projects.ref`, as `parent` on export.

A template can have several projects: `/p/<projectId>` opens one of them, and `/play/<name>` reopens the most recent
one of its origin.

Files stored as UTF-8 text. Binaries are refused on import (limits in [security](security.md)).

Heavy runtimes (WASM, toolchains) are not in IndexedDB: they are put in Cache Storage by their runtime ([0027](../decisions/0027-go-assets-delivery.md)).

### 1.2 Quotas

- At startup, `navigator.storage.persist()` is requested when the first project is created, to reduce the risk of
  eviction by the browser. The result depends on the browser and is not guaranteed.
- `navigator.storage.estimate()` feeds the space indicator of `/projects`.
- Above 80% of the estimated quota: warning, suggestion to export or delete projects.
- Write refused (quota exceeded): editing goes on in memory, persistent "not saved" banner, suggested actions: export,
  free up space.
- `templateCache` is purged first (LRU): it is rebuilt from the network.
- The UI reminds that local data disappears if the user clears the site data.

### 1.3 Migration

- Each schema change increments the IndexedDB version; the migration runs in the `upgradeneeded` event, step by step
  (v1→v2→v3), never skipping.
- A migration is tested with a data set from the previous version.
- Failed migration: the database is left intact, the app offers to export all projects as a zip before any other
  action.
- Several open tabs: a tab on an old version receives `versionchange`, closes its connection and asks for a reload.

## 2. Sharing by URL — `/s#<payload>`

For small projects, without server or account. The payload is in the **fragment**: the browser does not send it to the
server.

### 2.1 Format

```
<version>.<data>
```

- `version`: integer, currently `1`.
- `data`: base64url of the compression of the following JSON. Algorithm: `deflate-raw` through `CompressionStream`
  if available; final choice and fallback to be confirmed during implementation.

```jsonc
{
  "n": "strategy-ts (remix)",            // name
  "o": "github:typika-app/templates/strategy/ts@3f2c9a1e7b4d", // origin, optional
  "r": "browser-js",                     // runtime
  "x": "implement-express",              // exercise, optional: the delta starts from its start state
  "f": { "src/main.ts": "…" },           // full files if no origin
  "d": { "src/pricing/strategy.ts": "…", "src/old.ts": null } // or delta vs origin: full content or null = deleted
}
```

- If `o` is present and resolvable, only the changed files are encoded (`d`); this is the common case and it greatly
  reduces the size.
- If `o` is absent or cannot be found on opening, `f` is required; otherwise an explicit error.
- Typika emits `o` and `d` for a project from the catalog, and `f` without `o` for a `personal` project. A link whose
  `o` names a template of the index opens on that template (`f` is read instead of `d` when it is present). Otherwise,
  `f` must contain a valid `typika.toml`: the link opens as a shared `personal` project.
- `deflate-raw` through `CompressionStream` is chosen, without fallback: the targeted browsers all have it.

### 2.4 Opening

- The link opens in an ephemeral sandbox. The local project is created on the first change, or on "Save in my
  projects", with the origin `share-url` and the ref of `o`.
- Its id is derived from the payload (SHA-256, in UUID format): reopening the same link in the same browser reopens the
  saved copy, instead of creating another one.
- Reset brings back the files of the original template (or of the start state of the exercise), as for a template
  project.

### 2.2 Threshold

- Limit: full URL ≤ 8,000 characters (margin under the common limits of browsers, messaging apps and URL shorteners;
  to adjust according to tests).
- Above: the URL option is disabled with the reason, and sharing by gist is offered.

### 2.3 Versioning

- Any incompatible change of the JSON increments `version`.
- The app decodes every version it has known; an unknown version (payload more recent than the app) shows
  "This link was made with a newer version of Typika."

## 3. Sharing by gist — `/g/<gistId>`

- Requires a GitHub OAuth sign-in (scope `gist` only). The token is obtained through the exchange endpoint of the
  instance, kept in session memory (`sessionStorage`), never on the server side. The sign-in is a full-page redirect,
  with `state` and PKCE ([0034](../decisions/0034-github-oauth-and-gists.md)); on return, the share dialog reopens.
- Creation: a **secret** gist by default (public option), one file per project file. A gist is flat: `/` becomes `__`
  in the file name, with a `~2` suffix in case of collision.
- `typika.share.json` describes the project: `v` (version, `1`), `n` (name), `o` (origin ref), `r` (runtime), `x`
  (exercise, optional), `files` (name in the gist → path) and `blank` (path → content of the empty or blank files,
  which the gists API refuses). Gist files absent from `files` are ignored.
- Sharing again a project already shared updates the same gist: its id is kept in `projects.gistId`. A project never
  saved, or opened from someone else's gist, creates a new gist.
- As for a link: a gist whose `o` names a template of the index opens on that template, and a gist without `o` (or of
  an unknown template) opens as a `personal` project if its files contain a valid `typika.toml`. A gist with a file the
  API truncated (more than 1 MB) is not opened.
- Opening `/g/<gistId>`: read through the public GitHub API, without sign-in. The API rate limits for anonymous
  requests apply; when exceeded, a message and an offer to sign in.
- A secret gist stays reachable by anyone who has the link: the UI says so at sharing time.

## 4. Zip export

- From the sandbox and `/projects`, without sign-in.
- Content: the project files, including `typika.toml` (with `parent` if remix) and `tour/`.
- Option "without the Typika files": same rule as `typika create` without `--keep-tour` (§6.4). It lives in
  `@typika/manifest` (`withoutTypikaFiles`), which the CLI reuses.
- With the Typika files, `typika.toml` receives `parent` (the pinned ref of the template) if it does not already
  declare one.
- Name: `<project-name>.zip`, without the characters a file name cannot carry.

## 5. Push to GitHub

- OAuth sign-in with the `public_repo` scope, requested at push time only. V1 only creates public repositories: `repo`
  is never requested ([0034](../decisions/0034-github-oauth-and-gists.md)).
- Form: repository name, description, include the Typika files (yes by default).
- Creates the repository, then a single initial commit on the default branch. No push to an existing repository in V1.
  The GitHub Git API refuses an empty repository: the repository is created with `auto_init`, then its branch is moved
  onto a commit without parent that carries the files.
- The pushed `typika.toml` keeps `parent`; a minimal README is added if none exists, with a link to the original
  template.
- Result: link to the repository and suggestion "propose to the registry" ([registry](registry.md#2-contribution-process)).
- Errors (name already taken, scope refused, API limit): message with the cause, form kept. If the repository is
  created but sending the files fails, the message asks to delete it before trying again.
- The form lives in the Export dialog. The "propose to the registry" suggestion has no link as long as the registry is
  not public (#92).

## 6. CLI `typika create`

npm package `typika`, usable through `npx typika`. Node ≥ 22.

### 6.1 Commands

```
typika create <template> [dir] [options]
typika validate [dir] [options]
typika --version | --help
```

### 6.2 Arguments and options of `create`

| Element | Description |
|---|---|
| `<template>` | Registry name (`strategy-ts`) or ref (`github:owner/repo/path@ref`). |
| `[dir]` | Target folder. Default: template name. Must be absent or empty. |
| `--variant <lang>` | Take the variant in this language (`go`, `kotlin`…). Error if it does not exist. |
| `--exercise <name>` | Create the project in the initial state of this exercise, statement included. |
| `--keep-tour` | Keep `typika.toml` and `tour/`. |
| `--no-install` | Do not install the dependencies. By default, the install is not started either in V1; the command is shown. |
| `--registry <url>` | URL of an alternative `index.json` (self-hosted instance). |
| `--archive-url <url-template>` | URL pattern of the archives (`{owner}`, `{repo}`, `{ref}`). Default: `https://codeload.github.com/{owner}/{repo}/tar.gz/{ref}` ([0032](../decisions/0032-cli-archives-and-validate.md)). |
| `--force` | Allow a non-empty folder. |
| `--json` | Machine output (one final JSON line). |

### 6.3 Resolution

1. `<template>` contains `github:` → direct ref, without going through the registry; warning if the ref is not pinned
   on a SHA.
2. Otherwise → search by name in the index (default: index of the public instance). `deprecated` template: warning,
   created anyway; `broken`: warning.
3. `--variant` → resolution through `variants` of the entry found.
4. Download of the archive of the pinned ref from GitHub; extraction of the `path` subfolder if present.
5. Validation of the manifest; unknown `schema` version → error.

### 6.4 Output

- By default, removes: `typika.toml`, `tour/`, the definition of the exercises and their solutions.
- With `--keep-tour`: keeps `typika.toml`, `tour/` and `exercises/`, and adds `parent` to `typika.toml`, like the zip
  export with the Typika files (§4). With `--exercise`, `exercises/` is removed.
- With `--exercise`: keeps the statement of the exercise in `EXERCISE.md`, removes hints and solution.
- Adds a `README.md` if none exists, with title, summary, link to the template page.
- Shows the next steps: `cd <dir>`, install and test command according to the language.

### 6.5 Exit codes

| Code | Case |
|---|---|
| `0` | Success |
| `1` | Unexpected error |
| `2` | Invalid arguments |
| `3` | Template not found (name or ref) |
| `4` | Variant or exercise not found |
| `5` | Invalid manifest or unsupported schema version |
| `6` | Target folder not empty (without `--force`) |
| `7` | Network error or GitHub API limit |

## 7. `typika validate`

For template authors, before a PR to the registry. Runs locally the automatic registry validations that do not depend
on the registry itself ([registry §2.2](registry.md#22-automatic-validations-blocking)).

```
typika validate [dir] [--run] [--json]
```

| Check | Without `--run` | With `--run` |
|---|---|---|
| Valid manifest (schema, facets, known topics) | ✓ | ✓ |
| License present | ✓ | ✓ |
| Referenced files present, tour anchors within bounds | ✓ | ✓ |
| Unique step ids; alignment with the reference TS variant if it is reachable | ✓ | ✓ |
| File size and types within limits | ✓ | ✓ |
| Template tests and exercises (V9), with the `template-check` runners in Node | — | ✓ |

- `--run` does not run the entry: the boot stays in the health run (V8). Kotlin requires the URL of a compilation
  service (`--kotlin-compiler <url>`), without a default value: the relay of the public instance only accepts the app
  ([0032](../decisions/0032-cli-archives-and-validate.md)).
- Output: list of errors and warnings with the file or field concerned; code `0` if no error, `5` otherwise.
- Known topics are read from the registry index (same `--registry` option).
