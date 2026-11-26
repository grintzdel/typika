# Interface

Status: draft · 2026-10-08 · See also: [registry](registry.md), [sharing-and-cli](sharing-and-cli.md),
[runtimes](runtimes.md), [catalogue](catalogue.md)

Functional specification of each screen. Visual design is not covered here.

## 1. Routes

| Route | Screen |
|---|---|
| `/` | Hub home |
| `/templates` | Faceted list, filters in the query string |
| `/templates/<name>` | Template page |
| `/play/<name>` | Sandbox opened from a template (`<name>` = manifest `name`, e.g. `strategy-ts`) |
| `/play/<name>?exercise=<id>` | Sandbox in exercise mode |
| `/play/<name>?panel=diff` | Sandbox opened on the diff since the base |
| `/compare/<name>?a=<lang>&b=<lang>` | Comparison of two variants |
| `/projects` | My local projects |
| `/p/<projectId>` | Local project |
| `/s#<payload>` | Project shared by URL |
| `/g/<gistId>` | Project shared by gist |
| `/embed/<name>` | Iframe embed |

The hub pages (`/`, `/templates`, `/templates/<name>`) are prerendered and readable without JavaScript. The others are
application screens.

## 2. Cross-cutting states

These states apply to every screen that loads a template or a runtime.

| State | Behavior |
|---|---|
| **Loading the index** | Card skeletons; never a blank screen. |
| **Loading a heavy runtime** (Go, Kotlin) | Progress bar with downloaded size / total size, runtime name, a "cached for next time" note. The editor is usable read-only during loading; Run and Test are disabled with the reason in a tooltip. |
| **Runtime unavailable** | Incompatible browser (no WASM, no cross-origin isolation) or Kotlin compilation service disabled: explicit message, reading the code and the tour still possible, export button. |
| **Loading error** | Message, readable cause (network, ref not found, invalid manifest), Retry button. |
| **`degraded` template** | Orange badge on card and page; no restriction. |
| **`broken` template** | Red banner on the template page and the sandbox: "This template currently fails its automatic check", link to the CI run. Can still be opened. |
| **`deprecated` template** | Absent from default lists; page reachable with a banner, "See alternatives" button (same topic). |
| **Offline** | Discreet banner. Local projects and cached runtimes usable; the hub shows the last cached index. |

## 3. Home — `/`

Goal: bring the learner to a concept in two clicks.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ typika            Templates   My projects            [🔍 Search      /] │
├──────────────────────────────────────────────────────────────────────────┤
│  Learn architecture by running code.                                     │
│  [ Browse the templates ]                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Architecture                                                   See all → │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│ │ Hexagonal  │ │ CQRS       │ │ Event      │ │ Outbox     │  …           │
│ │ TS Go Kt   │ │ TS Go Kt   │ │ sourcing   │ │ TS Go Kt   │              │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘              │
│ SOLID principles                                               See all → │
│ [SRP] [OCP] [LSP] [ISP] [DIP]                                            │
│ Design patterns    Creational · Structural · Behavioral        See all → │
│ [Strategy] [Observer] [Decorator] [Factory Method] [Adapter]             │
│ OOP fundamentals                                                         │
│ [Composition vs inheritance]                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ Resume: strategy-ts · modified 2 h ago                    (if projects)  │
└──────────────────────────────────────────────────────────────────────────┘
```

- One card per **concept**, not per template: it lists the available languages; click → page of the reference TS
  template, with a language selector. A concept groups a template and its variants; the card carries the label of its
  first topic. The sections follow the order of the registry vocabulary.
- Each section leads to the list filtered on its category ("See all") or on one of its families.
- "Resume" only appears if local projects exist; it shows the last 3. It is read after hydration, the prerendered
  page does not contain it.

## 4. List — `/templates`

- Faceted filters: `topic` (tree by category then family), `language`, `paradigm`, `level`, `framework`,
  `library`, `useCase`, health (`healthy`/`degraded` checked by default, `broken` and `deprecated` unchecked),
  `official`/`community` category.
- Each filter is reflected in the query string (`?topic=design-pattern/behavioral&language=go&level=intermediate`);
  the URL is shareable and the back button restores the state. Several values of a facet are separated by commas and
  combine with OR; facets combine with AND. A topic filters its branch of the tree. The prerendered HTML has no
  filter: the query string applies after hydration.
- Delivered in slices 3, 4 and 6 of M3: the facets, the search, the counters, the sorting, the empty state and the
  health facet. A template that was never checked passes the default health filter, and the query string keeps
  `health` only if it differs from the default.
- Full-text search (`?q=`) in the header field, present on every hub page, combined with the facets. It covers
  `search.text` of the index ([registry §3](registry.md)). Each typed word must start a word of the text. On the list,
  the query string follows the typing without creating a history entry. Elsewhere, and without JavaScript, the field
  submits a form to `/templates?q=…`.
- Counters per facet value: the number of results if this value were added, given the search and the other facets. An
  unchecked value at 0 is disabled.
- Sorting (`?sort=`): relevance (default during a search; a whole word counts more than a word prefix), catalogue order
  (default otherwise: the order of the vocabulary's topics, then of the languages), recently updated. The default sort
  does not appear in the URL.
- **Empty state**: "No template matches", the active search and filters with individual removal, Reset button.

## 5. Template page — `/templates/<name>`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Templates / Design patterns / Behavioral                               │
│ Strategy                                    ● healthy   official  MIT-0  │
│ Replace a growing switch with interchangeable behaviours.                │
│ Language: [TypeScript ▾]   Level: Intermediate                           │
│ [ ▶ Open in the sandbox ]  [ Compare ▾ ]  [ Exercises ▾ ]                │
├───────────────────────────────────────────┬──────────────────────────────┤
│ What you will see (tour)                  │ Topics                       │
│  1. The growing switch                    │  design-pattern/behavioral/… │
│  2. Extracting the strategy               │  principle/open-closed       │
│  3. Adding a behaviour without editing    │ Variants                     │
│ Before / after                            │  Kotlin · Go                 │
│  Base: strategy-base   [View the diff]    │ Related                      │
│ Exercises                                 │  OCP · Hexagonal             │
│  ◇ add-shipping-rule (refactor)           │ Use outside Typika           │
│                                           │  npx typika create strat… ⧉ │
│                                           │ Embed                     ⧉  │
│                                           │ Maintainers · License · Ref  │
└───────────────────────────────────────────┴──────────────────────────────┘
```

- The language selector navigates to the variant (`/templates/<variant-name>`).
- "Compare" offers the available variants → `/compare/<name>?a=<lang>&b=<lang>`.
- "View the diff" opens the sandbox on the diff view since the base (§8).
- One-click copy of the CLI command and of the embed snippet, with an accessible confirmation.
- If `parent` exists: link to the parent and "diff with the parent".
- Delivered in slice 3 of M3: the breadcrumb, the language selector (links, usable without JavaScript), the tour, the
  base with "View the diff", the exercises, the topics, the variants, the maintainers, the license and the ref.
  Comparison is delivered in slice 3 of M4: a "Compare with <language>" link per variant present in the index, which
  keeps the current template on the left. Copying the embed snippet is delivered in slice 4 of M5. Still to come: the
  CLI command, the related templates and the diff with the parent. The health badge and
  banners are delivered in slice 6 (§2).

## 6. Sandbox — `/play/<name>`, `/p/<projectId>`, `/s#…`, `/g/<gistId>`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ strategy-ts ▾  ● Modified     [▶ Run] [✓ Tests] [⟲ Reset] [Share ▾] [⋯]  │
├────────────┬──────────────────────────────────────┬──────────────────────┤
│ src/       │ src/pricing/strategy.ts          ✕   │ Tour  Preview  Diff  │
│  domain/   │  1 export interface PricingStrat…    │ Step 2 / 5           │
│  pricing/  │  2   price(order: Order): Money      │ Extracting the       │
│  ●strat…   │  3 }                                 │ strategy             │
│ tests/     │ ▌4 export class FlatRate implem…     │ The switch in …      │
│ tour/      │ ▌5   …                               │                      │
│            │                                      │ [← Previous] [Next →]│
├────────────┴──────────────────────────────────────┴──────────────────────┤
│ Console │ Tests (12 ✓ 1 ✕)                                               │
│ ✕ pricing › applies shipping rule   expected 12 to be 15  tests/pri…:22  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Layout

- Three resizable columns: file tree, tabbed editor, side panel (Tour, Preview, Diff, Exercise). Bottom panel:
  Console, Tests.
- Each panel is collapsible; the layout is remembered per device.
- Default side panel: Tour if the template has one, otherwise Preview if the runtime exposes one.

### 6.2 Files and editor

- Create, rename, delete, move files; ● indicator on modified files.
- Typika-specific files (`typika.toml`, `tour/`) are visible but grouped and read-only by
  default.
- Local autosave on every change (debounced), no Save button. Opening `/play/<name>` creates a local project on the
  first change; before that, nothing is persisted. Coming back to `/play/<name>` reopens the most recent project of
  this template; Reset brings it back to the original files.

### 6.3 Running and tests

- **Run** launches `commands.start`; output in Console. A new Run interrupts the previous one.
- **Tests** launches `commands.test`; the Tests panel shows the suites / tests tree, duration, status, failure
  message; click on a test → opens the file at the line of the assertion.
- A "rerun on save" mode can be turned on for tests.
- Compilation errors (TS, Go, Kotlin): underlined in the editor and listed in Console.

### 6.4 Reset and diff of my changes

- **Reset**: restores the files from the original pinned ref, after a confirmation listing the modified files.
  Reset of a single file from its context menu.
- **Diff → My changes**: file-by-file diff between the original ref and the current state, side by side or
  unified.

## 7. Tour

- List of steps in the Tour panel; Previous/Next navigation and direct access through the list.
- Opening a step opens the anchored file, scrolls to the range and highlights it (left border + light
  background). Several anchors per step: tabs opened in order, the first one active.
- If the user has modified the file and the range no longer matches, the step says so ("the code has changed
  since this tour") and offers to open the original version read-only.
- The current step is in the URL (`#step=<id>`): shareable, restored on reload.
- A step's links to another template open its page in a new tab.

## 8. Diff since the base

- Reachable from the template page and from the sandbox's Diff tab ("Since the base").
- List of the files added / modified / deleted between `base` and the template, then a side-by-side diff.
- Annotations: if a tour step anchors a range present in the diff, a marker links to the step.
- Read-only. An "Open the base" button opens the base in a separate sandbox.
- In the sandbox, the Diff tab lists the files; each one opens in an editor tab, to get the width of a side-by-side
  view ([0021](../decisions/0021-diff-engine.md)).

## 9. Comparison — `/compare/<name>?a=<lang>&b=<lang>`

- Two columns: each one a read-only editor with its reduced tree, and at the top the language and the name of the
  variant.
- A single shared Tour panel. Steps are synchronized **by step id**: going to the `extract-strategy` step
  opens in each column the file and the range anchored by the step with the same id.
- Step missing on one side: grayed-out column with "This step has no equivalent in <language>", and the
  variant-specific text if it exists (case where the pattern dissolves into the language).
- `a` and `b` missing: `a` = TS, `b` = first available variant. Unknown language: message and selectors.
- "Open in the sandbox" on each column.
- Delivered in slice 3 of M4. `<name>` is any variant of the concept; the languages offered are its own and those
  of its `[variants]` present in the index. The Tour panel shows, for the current step, the text of each variant
  under the name of its language: the title comes from column `a`, and a step specific to `b` is inserted after the one
  that precedes it in its tour. A step present on both sides without code (`the-problem`, `trade-offs`) leaves the
  columns as they are. The column is grayed out only if the step is missing, or if it has no code while the
  other side has some (the pattern has dissolved): its text then shows in the column. Below 768 px, a toggle
  shows one panel at a time: column `a`, column `b` or Tour.

## 10. Exercises — `/play/<name>?exercise=<id>`

- The project starts in the initial state of the exercise; the side panel shows the Exercise tab.
- Content: title, kind (`fix` / `refactor`), statement, target tests, progress (`3 / 5 target tests green`).
- **fix**: goal = the target tests pass without breaking the others.
- **refactor**: goal = the tests of the new requirement pass; the statement explains why it is painful in
  the current state. Validation by the tests only; the structure of the code is not graded.
- **Validation**: automatic on every test run; when everything is green, a success message and a link to
  the next exercise or the related concept. "Solved" state remembered locally.
- **Hints**: revealed one by one, in the order defined by the author.
- **Solution**: button available at any time, with a confirmation; opens the solution as a diff against the current
  code, without overwriting it. A separate button applies it.
- Restarting the exercise = reset to the initial state of the exercise.

## 11. My projects — `/projects`

- List: name, origin template, language, modification date, exercise status if any.
- Actions: open, rename, duplicate, export (zip), share, delete (confirmation).
- Space used indicator and a warning when nearing the quota (see [sharing-and-cli](sharing-and-cli.md)).
- **Empty state**: an explanation that projects stay in this browser, a link to the hub.
- **New project**: button at the top of the page, which opens a tabbed dialog. "Blank": name and language
  (TypeScript, JavaScript, Go, Kotlin); the skeleton has a `typika.toml`, an entry point that runs and a test that
  passes. "Library": search in the catalogue templates (role `template`), the name follows the title as long as it is
  not edited. "From a URL": `github:owner/repo/path[@ref]`, the GitHub URL of a folder (`/tree/<ref>/…`) or
  the link of a `typika.toml` (`/blob/…`, `raw.githubusercontent.com`); a catalogue reference is read from the
  registry, any other one through the GitHub API (with the token of the GitHub session if there is one) and pinned to
  the commit read. "Import a file": a lone `typika.toml` gets the skeleton of its language (and an entry point at
  `runtime.entry`), a zip exported by Typika keeps its files (5 MB at most). The manifest problems are listed
  in the dialog. The created project is an independent copy (origin `personal`, see
  [sharing-and-cli](sharing-and-cli.md)); it opens right away on `/p/<projectId>`.
- A template page offers "Start a project from it": `/projects?new=<name>` opens the dialog on that tab, with
  this template chosen.

## 12. Shared projects — `/s#<payload>`, `/g/<gistId>`

- Opened read-write in an **ephemeral** sandbox: nothing is saved until the user clicks "Save in my projects" or
  modifies a file (automatic creation, signaled).
- Banner: "Shared project, based on <template>" with a link to the origin template if it is known.
- Invalid payload or unknown version, gist not found: error screen with the cause and a link to the hub.

## 13. Embed — `/embed/<name>`

Reduced UI: editor + output (Console or Tests), minimal bar with Run, Tests and "Open in Typika".

| Parameter | Values | Default |
|---|---|---|
| `file` | path | `runtime.entry` |
| `lines` | `L10-L24` | — (highlights the range) |
| `tour-step` | step id | — (shows the step above the editor) |
| `panel` | `console`, `tests`, `preview`, `none` | `console` |
| `readonly` | `true`, `false` | `false` |
| `run` | `auto`, `click` | `click` |
| `theme` | `light`, `dark`, `auto` | `auto` |
| `lang` | `en`, `fr` | browser language |
| `height` | — | not supported: the height is that of the iframe |

- The runtime starts only on the first interaction (or `run=auto`), so as not to load megabytes into a blog page
  when it opens. `run=auto` is ignored for a Go template, which downloads 12 MB on the first run
  ([0031](../decisions/0031-embed-runtimes.md)).
- The editor opens without the TypeScript language service; IntelliSense loads on demand
  ([0015](../decisions/0015-editor.md)).
- A runtime that requires cross-origin isolation (`SharedArrayBuffer`) does not start in an embed: the bar offers
  "Open in Typika" instead of Run and Tests ([0016](../decisions/0016-isolation-and-embed.md)). No V1 runtime
  is in this case.
- Under a host page that is not a secure context (`http`), no runtime starts: the bar offers
  "Open in Typika" and gives the reason ([0031](../decisions/0031-embed-runtimes.md)).
- No local persistence in the embed; "Open in Typika" transfers the current state through a URL share.

### postMessage

Sending origin: Typika's. The parent must check `event.origin`.

| Direction | Message | Use |
|---|---|---|
| embed → parent | `{ type: 'typika:ready' }` | Embed ready. |
| embed → parent | `{ type: 'typika:resize', height }` | Desired content height, if the parent wants to adapt the iframe. |
| embed → parent | `{ type: 'typika:test-result', passed, failed }` | End of a test run. |
| parent → embed | `{ type: 'typika:goto-step', id }` | Change the tour step. |
| parent → embed | `{ type: 'typika:set-theme', theme }` | Follow the theme of the host site. |

No message lets the parent read or write the code.

## 14. Keyboard shortcuts

`Mod` = Cmd on macOS, Ctrl elsewhere. List shown by `?`.

| Shortcut | Action | Scope |
|---|---|---|
| `/` | Focus search | Hub |
| `Mod+K` | Palette: templates, project files, commands | Everywhere |
| `Mod+Enter` | Run | Sandbox |
| `Mod+Shift+Enter` | Run the tests | Sandbox |
| `Mod+P` | Open a file | Sandbox |
| `Mod+B` | Show / hide the tree | Sandbox |
| `Mod+J` | Show / hide the bottom panel | Sandbox |
| `Alt+→` / `Alt+←` | Next / previous tour step | Sandbox, comparison |
| `Mod+Shift+D` | Diff tab | Sandbox |
| `Esc` | Close palette / dialog; leave the editor (see §15) | Everywhere |

Shortcuts must not override those of the editor or the browser; conflicts to check at implementation
time. `Alt+→` / `Alt+←` do not change the step when the focus is in the editor or an input field (CodeMirror uses
them to move by one word on macOS); elsewhere, they replace the browser's "previous page" on Windows and
Linux.

## 15. Accessibility

Target: WCAG 2.2 level AA.

- **Keyboard**: everything is usable without a mouse. The editor captures Tab for indentation; `Esc` then `Tab` leaves
  it (behavior to document in the help).
- **Focus order**: tree → editor → side panel → bottom panel; skip links at the top of the page.
- **Screen readers**: named regions (landmarks); test results and the end of a Run announced through a polite
  `aria-live` region; a tour step change announced with its title; health badges with text, not only
  a color.
- **Contrast**: AA in light and dark themes, including syntax highlighting and tour highlighting.
- **Motion**: animated scrolling disabled if `prefers-reduced-motion`.
- **Diff**: additions / deletions also distinguished by a sign (`+` / `-`), not only by color.
- Browser zoom up to 200% without loss of function.

## 16. Responsive and mobile

| Width | Behavior |
|---|---|
| ≥ 1024 px | Full layout. |
| 640-1023 px | Tree in a drawer; side panel as a tab next to the editor. |
| < 640 px | One panel at a time, tab navigation at the bottom: Code, Tour, Output. |

- **Mobile**: hub, template page, tour, comparison (one panel at a time with a toggle: each column, then the
  tour) and diff are fully
  usable.
- **Limited editing**: editing is possible but not optimized; a message suggests a wider screen for the
  exercises. Heavy runtimes: a download size warning before loading on a mobile network if the
  browser exposes the information.

## 17. Internationalization

- UI in English and French; language detected from the browser, changeable in the menu, remembered locally.
- Template content (titles, summaries, tours, statements) stays in English in V1; in the French UI, a discreet
  label says so on the template page.
- Dates and numbers formatted according to the chosen language.
- No hard-coded string in components; translation keys per module.
- Delivered in slice 5 of M3: the language menu is in the hub header and in the sandbox toolbar. It stays
  disabled until hydration, and the choice is kept in `localStorage` (`typika:language`), ahead of the browser
  language. Numbers go through the i18next `number` formatter, dates through `datetime`, in UTC. The template page
  shows its update date, and the title, the summary and the tour carry `lang="en"`.
