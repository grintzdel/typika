# 0023 — Hub prerendering from the build's index

**Status**: Accepted · 2026-10-12 · slice 3 of M3

## Context

The hub pages (`/`, `/templates`, the template page) must be readable without JavaScript and indexable
([ui §1](../specs/ui.md), [architecture §4](../specs/architecture.md)). The rest of the app is a SPA served by a
static shell (TanStack Start in SPA mode). The index has no longer been bundled into the client bundle since slice 2
([0022](0022-template-files-source.md)). The specs gave two routes for the template page: `/templates/<name>` in
`ui.md`, `/t/$templateId` in `architecture.md`.

## Decision

- **Route**: `/templates/$name`, where `name` is the manifest's `name`, as for `/play/$name`. The URL follows the
  list's breadcrumb.
- **TanStack Start prerendering**: the build renders `/` and `/templates`, then follows their links to
  `/templates/<name>`. A filter excludes everything else (sandbox, URLs with a query string). The `/` page now exists,
  and the crawler ignores a second identical path: the SPA shell is rendered on `/play/_shell`, an `ssr: false` route
  that responds 200. It is still written to `_shell.html`.
- **Data**: each hub route has a loader that runs a program of the `hub` module on `RegistryIndexPort`, and the loader
  returns only the model of its page. On the server side, the adapter reads the virtual module
  `virtual:typika/registry-index`. The `registry-index` Vite plugin produces it with `buildLocalIndex` from
  `registry-tools`, and refuses to load it in the client environment. On the client side, the adapter reads
  `TYPIKA_REGISTRY_INDEX_URL`, which only serves pages that are not prerendered. The same plugin emits
  `registry/index.json` in `dist/client` and serves it in development.
- **Links**: the hub's links are plain `<a>`. Each page arrives with its prerendered HTML and its data, without a
  request to the index.
- **Server**: for a path without an extension, the server serves `<path>/index.html` if it exists, with a CSP that
  allows the hashes of its own inline scripts. Otherwise it serves the shell. An `.html` file is never served at its
  own path.
- **Filters**: the prerendered list has no filter. The client applies those of the query string after hydration
  (`useHydrated`), so that the first render matches the HTML.
- **Language**: the prerendered HTML is in English. `AppProviders` then switches to the browser's language by providing
  a cloned i18n instance, held in React state. React first hydrates, with the old context, the Suspense boundaries
  still pending. If we changed the language of the shared instance, they would hydrate in the new language, hence the
  React error #418 seen during the slice.

## Consequences

- The hub pages reflect the build's index. A new template appears on the home page and the list only after a rebuild.
  Until then, its page is served by the shell and rendered on the client side.
- The index enters the server bundle (`dist/server`), which only serves prerendering. The client bundle does not
  contain it, and a production E2E test checks this.
- The development server builds the index at startup (about 3 s, `git` required), from the pinned refs of the local
  registry.
- A French-speaking visitor sees English during hydration. The `i18n` slice of M3 will decide whether prerendered pages
  per language are needed.

## Rejected alternatives

- **SSR at runtime**: the server would have to render each page and load the index. Prerendering keeps a zero server
  cost and makes static hosting possible.
- **Loader through a server function**: the pages would call the server on each navigation, and static hosting would
  no longer be enough.
- **Index in the client bundle**: that is what slice 2 removed.
- **`/t/$name`**: shorter, but the URL no longer says it belongs to the template list.
