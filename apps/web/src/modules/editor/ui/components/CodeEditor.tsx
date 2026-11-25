import { startCompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import type { Diagnostic } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  isAnalyzedPath,
  type FileRename,
  type ReferenceSearch,
  type SourceRange,
} from '../../core/domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../../core/ports/language-service.port.ts'
import { buildDiagnostics, setBuildDiagnostics, toLintDiagnostics } from './build-diagnostics.ts'
import { editorPhrasesOf } from './editor-phrases.ts'
import { editorTheme } from './editor-theme.ts'
import { languageSupportOf } from './language-support.ts'
import type { NavigationHandlers } from './navigation.ts'
import { isCompletionPending, pendingCompletion } from './pending-completion.ts'
import { scrollToTourHighlight, setTourHighlight, tourHighlight, type LineRange } from './tour-highlight.ts'
import { typescriptExtensions } from './typescript-extensions.ts'

export type CodeEditorProps = {
  readonly documentKey: string
  readonly path: string
  readonly content: string
  readonly readOnly: boolean
  readonly highlight: LineRange | undefined
  readonly diagnostics: ReadonlyArray<Diagnostic>
  readonly label: string
  readonly languageService: LanguageServiceSession | undefined
  readonly reveal?: { readonly from: number; readonly to: number } | undefined
  readonly onChange: (path: string, content: string) => void
  readonly onGoTo?: (range: SourceRange) => void
  readonly onReferences?: (search: ReferenceSearch) => void
}

const languageServiceExtensions = (
  path: string,
  readOnly: boolean,
  session: LanguageServiceSession | undefined,
  handlers: NavigationHandlers
): Extension =>
  session === undefined || readOnly || !isAnalyzedPath(path) ? [] : typescriptExtensions(session, path, handlers)

const makeState = (
  path: string,
  doc: string,
  label: string,
  readOnly: boolean,
  phrases: Readonly<Record<string, string>>,
  languageService: Extension,
  onDocChange: (content: string) => void
): EditorState => {
  const language = languageSupportOf(path)
  const extensions: Array<Extension> = [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    EditorView.clickAddsSelectionRange.of((event) => event.altKey),
    EditorState.phrases.of(phrases),
    EditorState.readOnly.of(readOnly),
    EditorView.contentAttributes.of({ 'aria-label': label }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onDocChange(update.state.doc.toString())
    }),
    editorTheme,
    tourHighlight,
    buildDiagnostics,
    pendingCompletion,
    languageService,
  ]
  if (language !== undefined) extensions.push(language)
  return EditorState.create({ doc, extensions })
}

type OpenDocument = { readonly key: string; readonly path: string; readonly readOnly: boolean }

export const CodeEditor = ({
  documentKey,
  path,
  content,
  readOnly,
  highlight,
  diagnostics,
  label,
  languageService,
  reveal,
  onChange,
  onGoTo,
  onReferences,
}: CodeEditorProps) => {
  const { t } = useTranslation('editor')
  const phrases = editorPhrasesOf(t)
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const states = useRef(new Map<string, EditorState>())
  const documents = useRef(new Map<string, OpenDocument>())
  const highlights = useRef(new Map<string, LineRange>())
  const appliedDiagnostics = useRef(new Map<string, string>())
  const revealed = useRef(new Map<string, { readonly from: number; readonly to: number }>())
  const current = useRef<OpenDocument | null>(null)
  const latestOnChange = useRef(onChange)
  const latestLanguageService = useRef(languageService)
  const languageServiceSlot = useRef(new Compartment())
  const latestNavigation = useRef({ onGoTo, onReferences })

  useEffect(() => {
    latestOnChange.current = onChange
    latestNavigation.current = { onGoTo, onReferences }
  })

  const applyRenames = (renames: ReadonlyArray<FileRename>) => {
    for (const renamed of renames) {
      for (const [key, document] of documents.current) {
        const state = states.current.get(key)
        if (document.path !== renamed.path || document.readOnly || state === undefined) continue
        states.current.set(
          key,
          state.update({ changes: { from: 0, to: state.doc.length, insert: renamed.content } }).state
        )
      }
      latestOnChange.current(renamed.path, renamed.content)
    }
  }

  const handlers = useRef<NavigationHandlers>({
    onGoTo: (range) => latestNavigation.current.onGoTo?.(range),
    onReferences: (search) => latestNavigation.current.onReferences?.(search),
    onRename: (renames) => applyRenames(renames),
  })

  useEffect(() => {
    const parent = container.current
    if (parent === null) return undefined
    const editor = new EditorView({ parent })
    view.current = editor
    return () => {
      editor.destroy()
      view.current = null
      current.current = null
      highlights.current.clear()
      appliedDiagnostics.current.clear()
    }
  }, [])

  useEffect(() => {
    const editor = view.current
    if (editor === null || current.current?.key === documentKey) return
    if (current.current !== null) states.current.set(current.current.key, editor.state)
    const opened = { key: documentKey, path, readOnly }
    current.current = opened
    documents.current.set(documentKey, opened)
    const slot = languageServiceSlot.current
    const extensions = languageServiceExtensions(path, readOnly, latestLanguageService.current, handlers.current)
    const cached = states.current.get(documentKey)
    if (cached === undefined) {
      editor.setState(
        makeState(path, content, label, readOnly, phrases, slot.of(extensions), (next) =>
          latestOnChange.current(path, next)
        )
      )
    } else {
      editor.setState(cached)
      editor.dispatch({ effects: slot.reconfigure(extensions) })
    }
  }, [documentKey, path, content, readOnly, label])

  useEffect(() => {
    const editor = view.current
    if (editor === null || reveal === undefined || revealed.current.get(documentKey) === reveal) return
    revealed.current.set(documentKey, reveal)
    const from = Math.min(reveal.from, editor.state.doc.length)
    editor.dispatch({ selection: { anchor: from }, effects: EditorView.scrollIntoView(from, { y: 'center' }) })
    editor.focus()
  }, [documentKey, reveal])

  useEffect(() => {
    const editor = view.current
    if (editor === null) return
    const applied = highlights.current.get(documentKey)
    if (applied === highlight) {
      if (highlight !== undefined) scrollToTourHighlight(editor)
      return
    }
    if (highlight === undefined) highlights.current.delete(documentKey)
    else highlights.current.set(documentKey, highlight)
    editor.dispatch({ effects: setTourHighlight.of(highlight ?? null) })
    scrollToTourHighlight(editor)
  }, [documentKey, highlight])

  useEffect(() => {
    const editor = view.current
    if (editor === null) return
    const signature = JSON.stringify(diagnostics)
    if (appliedDiagnostics.current.get(documentKey) === signature) return
    appliedDiagnostics.current.set(documentKey, signature)
    editor.dispatch({ effects: setBuildDiagnostics.of(toLintDiagnostics(editor.state.doc, diagnostics)) })
  }, [documentKey, diagnostics])

  useEffect(() => {
    latestLanguageService.current = languageService
    const editor = view.current
    const opened = current.current
    if (editor === null || opened === null || languageService === undefined) return
    for (const [key, state] of states.current) {
      const document = documents.current.get(key)
      if (key !== opened.key && document !== undefined && !document.readOnly)
        void Effect.runPromise(Effect.ignore(languageService.updateFile(document.path, state.doc.toString())))
    }
    editor.dispatch({
      effects: languageServiceSlot.current.reconfigure(
        languageServiceExtensions(opened.path, opened.readOnly, languageService, handlers.current)
      ),
    })
    if (!opened.readOnly && isAnalyzedPath(opened.path) && editor.hasFocus && isCompletionPending(editor.state))
      startCompletion(editor)
  }, [languageService])

  return <div ref={container} className="h-full overflow-hidden" />
}
