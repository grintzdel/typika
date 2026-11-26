# Spikes (M0)

A spike answers a precise question with a throwaway prototype, in a bounded time. It produces a written conclusion
(go / no-go / plan B) and, if a decision is made, an ADR in [decisions](decisions/README.md). The spike code does not
join the monorepo.

Common test set: the **Strategy** template written in M0 (about ten files, with tests), adapted to the language of the
spike.

| # | Question | Blocks |
|---|---|---|
| R1 | Can we use WebContainers? If not, what does `browser-js` alone cover? | `node` runtime |
| R2 | Does the embed work on a third-party site with COOP/COEP? | Embed (M5), origin architecture |
| R4 | Is TS IntelliSense in CodeMirror 6 good enough? | Editor choice |
| R7 | How to run Go in the browser? | `go` runtime (M4) |
| R8 | Is the Kotlin compilation service viable? | `kotlin` runtime (M6) |
| R6 | Is "Typika" free of trademarks? | All communication |

R3 (runtime weight), R5 (rot) and R9 (abuse of the compilation service) are not spikes: they are handled in the
relevant milestones ([roadmap](roadmap.md)).

---

## R1 — WebContainers

**Question**: do the license terms of the WebContainers API allow an open source, free project that third parties can
self-host? If not, what do we really need from a Node runtime?

To do:

1. Read the current license terms and, if they are ambiguous, contact the vendor. Note precisely the case
   "instance self-hosted by a third party".
2. List the templates of the [catalogue](specs/catalogue.md) that need Node (HTTP server, `npm install` of native
   packages, full Vite). Hypothesis: almost none.
3. Evaluate the alternatives: Nodebox (license terms to read as well), or extending `browser-js` with an npm package
   resolver through an ESM CDN.

Criteria:

- **Go**: compatible license, including for third-party instances.
- **Plan B**: `browser-js` + npm resolution through a CDN covers the whole catalogue; the `node` runtime is postponed.
- **No-go**: no option covers the templates that need it → we remove them from the V1 catalogue.

Output: ADR "Node runtime".

**Conclusion (2026-10-08): Plan B.** WebContainers requires a license for any production use that serves customers or
employees, and depends on StackBlitz servers. Nodebox is under a non-OSI license, restricted to non-commercial use. No
template of the catalogue needs Node: `browser-js` covers the 19 TS and JS variants. The `node` runtime leaves V1 and
schema 1. See [0017](decisions/0017-node-runtime.md).

## R2 — Embed under COOP/COEP

**Question**: can a template embedded in an iframe on a third-party domain run its runtime, given that
`SharedArrayBuffer` requires cross-origin isolation?

To do:

1. Host page on a third-party domain, without any particular headers, that embeds `/embed/<name>`.
2. Measure `crossOriginIsolated` in the iframe for each combination: `COEP: require-corp` vs `credentialless`,
   `allow="cross-origin-isolated"` attribute on the iframe.
3. Check which runtimes really need `SharedArrayBuffer` (does esbuild-wasm in a worker need it?).
4. Test Chrome, Firefox, Safari.

Criteria:

- **Go**: the embed runs `browser-js` in all three browsers without requiring headers from the host page.
- **Plan B**: the embed only runs the runtimes without `SharedArrayBuffer`; the others offer "Open in
  Typika".

Output: ADR "Isolation and embed", update of [security](specs/security.md) and [hosting](guides/hosting.md).

**Conclusion (2026-10-08): Go for `browser-js`, Plan B for the `SharedArrayBuffer` runtimes.** No isolation is
possible in a third-party page, but `browser-js` does not need it: bundle, tests and hard kill work on Chromium and
WebKit. The embed no longer sets COOP or COEP; COEP `require-corp` everywhere else. Firefox and real Safari still have
to be checked by hand. See [0016](decisions/0016-isolation-and-embed.md).

## R4 — TypeScript in CodeMirror 6

**Question**: can we offer completion, diagnostics and type hover of sufficient quality in CodeMirror 6?

To do:

1. TypeScript language service in a worker, plugged into CodeMirror 6 (existing community integrations to
   evaluate).
2. 20-file template with cross imports.
3. Measure: startup time, completion latency, downloaded weight, mobile behavior.
4. Compare with Monaco on the same measurements.

Criteria:

- **Go**: completion < 200 ms after startup, correct multi-file diagnostics, reasonable weight for the embed.
- **No-go**: we switch to Monaco, accepting a heavier embed.

Output: ADR "Editor" (confirms or supersedes [0008](decisions/0008-codemirror-6.md)).

**Conclusion (2026-10-08): Go.** Median completion at 31 ms on desktop (Monaco: 130 ms), correct multi-file
diagnostics, 140 KiB for the editor alone. In-house TypeScript adapter in M1. See
[0015](decisions/0015-editor.md).

## R7 — Go in the browser

**Question**: interpreter or compiler?

| Option | To measure |
|---|---|
| Yaegi (Go interpreter written in Go) compiled to WASM | Coverage of the language used by the catalogue (interfaces, generics, goroutines, `testing`), weight, speed |
| Full Go toolchain compiled to WASM | Weight, first compilation time, feasibility of `go test` |

To do: run the Go variant of Strategy and its tests with each option; produce an output compatible with
`go test -json` for the mapping to test events ([runtimes](specs/runtimes.md)).

Criteria:

- **Go**: the Go variants of the catalogue run with their tests, acceptable initial load with an indicator.
- **Plan B**: restrict the subset of Go used by the templates to the capabilities of the chosen option, and
  document it in the [authoring guide](guides/template-authoring.md).

Output: ADR "Go runtime".

**Conclusion (2026-10-08): Go, option B.** The official Go toolchain compiled to WASM reproduces `go test`
identically, without `SharedArrayBuffer`, so in the embed too: test build in 250 to 300 ms on desktop (Chromium,
WebKit), 1.2 s at CPU ×4, for 11.7 MB in brotli on first load. Yaegi is rejected: four defects on
`strategy-go`, including a wrong output without an error. Firefox still has to be checked by hand. See
[0018](decisions/0018-go-runtime.md).

## R8 — Kotlin compilation service

**Question**: can `kotlin-compiler-server` serve as a stateless compilation service, to JS or Wasm, at an
acceptable cost on a VPS?

To do:

1. Confirm the license of the project.
2. Deploy it in a container; compile the Kotlin variant of Strategy to Kotlin/JS and Kotlin/Wasm.
3. Run the result and the `kotlin.test` tests in the browser.
4. Measure: container RAM, cold and warm compilation latency, throughput under load.
5. In parallel, test `kotlinc` in the browser through a WASM JVM (CheerpJ): weight, time, license.

Criteria:

- **Go**: compilation < 3 s warm, footprint compatible with the VPS, compatible license.
- **Alternative**: `kotlinc` in the browser is acceptable → no more service, "browser first" principle
  intact.
- **No-go**: Kotlin leaves the V1 scope.

Output: ADR "Kotlin runtime" (confirms or supersedes [0002](decisions/0002-kotlin-compilation-service.md)).

**Conclusion (2026-10-08): Go, with an in-house service.** `kotlin.test` compiled to JS or Wasm runs in the
browser with the same results as on the JVM; warm, `strategy-kotlin` compiles in 0.9 to 1.3 s on 2 vCPU and
1 GiB, for 656 MiB at peak. `kotlin-compiler-server` (Apache 2.0) does not start without a patch, has no `kotlin-test`
in JS or Wasm and runs the JUnit tests on the server: a service of about a hundred lines on
`kotlin-compiler-embeddable` replaces it. JS target only in V1. CheerpJ is rejected because of its license. Firefox
still has to be checked by hand. See [0019](decisions/0019-kotlin-runtime.md).

## R6 — Name

**Question**: is "Typika" free of trademarks? Temenos (Temenos AG) then Palaestra (taken on npm)
were dropped ([ADR 0014](decisions/0014-name-typika.md)).

Done: `typika` free on npm, `typika.dev` free, no `typika` account or organization on GitHub;
no software product with the same name found by web search (the closest: Typic, a mobile photo editor).

On 2026-11-20, the `typika` organization is found to be taken on GitHub, since 2026-10-12, by a third party: to add to
the research. The project takes `typika-app` ([ADR 0033](decisions/0033-github-org-typika-app.md)).

To do: search for registered trademarks in classes 9 and 42 (EUIPO, USPTO, INPI); reserve the domain,
the organization and the package.

Output: ADR 0014 confirmed, or a fallback name (Patternhall, Deigmata) and a rename before M1.
