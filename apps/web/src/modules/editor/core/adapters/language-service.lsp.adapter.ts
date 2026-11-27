import type { LanguageServer, LanguageServerEvent } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'

import { EditorLanguageServiceError } from '../domain/errors/editor-language-service.error.ts'
import {
  DiagnosticSeverity,
  isGoSourcePath,
  type CompletionItem,
  type EditorDiagnostic,
  type FileRename,
  type LanguageServiceFiles,
  type SourceRange,
} from '../domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../ports/language-service.port.ts'
import {
  CompletionResultSchema,
  ConfigurationParamsSchema,
  DocumentationSchema,
  HoverSchema,
  LocationsSchema,
  MessageSchema,
  PublishDiagnosticsSchema,
  SignatureHelpSchema,
  WorkspaceEditSchema,
  type LspCompletionItem,
  type LspDiagnostic,
} from './lsp/lsp-protocol.ts'
import { applyEdits, changeOf, lineTextAt, offsetAt, positionAt, wordRangeAt, type LspRange } from './lsp/lsp-text.ts'

type Response = { readonly result?: unknown; readonly error?: unknown }
type Published = { readonly version: number; readonly diagnostics: ReadonlyArray<LspDiagnostic> }
type Located = { readonly uri: string; readonly range: LspRange }

const DIAGNOSTICS_WAIT_MS = 1_500
const SETTINGS = { linksInHover: false }

const COMPLETION_KINDS: Readonly<Record<number, string>> = {
  2: 'method',
  3: 'function',
  4: 'function',
  5: 'property',
  6: 'var',
  7: 'class',
  8: 'interface',
  9: 'module',
  10: 'property',
  13: 'enum',
  14: 'keyword',
  20: 'enum member',
  21: 'const',
  22: 'class',
  25: 'type',
}

const SEVERITIES: Readonly<Record<number, DiagnosticSeverity>> = {
  1: DiagnosticSeverity.ERROR,
  2: DiagnosticSeverity.WARNING,
}

const CAPABILITIES = {
  workspace: { configuration: true, workspaceFolders: true },
  textDocument: {
    synchronization: { dynamicRegistration: false },
    completion: { completionItem: { snippetSupport: false, documentationFormat: ['markdown', 'plaintext'] } },
    hover: { contentFormat: ['markdown', 'plaintext'] },
    signatureHelp: {
      signatureInformation: {
        documentationFormat: ['markdown', 'plaintext'],
        parameterInformation: { labelOffsetSupport: true },
      },
    },
    publishDiagnostics: { versionSupport: true },
    definition: {},
    references: {},
    rename: {},
  },
}

const decode =
  <S extends Schema.ConstraintDecoder<unknown>>(schema: S) =>
  (value: unknown): S['Type'] | undefined =>
    Option.getOrUndefined(Schema.decodeUnknownOption(schema)(value))

const textOfDocumentation = (documentation: typeof DocumentationSchema.Type | null | undefined) =>
  (typeof documentation === 'string' ? documentation : (documentation?.value ?? '')).trim()

const FENCE = /^```\w*\n([\s\S]*?)\n```\s*/

const splitHover = (markdown: string) => {
  const fenced = FENCE.exec(markdown)
  return fenced === null
    ? { signature: '', documentation: markdown.trim() }
    : { signature: fenced[1] ?? '', documentation: markdown.slice(fenced[0].length).trim() }
}

const isList = (value: unknown): value is ReadonlyArray<unknown> => Array.isArray(value)

const hoverText = (contents: NonNullable<typeof HoverSchema.Type>['contents']): string => {
  if (isList(contents)) return contents.map((part) => hoverText(part)).join('\n\n')
  if (typeof contents === 'string') return contents
  return 'kind' in contents ? contents.value : `\`\`\`${contents.language}\n${contents.value}\n\`\`\``
}

const failWith = (cause: unknown) => new EditorLanguageServiceError({ cause })

const toEditorDiagnostic = (text: string, diagnostic: LspDiagnostic): EditorDiagnostic => ({
  from: offsetAt(text, diagnostic.range.start),
  to: offsetAt(text, diagnostic.range.end),
  severity: SEVERITIES[diagnostic.severity ?? 1] ?? DiagnosticSeverity.INFO,
  message: diagnostic.message,
})

const locate = (result: unknown): ReadonlyArray<Located> => {
  const found = decode(LocationsSchema)(result)
  if (found === undefined || found === null) return []
  return (isList(found) ? found : [found]).map((location) =>
    'targetUri' in location ? { uri: location.targetUri, range: location.targetSelectionRange } : location
  )
}

const completionOf = (item: LspCompletionItem): CompletionItem => ({
  label: item.label,
  kind: COMPLETION_KINDS[item.kind ?? 0] ?? 'text',
  sortText: item.sortText ?? item.label,
  source: undefined,
  hasAction: (item.additionalTextEdits ?? []).length > 0,
})

const editStart = (item: LspCompletionItem | undefined) => {
  const edit = item?.textEdit
  if (edit === undefined || edit === null) return undefined
  return 'range' in edit ? edit.range.start : edit.insert.start
}

const keyOf = (item: { readonly label: string; readonly sortText?: string | null }) =>
  `${item.label}\u0000${item.sortText ?? ''}`

export const connectLanguageServer = (
  server: LanguageServer,
  files: LanguageServiceFiles
): Effect.Effect<LanguageServiceSession, EditorLanguageServiceError, Scope.Scope> =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope
    const root = server.rootUri
    const texts = new Map(Object.entries(files))
    const versions = new Map<string, number>()
    const published = new Map<string, Published>()
    const completionItems = new Map<string, ReadonlyMap<string, LspCompletionItem>>()
    const pending = new Map<number, (response: Response) => void>()
    const listeners = new Set<() => void>()
    let nextId = 1
    let failure: EditorLanguageServiceError | undefined

    const uriOf = (path: string) => `${root}/${encodeURI(path)}`
    const pathOf = (uri: string) => (uri.startsWith(`${root}/`) ? decodeURI(uri.slice(root.length + 1)) : undefined)
    const textOf = (path: string) => texts.get(path) ?? ''

    const send = (message: object) =>
      server.send(JSON.stringify({ jsonrpc: '2.0', ...message })).pipe(Effect.mapError(failWith))

    const notify = (method: string, params: unknown) => send({ method, params })

    const request = (method: string, params: unknown) =>
      Effect.callback<unknown, EditorLanguageServiceError>((resume) => {
        if (failure !== undefined) {
          resume(Effect.fail(failure))
          return
        }
        const id = nextId++
        pending.set(id, (response) =>
          resume(response.error === undefined ? Effect.succeed(response.result) : Effect.fail(failWith(response.error)))
        )
        Effect.runFork(
          send({ id, method, params }).pipe(
            Effect.catch((error) =>
              Effect.sync(() => {
                pending.delete(id)
                resume(Effect.fail(error))
              })
            )
          )
        )
        return Effect.sync(() => pending.delete(id))
      })

    const failPending = (cause: unknown) => {
      for (const settle of pending.values()) settle({ error: cause })
      pending.clear()
    }

    const handshake = Effect.gen(function* () {
      yield* request('initialize', {
        processId: null,
        clientInfo: { name: 'typika' },
        rootUri: root,
        workspaceFolders: [{ uri: root, name: 'project' }],
        initializationOptions: SETTINGS,
        capabilities: CAPABILITIES,
      })
      yield* notify('initialized', {})
      for (const [path, version] of versions) {
        yield* notify('textDocument/didOpen', {
          textDocument: { uri: uriOf(path), languageId: 'go', version, text: textOf(path) },
        })
      }
    })

    const answer = (id: number | string, method: string, params: unknown) => {
      const items = method === 'workspace/configuration' ? decode(ConfigurationParamsSchema)(params)?.items : undefined
      return send({ id, result: items === undefined ? null : items.map(() => SETTINGS) })
    }

    const receive = (raw: string) => {
      const message = decode(MessageSchema)(JSON.parse(raw))
      if (message === undefined) return Effect.void
      const { id, method } = message
      if (method !== undefined && id !== undefined && id !== null) return answer(id, method, message.params)
      if (method === 'textDocument/publishDiagnostics') {
        const params = decode(PublishDiagnosticsSchema)(message.params)
        const path = params === undefined ? undefined : pathOf(params.uri)
        if (params !== undefined && path !== undefined) {
          published.set(path, { version: params.version ?? 0, diagnostics: params.diagnostics })
          for (const listener of listeners) listener()
        }
        return Effect.void
      }
      if (typeof id === 'number') {
        pending.get(id)?.(message)
        pending.delete(id)
      }
      return Effect.void
    }

    const onEvent = (event: LanguageServerEvent) => {
      if (event._tag === 'Message') return receive(event.message)
      failPending('gopls restarted')
      return Effect.asVoid(Effect.forkIn(Effect.ignore(handshake), scope))
    }

    yield* Stream.runForEach(server.connect, onEvent).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          failure = failWith(error)
          failPending(error)
        })
      ),
      Effect.forkScoped
    )
    yield* handshake

    const waitForDiagnostics = (path: string) =>
      Effect.callback<void>((resume) => {
        const isCurrent = () => (published.get(path)?.version ?? 0) >= (versions.get(path) ?? 0)
        if (isCurrent()) {
          resume(Effect.void)
          return
        }
        const listener = () => {
          if (isCurrent()) resume(Effect.void)
        }
        listeners.add(listener)
        const timer = setTimeout(() => resume(Effect.void), DIAGNOSTICS_WAIT_MS)
        return Effect.sync(() => {
          listeners.delete(listener)
          clearTimeout(timer)
        })
      })

    const at = (path: string, position: number) => ({
      textDocument: { uri: uriOf(path) },
      position: positionAt(textOf(path), position),
    })

    const toSourceRanges = (locations: ReadonlyArray<Located>): ReadonlyArray<SourceRange> =>
      locations.flatMap(({ uri, range }) => {
        const path = pathOf(uri)
        if (path === undefined || !texts.has(path)) return []
        const text = textOf(path)
        return [{ path, from: offsetAt(text, range.start), to: offsetAt(text, range.end) }]
      })

    const definition = (path: string, position: number) =>
      Effect.map(request('textDocument/definition', at(path, position)), (result) => toSourceRanges(locate(result)))

    const session: LanguageServiceSession = {
      updateFile: (path, content) =>
        Effect.suspend(() => {
          texts.set(path, content)
          if (!isGoSourcePath(path)) return Effect.void
          const version = versions.get(path)
          versions.set(path, (version ?? 0) + 1)
          return version === undefined
            ? notify('textDocument/didOpen', {
                textDocument: { uri: uriOf(path), languageId: 'go', version: 1, text: content },
              })
            : notify('textDocument/didChange', {
                textDocument: { uri: uriOf(path), version: version + 1 },
                contentChanges: [{ text: content }],
              })
        }),
      removeFile: (path) =>
        Effect.suspend(() => {
          texts.delete(path)
          published.delete(path)
          if (!versions.delete(path)) return Effect.void
          return notify('textDocument/didClose', { textDocument: { uri: uriOf(path) } })
        }),
      diagnostics: (path) =>
        Effect.map(waitForDiagnostics(path), () =>
          (published.get(path)?.diagnostics ?? []).map((diagnostic) => toEditorDiagnostic(textOf(path), diagnostic))
        ),
      projectDiagnostics: () =>
        Effect.sync(() =>
          [...published].flatMap(([path, { diagnostics }]) =>
            diagnostics.map((diagnostic) => ({
              path,
              line: diagnostic.range.start.line + 1,
              column: diagnostic.range.start.character + 1,
              ...toEditorDiagnostic(textOf(path), diagnostic),
            }))
          )
        ),
      completions: (path, position) =>
        Effect.map(request('textDocument/completion', at(path, position)), (result) => {
          const found = decode(CompletionResultSchema)(result)
          const items = found === undefined || found === null ? [] : isList(found) ? found : found.items
          completionItems.set(path, new Map(items.map((item) => [keyOf(item), item])))
          if (items.length === 0) return undefined
          const start = editStart(items[0])
          const text = textOf(path)
          return {
            from: start === undefined ? wordRangeAt(text, position).from : offsetAt(text, start),
            items: items.map(completionOf),
          }
        }),
      completionChanges: (path, _position, item) =>
        Effect.sync(() =>
          (completionItems.get(path)?.get(keyOf(item))?.additionalTextEdits ?? []).map((edit) =>
            changeOf(textOf(path), edit)
          )
        ),
      completionDetails: (path, _position, item) =>
        Effect.sync(() => {
          const raw = completionItems.get(path)?.get(keyOf(item))
          return raw === undefined
            ? undefined
            : { signature: raw.detail ?? '', documentation: textOfDocumentation(raw.documentation) }
        }),
      quickInfo: (path, position) =>
        Effect.map(request('textDocument/hover', at(path, position)), (result) => {
          const hover = decode(HoverSchema)(result)
          if (hover === undefined || hover === null) return undefined
          const text = textOf(path)
          const word = wordRangeAt(text, position)
          const range = hover.range ?? undefined
          return {
            from: range === undefined ? word.from : offsetAt(text, range.start),
            to: range === undefined ? word.to : offsetAt(text, range.end),
            ...splitHover(hoverText(hover.contents)),
          }
        }),
      signatureHelp: (path, position) =>
        Effect.map(request('textDocument/signatureHelp', at(path, position)), (result) => {
          const help = decode(SignatureHelpSchema)(result)
          const signature = help?.signatures[help.activeSignature ?? 0]
          if (help === undefined || help === null || signature === undefined) return undefined
          const { label } = signature
          let cursor = 0
          const spans = (signature.parameters ?? []).map((parameter) => {
            if (typeof parameter.label !== 'string') return parameter.label
            const start = Math.max(label.indexOf(parameter.label, cursor), cursor)
            cursor = start + parameter.label.length
            return [start, cursor] as const
          })
          const first = spans[0]
          const last = spans.at(-1)
          const open = label.indexOf('(') + 1
          return {
            prefix: label.slice(0, first?.[0] ?? open),
            parameters: spans.map(([start, end]) => label.slice(start, end)),
            separator: first !== undefined && spans[1] !== undefined ? label.slice(first[1], spans[1][0]) : ', ',
            suffix: label.slice(last?.[1] ?? open),
            activeParameter: signature.activeParameter ?? help.activeParameter ?? 0,
            documentation: textOfDocumentation(signature.documentation),
          }
        }),
      definition,
      references: (path, position) =>
        Effect.map(
          Effect.all(
            [
              request('textDocument/references', { ...at(path, position), context: { includeDeclaration: true } }),
              definition(path, position),
            ],
            { concurrency: 'unbounded' }
          ),
          ([result, definitions]) => {
            const ranges = toSourceRanges(locate(result))
            if (ranges.length === 0) return undefined
            const text = textOf(path)
            const word = wordRangeAt(text, position)
            return {
              symbol: text.slice(word.from, word.to),
              references: ranges.map((range) => {
                const line = positionAt(textOf(range.path), range.from).line
                return {
                  ...range,
                  line: line + 1,
                  lineText: lineTextAt(textOf(range.path), line).trim(),
                  isDefinition: definitions.some(
                    (found) => found.path === range.path && found.from === range.from && found.to === range.to
                  ),
                }
              }),
            }
          }
        ),
      rename: (path, position, newName) =>
        Effect.map(request('textDocument/rename', { ...at(path, position), newName }), (result) => {
          const edit = decode(WorkspaceEditSchema)(result)
          if (edit === undefined || edit === null) return undefined
          const byUri = [
            ...Object.entries(edit.changes ?? {}),
            ...(edit.documentChanges ?? []).map((change) => [change.textDocument.uri, change.edits] as const),
          ]
          return byUri.flatMap(([uri, edits]): ReadonlyArray<FileRename> => {
            const renamed = pathOf(uri)
            if (renamed === undefined || !texts.has(renamed)) return []
            const text = textOf(renamed)
            return [
              {
                path: renamed,
                changes: edits.map((change) => changeOf(text, change)).toSorted((a, b) => a.from - b.from),
                content: applyEdits(text, edits),
              },
            ]
          })
        }),
    }
    return session
  })
