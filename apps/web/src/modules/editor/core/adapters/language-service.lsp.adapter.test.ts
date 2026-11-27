import { RuntimeProcessError, type LanguageServer, type LanguageServerEvent } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { describe, expect, it } from 'vitest'

import type { LanguageServiceFiles } from '../domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../ports/language-service.port.ts'
import { connectLanguageServer } from './language-service.lsp.adapter.ts'

type RpcMessage = {
  readonly id?: number
  readonly method?: string
  readonly params?: unknown
}

type Answer = (method: string, params: unknown) => unknown

const ROOT = 'file:///work'

const MAIN = ['package main', '', 'var /*😀*/ total = 1', '', 'func main() {', '\tprintln(total)', '}', ''].join('\n')

const FILES: LanguageServiceFiles = { 'go.mod': 'module shop\n', 'main.go': MAIN }

const range = (line: number, from: number, to: number) => ({
  start: { line, character: from },
  end: { line, character: to },
})

const makeFakeGopls = (answer: Answer = () => null, { failOnConnect = false } = {}) => {
  const received: Array<RpcMessage> = []
  const outbox: Array<LanguageServerEvent> = []
  let push: ((event: LanguageServerEvent) => void) | undefined
  const emit = (event: LanguageServerEvent) => (push === undefined ? void outbox.push(event) : push(event))
  const server: LanguageServer = {
    rootUri: ROOT,
    connect: failOnConnect
      ? Stream.fail(new RuntimeProcessError({ cause: 'gopls stopped 2 times' }))
      : Stream.callback<LanguageServerEvent>((queue) =>
          Effect.sync(() => {
            push = (event) => Queue.offerUnsafe(queue, event)
            for (const event of outbox.splice(0)) push(event)
          })
        ),
    send: (raw) =>
      Effect.sync(() => {
        const message = JSON.parse(raw) as RpcMessage
        received.push(message)
        if (message.id === undefined || message.method === undefined) return
        const result = answer(message.method, message.params)
        emit({ _tag: 'Message', message: JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) })
      }),
  }
  const notify = (method: string, params: unknown) =>
    emit({ _tag: 'Message', message: JSON.stringify({ jsonrpc: '2.0', method, params }) })
  const methods = () => received.map((message) => message.method)
  return { server, received, methods, notify, restart: () => emit({ _tag: 'Restarted' }) }
}

const withSession = <A, E>(
  gopls: ReturnType<typeof makeFakeGopls>,
  use: (session: LanguageServiceSession) => Effect.Effect<A, E>
) => Effect.runPromise(Effect.scoped(Effect.flatMap(connectLanguageServer(gopls.server, FILES), use)))

const offsetOf = (text: string, needle: string) => text.indexOf(needle)

describe('connectLanguageServer', () => {
  it('initializes gopls on the root of the project before the session is ready', async () => {
    const gopls = makeFakeGopls()

    await withSession(gopls, () => Effect.void)

    expect(gopls.received[0]).toMatchObject({
      method: 'initialize',
      params: { rootUri: ROOT, workspaceFolders: [{ uri: ROOT }] },
    })
    expect(gopls.methods()[1]).toBe('initialized')
  })

  it('fails to start when gopls is unavailable', async () => {
    const gopls = makeFakeGopls(undefined, { failOnConnect: true })

    const exit = await Effect.runPromiseExit(Effect.scoped(connectLanguageServer(gopls.server, FILES)))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'EditorLanguageServiceError' },
    })
  })

  it('opens a Go file on its first update, then sends its changes with a new version', async () => {
    const gopls = makeFakeGopls()

    await withSession(gopls, (session) =>
      Effect.gen(function* () {
        yield* session.updateFile('main.go', MAIN)
        yield* session.updateFile('main.go', `${MAIN}// end\n`)
        yield* session.updateFile('README.md', '# Shop')
        yield* session.removeFile('main.go')
      })
    )

    expect(gopls.received.slice(2)).toEqual([
      {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: { textDocument: { uri: `${ROOT}/main.go`, languageId: 'go', version: 1, text: MAIN } },
      },
      {
        jsonrpc: '2.0',
        method: 'textDocument/didChange',
        params: { textDocument: { uri: `${ROOT}/main.go`, version: 2 }, contentChanges: [{ text: `${MAIN}// end\n` }] },
      },
      {
        jsonrpc: '2.0',
        method: 'textDocument/didClose',
        params: { textDocument: { uri: `${ROOT}/main.go` } },
      },
    ])
  })

  it('lists the completions from the start of their edit, with their details and import edits', async () => {
    const line = 'import "fmt"'
    const text = `package main\n\n${line}\n\nfunc main() { strings.Re }\n`
    const position = offsetOf(text, 'strings.Re') + 'strings.Re'.length
    const gopls = makeFakeGopls((method) =>
      method === 'textDocument/completion'
        ? {
            isIncomplete: false,
            items: [
              {
                label: 'Repeat',
                kind: 3,
                sortText: '00000',
                detail: 'func(s string, count int) string',
                documentation: { kind: 'markdown', value: 'Repeat returns count copies of s.' },
                textEdit: { range: range(4, 22, 24), newText: 'Repeat' },
                additionalTextEdits: [{ range: range(2, 7, 12), newText: '"fmt"\n\t"strings"' }],
              },
            ],
          }
        : null
    )

    const answers = await withSession(gopls, (session) =>
      Effect.gen(function* () {
        yield* session.updateFile('main.go', text)
        const list = yield* session.completions('main.go', position)
        const item = list?.items[0]
        if (item === undefined) return { list }
        return {
          list,
          details: yield* session.completionDetails('main.go', position, item),
          changes: yield* session.completionChanges('main.go', position, item),
        }
      })
    )

    expect(answers.list).toEqual({
      from: offsetOf(text, 'Re }'),
      items: [{ label: 'Repeat', kind: 'function', sortText: '00000', source: undefined, hasAction: true }],
    })
    expect(answers.details).toEqual({
      signature: 'func(s string, count int) string',
      documentation: 'Repeat returns count copies of s.',
    })
    expect(answers.changes).toEqual([
      { from: offsetOf(text, '"fmt"'), to: offsetOf(text, '"fmt"') + 5, insert: '"fmt"\n\t"strings"' },
    ])
  })

  it('splits a hover into its signature and its documentation', async () => {
    const gopls = makeFakeGopls((method) =>
      method === 'textDocument/hover'
        ? {
            contents: { kind: 'markdown', value: '```go\nvar total int\n```\n\nThe total of the order.' },
            range: range(2, 11, 16),
          }
        : null
    )

    const info = await withSession(gopls, (session) =>
      session.updateFile('main.go', MAIN).pipe(Effect.andThen(session.quickInfo('main.go', offsetOf(MAIN, 'total'))))
    )

    expect(info).toEqual({
      from: offsetOf(MAIN, 'total'),
      to: offsetOf(MAIN, 'total') + 5,
      signature: 'var total int',
      documentation: 'The total of the order.',
    })
  })

  it('cuts the signature around its parameters', async () => {
    const gopls = makeFakeGopls((method) =>
      method === 'textDocument/signatureHelp'
        ? {
            signatures: [
              {
                label: 'quoteFor(order Order, option ShippingOption) Quote',
                documentation: { kind: 'markdown', value: 'quoteFor prices an order.' },
                parameters: [{ label: [9, 20] }, { label: [22, 43] }],
              },
            ],
            activeSignature: 0,
            activeParameter: 1,
          }
        : null
    )

    const help = await withSession(gopls, (session) => session.signatureHelp('main.go', 0))

    expect(help).toEqual({
      prefix: 'quoteFor(',
      parameters: ['order Order', 'option ShippingOption'],
      separator: ', ',
      suffix: ') Quote',
      activeParameter: 1,
      documentation: 'quoteFor prices an order.',
    })
  })

  it('finds the definition in the project, counting positions in UTF-16', async () => {
    const gopls = makeFakeGopls((method) =>
      method === 'textDocument/definition'
        ? [
            { uri: `${ROOT}/main.go`, range: range(2, 11, 16) },
            { uri: 'file:///goroot/src/builtin/builtin.go', range: range(0, 0, 1) },
          ]
        : null
    )

    const definitions = await withSession(gopls, (session) => session.definition('main.go', offsetOf(MAIN, 'total)')))

    expect(definitions).toEqual([{ path: 'main.go', from: offsetOf(MAIN, 'total'), to: offsetOf(MAIN, 'total') + 5 }])
  })

  it('lists the references with their line and marks the definition', async () => {
    const gopls = makeFakeGopls((method) => {
      if (method === 'textDocument/definition') return [{ uri: `${ROOT}/main.go`, range: range(2, 11, 16) }]
      if (method === 'textDocument/references')
        return [
          { uri: `${ROOT}/main.go`, range: range(2, 11, 16) },
          { uri: `${ROOT}/main.go`, range: range(5, 9, 14) },
        ]
      return null
    })
    const use = offsetOf(MAIN, 'total)')

    const search = await withSession(gopls, (session) => session.references('main.go', use))

    expect(search).toEqual({
      symbol: 'total',
      references: [
        {
          path: 'main.go',
          from: offsetOf(MAIN, 'total'),
          to: offsetOf(MAIN, 'total') + 5,
          line: 3,
          lineText: 'var /*😀*/ total = 1',
          isDefinition: true,
        },
        { path: 'main.go', from: use, to: use + 5, line: 6, lineText: 'println(total)', isDefinition: false },
      ],
    })
  })

  it('renames across the files it knows and gives their new content', async () => {
    const gopls = makeFakeGopls((method) =>
      method === 'textDocument/rename'
        ? {
            documentChanges: [
              {
                textDocument: { uri: `${ROOT}/main.go`, version: null },
                edits: [
                  { range: range(2, 11, 16), newText: 'sum' },
                  { range: range(5, 9, 14), newText: 'sum' },
                ],
              },
            ],
          }
        : null
    )

    const renames = await withSession(gopls, (session) => session.rename('main.go', offsetOf(MAIN, 'total'), 'sum'))

    expect(renames).toEqual([
      {
        path: 'main.go',
        changes: [
          { from: offsetOf(MAIN, 'total'), to: offsetOf(MAIN, 'total') + 5, insert: 'sum' },
          { from: offsetOf(MAIN, 'total)'), to: offsetOf(MAIN, 'total)') + 5, insert: 'sum' },
        ],
        content: MAIN.replaceAll('total', 'sum'),
      },
    ])
  })

  it('waits for the diagnostics of the current version of a file', async () => {
    const gopls = makeFakeGopls()
    const broken = MAIN.replace('total = 1', 'total = "one"')

    const found = await withSession(gopls, (session) =>
      Effect.gen(function* () {
        yield* session.updateFile('main.go', broken)
        setTimeout(() =>
          gopls.notify('textDocument/publishDiagnostics', {
            uri: `${ROOT}/main.go`,
            version: 1,
            diagnostics: [{ range: range(5, 9, 14), severity: 1, message: 'cannot use total' }],
          })
        )
        return {
          file: yield* session.diagnostics('main.go'),
          project: yield* session.projectDiagnostics(),
        }
      })
    )

    const from = offsetOf(broken, 'total)')
    expect(found.file).toEqual([{ from, to: from + 5, severity: 'error', message: 'cannot use total' }])
    expect(found.project).toEqual([
      { path: 'main.go', line: 6, column: 10, from, to: from + 5, severity: 'error', message: 'cannot use total' },
    ])
  })

  it('tells its watchers which file gopls published diagnostics for until they stop watching', async () => {
    const gopls = makeFakeGopls()
    const publish = () =>
      gopls.notify('textDocument/publishDiagnostics', { uri: `${ROOT}/main.go`, version: 1, diagnostics: [] })

    const paths = await withSession(gopls, (session) =>
      Effect.gen(function* () {
        const seen: Array<string> = []
        const unwatch = session.watchDiagnostics?.((path) => void seen.push(path))
        publish()
        yield* Effect.sleep('20 millis')
        unwatch?.()
        publish()
        yield* Effect.sleep('20 millis')
        return seen
      })
    )

    expect(paths).toEqual(['main.go'])
  })

  it('initializes gopls again and reopens the files after a restart', async () => {
    const gopls = makeFakeGopls()

    await withSession(gopls, (session) =>
      Effect.gen(function* () {
        yield* session.updateFile('main.go', MAIN)
        gopls.restart()
        yield* Effect.sleep(10)
      })
    )

    expect(gopls.methods().slice(3)).toEqual(['initialize', 'initialized', 'textDocument/didOpen'])
    expect(gopls.received.at(-1)).toMatchObject({ params: { textDocument: { uri: `${ROOT}/main.go`, version: 1 } } })
  })
})
