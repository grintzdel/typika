import { RuntimeProcessError, type RuntimeSession } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schedule from 'effect/Schedule'
import { describe, expect, it } from 'vitest'

import { connectLspClient } from '../__tests__/lsp-client.ts'
import { projectPath, strategyGoProject } from '../__tests__/template.factory.ts'
import { isAssetManifest, isGoplsAssetManifest } from '../domain/go-assets.domain-model.ts'
import { makeGoRuntime } from './go-runtime.ts'

const fetchJson = async (url: URL): Promise<unknown> => (await fetch(url)).json()

const manifestUrl = new URL('../../assets/go1.24.5/manifest.json', import.meta.url)
const goplsManifestUrl = new URL('../../assets/gopls/gopls-manifest.json', import.meta.url)
const [manifest, goplsManifest] = await Promise.all([fetchJson(manifestUrl), fetchJson(goplsManifestUrl)])
if (!isAssetManifest(manifest)) throw new Error(`Malformed ${manifestUrl.href}`)
if (!isGoplsAssetManifest(goplsManifest)) throw new Error(`Malformed ${goplsManifestUrl.href}`)

const runtime = makeGoRuntime({
  assetsUrl: new URL('.', manifestUrl).href,
  manifest,
  gopls: { assetsUrl: new URL('.', goplsManifestUrl).href, manifest: goplsManifest },
})

const QUOTE_TEST = 'internal/checkout/quote_test.go'
const REFERENCES = 6
const SETTLE_TIMEOUT = 180_000
const project = strategyGoProject()
const source = project.files.get(projectPath(QUOTE_TEST))
const lines = (typeof source === 'string' ? source : '').split('\n')

const after = (needle: string) => {
  const line = lines.findIndex((text) => text.includes(needle))
  return { line, character: (lines[line]?.indexOf(needle) ?? 0) + needle.length }
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const arrayOf = (value: unknown): ReadonlyArray<unknown> => {
  if (Array.isArray(value)) return value
  return isRecord(value) && Array.isArray(value.items) ? value.items : []
}

const fieldsOf = (value: unknown, field: string) =>
  arrayOf(value).flatMap((item) => (isRecord(item) && typeof item[field] === 'string' ? [item[field]] : []))

const settled = <E>(answer: Effect.Effect<unknown, E>, isSettled: (found: unknown) => boolean) =>
  answer.pipe(
    Effect.filterOrFail(isSettled, () => new Error('gopls has not settled yet')),
    Effect.retry({
      while: (error) => !(error instanceof RuntimeProcessError && error.cause === 'gopls restarted'),
      schedule: Schedule.spaced('1 second'),
      times: 150,
    })
  )

const withLanguageServer = <A, E>(
  use: (
    lsp: Effect.Success<ReturnType<typeof connectLspClient>>,
    session: RuntimeSession,
    uri: string
  ) => Effect.Effect<A, E>
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const session = yield* runtime.boot(project)
        const server = session.languageServer
        if (server === undefined) throw new Error('The Go runtime offers no language server')
        const lsp = yield* connectLspClient(server)
        yield* lsp.request('initialize', {
          processId: null,
          rootUri: server.rootUri,
          capabilities: {},
          workspaceFolders: [{ uri: server.rootUri, name: 'strategy-go' }],
        })
        yield* lsp.notify('initialized', {})
        const uri = `${server.rootUri}/${QUOTE_TEST}`
        yield* lsp.notify('textDocument/didOpen', {
          textDocument: { uri, languageId: 'go', version: 1, text: lines.join('\n') },
        })
        return yield* use(lsp, session, uri)
      })
    )
  )

describe('go runtime language server', () => {
  it('completes, finds the definition and the references with gopls', { timeout: SETTLE_TIMEOUT }, async () => {
    const answers = await withLanguageServer((lsp, _session, uri) =>
      Effect.all({
        completion: settled(
          lsp.request('textDocument/completion', {
            textDocument: { uri },
            position: after('quoteFor(t, order, checkout.'),
          }),
          (found) => fieldsOf(found, 'label').includes('Standard')
        ),
        definition: settled(
          lsp.request('textDocument/definition', {
            textDocument: { uri },
            position: after('quoteFor(t, order, checkout.Stan'),
          }),
          (found) => fieldsOf(found, 'uri').length > 0
        ),
        references: settled(
          lsp.request('textDocument/references', {
            textDocument: { uri },
            position: after('quoteFor(t, order, checkout.Stan'),
            context: { includeDeclaration: true },
          }),
          (found) => fieldsOf(found, 'uri').length >= REFERENCES
        ),
      })
    )

    expect(fieldsOf(answers.completion, 'label')).toContain('Standard')
    expect(fieldsOf(answers.definition, 'uri')).toEqual([
      expect.stringMatching(/\/internal\/checkout\/shipping_option\.go$/),
    ])
    expect(fieldsOf(answers.references, 'uri')).toHaveLength(REFERENCES)
  })

  it('sees the files written to the session', { timeout: SETTLE_TIMEOUT }, async () => {
    const labels = await withLanguageServer((lsp, session, uri) =>
      session.fs.writeFile(projectPath('internal/checkout/express.go'), 'package checkout\n\nfunc Express() {}\n').pipe(
        Effect.andThen(
          settled(
            lsp.request('textDocument/completion', {
              textDocument: { uri },
              position: after('quoteFor(t, order, checkout.'),
            }),
            (found) => fieldsOf(found, 'label').includes('Express')
          )
        ),
        Effect.map((completion) => fieldsOf(completion, 'label'))
      )
    )

    expect(labels).toContain('Express')
  })
})
