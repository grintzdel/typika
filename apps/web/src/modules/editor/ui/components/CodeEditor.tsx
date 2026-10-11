import { startCompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { bracketMatching, indentOnInput, type LanguageSupport } from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import * as Effect from 'effect/Effect'
import { useEffect, useRef } from 'react'

import { isAnalyzedPath } from '../../core/domain/language-service.domain-model.ts'
import { languageOf, type EditorLanguage } from '../../core/domain/language.domain-model.ts'
import type { LanguageServiceSession } from '../../core/ports/language-service.port.ts'
import { editorTheme } from './editor-theme.ts'
import { isCompletionPending, pendingCompletion } from './pending-completion.ts'
import { scrollToTourHighlight, setTourHighlight, tourHighlight, type LineRange } from './tour-highlight.ts'
import { typescriptExtensions } from './typescript-extensions.ts'

export type CodeEditorProps = {
  readonly documentKey: string
  readonly path: string
  readonly content: string
  readonly readOnly: boolean
  readonly highlight: LineRange | undefined
  readonly label: string
  readonly languageService: LanguageServiceSession | undefined
  readonly onChange: (path: string, content: string) => void
}

const LANGUAGES: Readonly<Record<EditorLanguage, () => LanguageSupport | undefined>> = {
  typescript: () => javascript({ typescript: true }),
  javascript: () => javascript(),
  json: () => javascript(),
  markdown: () => markdown(),
  text: () => undefined,
}

const languageServiceExtensions = (
  path: string,
  readOnly: boolean,
  session: LanguageServiceSession | undefined
): Extension => (session === undefined || readOnly || !isAnalyzedPath(path) ? [] : typescriptExtensions(session, path))

const makeState = (
  path: string,
  doc: string,
  label: string,
  readOnly: boolean,
  languageService: Extension,
  onDocChange: (content: string) => void
): EditorState => {
  const language = LANGUAGES[languageOf(path)]()
  const extensions: Array<Extension> = [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    EditorState.readOnly.of(readOnly),
    EditorView.contentAttributes.of({ 'aria-label': label }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onDocChange(update.state.doc.toString())
    }),
    editorTheme,
    tourHighlight,
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
  label,
  languageService,
  onChange,
}: CodeEditorProps) => {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const states = useRef(new Map<string, EditorState>())
  const documents = useRef(new Map<string, OpenDocument>())
  const highlights = useRef(new Map<string, LineRange>())
  const current = useRef<OpenDocument | null>(null)
  const latestOnChange = useRef(onChange)
  const latestLanguageService = useRef(languageService)
  const languageServiceSlot = useRef(new Compartment())

  useEffect(() => {
    latestOnChange.current = onChange
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
    const extensions = languageServiceExtensions(path, readOnly, latestLanguageService.current)
    const cached = states.current.get(documentKey)
    if (cached === undefined) {
      editor.setState(
        makeState(path, content, label, readOnly, slot.of(extensions), (next) => latestOnChange.current(path, next))
      )
    } else {
      editor.setState(cached)
      editor.dispatch({ effects: slot.reconfigure(extensions) })
    }
  }, [documentKey, path, content, readOnly, label])

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
        languageServiceExtensions(opened.path, opened.readOnly, languageService)
      ),
    })
    if (!opened.readOnly && isAnalyzedPath(opened.path) && editor.hasFocus && isCompletionPending(editor.state))
      startCompletion(editor)
  }, [languageService])

  return <div ref={container} className="h-full overflow-hidden" />
}
