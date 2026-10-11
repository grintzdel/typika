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
import { typescriptExtensions } from './typescript-extensions.ts'

export type CodeEditorProps = {
  readonly path: string
  readonly content: string
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

const languageServiceExtensions = (path: string, session: LanguageServiceSession | undefined): Extension =>
  session === undefined || !isAnalyzedPath(path) ? [] : typescriptExtensions(session, path)

const makeState = (
  path: string,
  doc: string,
  label: string,
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
    EditorView.contentAttributes.of({ 'aria-label': label }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onDocChange(update.state.doc.toString())
    }),
    editorTheme,
    languageService,
  ]
  if (language !== undefined) extensions.push(language)
  return EditorState.create({ doc, extensions })
}

export const CodeEditor = ({ path, content, label, languageService, onChange }: CodeEditorProps) => {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const states = useRef(new Map<string, EditorState>())
  const currentPath = useRef<string | null>(null)
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
      currentPath.current = null
    }
  }, [])

  useEffect(() => {
    const editor = view.current
    if (editor === null || currentPath.current === path) return
    if (currentPath.current !== null) states.current.set(currentPath.current, editor.state)
    currentPath.current = path
    const slot = languageServiceSlot.current
    const extensions = languageServiceExtensions(path, latestLanguageService.current)
    const cached = states.current.get(path)
    if (cached === undefined) {
      editor.setState(
        makeState(path, content, label, slot.of(extensions), (next) => latestOnChange.current(path, next))
      )
    } else {
      editor.setState(cached)
      editor.dispatch({ effects: slot.reconfigure(extensions) })
    }
  }, [path, content, label])

  useEffect(() => {
    latestLanguageService.current = languageService
    const editor = view.current
    if (editor === null || currentPath.current === null || languageService === undefined) return
    for (const [cachedPath, state] of states.current) {
      if (cachedPath !== currentPath.current)
        void Effect.runPromise(Effect.ignore(languageService.updateFile(cachedPath, state.doc.toString())))
    }
    editor.dispatch({
      effects: languageServiceSlot.current.reconfigure(languageServiceExtensions(currentPath.current, languageService)),
    })
  }, [languageService])

  return <div ref={container} className="h-full overflow-hidden" />
}
