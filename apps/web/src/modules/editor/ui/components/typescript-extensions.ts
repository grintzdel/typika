import {
  autocompletion,
  insertCompletionText,
  pickedCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { linter, type Diagnostic } from '@codemirror/lint'
import { StateEffect, StateField, type Extension } from '@codemirror/state'
import { EditorView, hoverTooltip, showTooltip, ViewPlugin, type Tooltip, type ViewUpdate } from '@codemirror/view'
import * as Effect from 'effect/Effect'

import type { CompletionItem, QuickInfo, SignatureHelp } from '../../core/domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../../core/ports/language-service.port.ts'

const LINT_DELAY_MS = 300
const SIGNATURE_DELAY_MS = 50
const IDENTIFIER = /^[\w$]*$/
const WORD_BEFORE = /[\w$]+$/

const COMPLETION_TYPES: Readonly<Record<string, string>> = {
  function: 'function',
  'local function': 'function',
  method: 'method',
  class: 'class',
  'local class': 'class',
  interface: 'interface',
  type: 'type',
  enum: 'enum',
  'enum member': 'enum',
  var: 'variable',
  let: 'variable',
  const: 'constant',
  'local var': 'variable',
  parameter: 'variable',
  property: 'property',
  getter: 'property',
  setter: 'property',
  keyword: 'keyword',
  module: 'namespace',
}

const run = <A>(effect: Effect.Effect<A, unknown>): Promise<A | undefined> =>
  Effect.runPromise(Effect.orElseSucceed(effect, () => undefined))

const boostOf = (sortText: string) => {
  const rank = Number.parseInt(sortText, 10)
  return Number.isNaN(rank) ? -20 : Math.max(-99, Math.min(99, 10 - rank))
}

const element = (tag: string, className: string, text = '') => {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

const withDocumentation = (dom: HTMLElement, documentation: string) => {
  if (documentation !== '') dom.append(element('p', 'cm-typika-documentation', documentation))
  return dom
}

const quickInfoDom = (info: QuickInfo) => {
  const dom = element('div', 'cm-typika-info')
  dom.setAttribute('role', 'tooltip')
  dom.append(element('code', 'cm-typika-signature', info.signature))
  return withDocumentation(dom, info.documentation)
}

const signatureDom = (help: SignatureHelp) => {
  const dom = element('div', 'cm-typika-info')
  dom.setAttribute('role', 'tooltip')
  const signature = element('code', 'cm-typika-signature', help.prefix)
  help.parameters.forEach((parameter, index) => {
    if (index > 0) signature.append(help.separator)
    signature.append(
      index === help.activeParameter ? element('strong', 'cm-typika-active-parameter', parameter) : parameter
    )
  })
  signature.append(help.suffix)
  dom.append(signature)
  return withDocumentation(dom, help.documentation)
}

const completions = (session: LanguageServiceSession, path: string) => {
  const applyWithImport =
    (item: CompletionItem) => (view: EditorView, completion: Completion, from: number, to: number) => {
      view.dispatch({
        ...insertCompletionText(view.state, item.label, from, to),
        annotations: pickedCompletion.of(completion),
      })
      const doc = view.state.doc
      void run(session.completionChanges(path, from + item.label.length, item)).then((changes) => {
        if (changes === undefined || changes.length === 0 || view.state.doc !== doc) return
        view.dispatch({ changes: [...changes] })
      })
    }

  const toCompletion = (item: CompletionItem): Completion => ({
    label: item.label,
    type: COMPLETION_TYPES[item.kind] ?? 'text',
    boost: boostOf(item.sortText),
    ...(item.source === undefined ? {} : { detail: item.source }),
    ...(item.hasAction ? { apply: applyWithImport(item) } : {}),
  })

  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const typing = context.matchBefore(WORD_BEFORE) !== null
    const afterDot = context.state.sliceDoc(context.pos - 1, context.pos) === '.'
    if (!context.explicit && !typing && !afterDot) return null
    const list = await run(session.completions(path, context.pos))
    if (list === undefined || context.aborted) return null
    return { from: list.from, options: list.items.map(toCompletion), validFor: IDENTIFIER }
  }
}

const setSignature = StateEffect.define<Tooltip | null>()

const signatureField = StateField.define<Tooltip | null>({
  create: () => null,
  update: (tooltip, transaction) => {
    for (const effect of transaction.effects) if (effect.is(setSignature)) return effect.value
    return tooltip === null || !transaction.docChanged
      ? tooltip
      : { ...tooltip, pos: transaction.changes.mapPos(tooltip.pos) }
  },
  provide: (field) => showTooltip.from(field),
})

const signatureHelp = (session: LanguageServiceSession, path: string) =>
  ViewPlugin.define((view) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const request = () => {
      const position = view.state.selection.main.head
      const doc = view.state.doc
      void run(session.signatureHelp(path, position)).then((help) => {
        if (view.state.doc !== doc || view.state.selection.main.head !== position) return
        view.dispatch({
          effects: setSignature.of(
            help === undefined ? null : { pos: position, above: true, create: () => ({ dom: signatureDom(help) }) }
          ),
        })
      })
    }
    return {
      update: (update: ViewUpdate) => {
        if (!update.docChanged && !update.selectionSet) return
        clearTimeout(timer)
        timer = setTimeout(request, SIGNATURE_DELAY_MS)
      },
      destroy: () => clearTimeout(timer),
    }
  })

const fileSync = (session: LanguageServiceSession, path: string) =>
  ViewPlugin.define((view) => {
    void run(session.updateFile(path, view.state.doc.toString()))
    return {
      update: (update: ViewUpdate) => {
        if (update.docChanged) void run(session.updateFile(path, update.state.doc.toString()))
      },
    }
  })

const diagnostics = (session: LanguageServiceSession, path: string) =>
  linter(
    async (view): Promise<ReadonlyArray<Diagnostic>> => {
      const found = await run(session.diagnostics(path))
      const length = view.state.doc.length
      return (found ?? []).map((diagnostic) => ({
        from: Math.min(diagnostic.from, length),
        to: Math.min(diagnostic.to, length),
        severity: diagnostic.severity,
        message: diagnostic.message,
      }))
    },
    { delay: LINT_DELAY_MS }
  )

const quickInfo = (session: LanguageServiceSession, path: string) =>
  hoverTooltip(async (_, position) => {
    const info = await run(session.quickInfo(path, position))
    if (info === undefined) return null
    return { pos: info.from, end: info.to, above: true, create: () => ({ dom: quickInfoDom(info) }) }
  })

export const typescriptExtensions = (session: LanguageServiceSession, path: string): Extension => [
  fileSync(session, path),
  autocompletion({ override: [completions(session, path)] }),
  diagnostics(session, path),
  quickInfo(session, path),
  signatureField,
  signatureHelp(session, path),
]
