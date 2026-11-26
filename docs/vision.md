# Vision

## The problem

Learning an architecture pattern or a design pattern today means reading an article, looking at a UML diagram and a
30-line code excerpt taken out of its context. You understand the shape, rarely the reason for it:

- You do not see **the problem** the pattern solves, because the "before" code is never shown.
- You cannot **touch** it: change it, break it, add a requirement and feel where the code resists.
- You do not see what the pattern becomes **in another language**, where it is sometimes useless.

Existing sandboxes (CodeSandbox, StackBlitz, Replit) run code but are not designed to teach. Project starters and
generators provide a structure without explaining it.

## The proposal

Typika is an **open source and free hub of runnable templates**, classified by language, framework, library and
above all **by concept**: architecture, principles, design patterns, OOP fundamentals.

Each template is a real project that you open and run in the browser, along with:

- a **base**: the same code without the pattern, to see the problem
- a **guided tour** anchored in the code
- **exercises**, whose best type is the `refactor`: a new requirement that is painful in the base, trivial once the
  pattern is in place
- **variants** in other languages, comparable side by side

The hub is the product; the sandbox is the means to explore it. A template stays useful outside Typika:
`typika create <template>` copies it into a real project.

## For whom

| Profile | Role | What they expect |
|---|---|---|
| **Intermediate developer learning architecture** | Primary target | Understand CQRS, hexagonal, SOLID, the GoF patterns through practice. |
| **Content author** (blog, docs, training) | Channel | Embed a runnable example in an article. Each embed brings learners. |
| **Developer prototyping** | Not targeted | StackBlitz and CodeSandbox serve them better. |

**Tie-break rule**: in case of conflict, the feature that serves the learner wins.

## Principles

1. **Browser first.** Code runs on the client. Only exception: a stateless compilation service when no compiler runs
   in the browser (Kotlin). The server compiles, it never executes.
2. **Zero business backend.** No database, no accounts. The hub is a static index generated from a Git
   repository.
3. **No account by default.** GitHub OAuth only to create a gist, publish or push to a repository.
4. **Teaching before exhaustiveness.** Few templates, each one excellent. No volume goal.
5. **Visible health.** Each template is tested continuously; a broken template is visible and ends up deprecated.
6. **The language is part of the lesson.** A variant is not a translation: when a pattern dissolves in a language,
   the variant shows it.
7. **Step by step.** No date and no launch; each milestone delivers something usable.

## Scope

### Included

- Languages: **TypeScript** (reference, the whole catalogue), **JavaScript**, **Go**, **Kotlin**.
- Initial catalogue: 5 architectures, 5 SOLID principles, 5 GoF design patterns, 1 OOP fundamental
  ([catalogue](specs/catalogue.md)).
- Faceted hub, template page, sandbox, guided tours, diff from the base, exercises, comparison, embed, sharing,
  export, CLI.
- Interface in English and French; template content in English.

### Excluded (V2 or never)

| Topic | Status |
|---|---|
| Python, PHP, Java, C#, Rust | Out of scope; may be reconsidered later. |
| Real-time collaboration | V2 if needed. |
| AI-generated templates | No: blurs the positioning. |
| Server-side execution | Not on the public instance; self-hostable runner in V2. |
| Composable templates (base + add-ons) | V2, as curated stacks. |
| User accounts, database | No. |

## Glossary

| Term | Definition |
|---|---|
| **Template** | Reference project described by a `typika.toml` manifest, living in a Git repository. |
| **Manifest** | Metadata, facets, runtime, commands, tour, exercises, variants, base. See [manifest](specs/manifest.md). |
| **Facet** | Classification axis: `language`, `framework`, `library`, `paradigm`, `topic`, `level`, `useCase`. |
| **Topic** | What the template teaches: `architecture/…`, `principle/…`, `design-pattern/<family>/…`, `fundamental/…`. |
| **Base** | "Before" template from which the template derives. Feeds the diff view. |
| **Variant** | The same concept in another language. Feeds the comparison. |
| **Tour** | Sequence of Markdown steps anchored on files and lines. |
| **Exercise** | `fix`: make red tests pass. `refactor`: add a requirement that is only simple after restructuring. |
| **Project** | Local copy (IndexedDB) of a template, editable. |
| **Runtime** | Execution environment: `browser-js`, `go`, `kotlin`. See [runtimes](specs/runtimes.md). |
| **Registry** | Git repository that references the published templates. See [registry](specs/registry.md). |
| **Health** | `healthy`, `degraded`, `broken`, `deprecated`, computed by the registry CI. |

## The name

Typika comes from the Greek *typos*: the imprint, the model that is reproduced, which is also the root of the word
"type". A template is exactly that. The project was first called Temenos, a name dropped because of Temenos AG, then
Palaestra, whose name was already taken on npm ([ADR 0014](decisions/0014-name-typika.md)).
