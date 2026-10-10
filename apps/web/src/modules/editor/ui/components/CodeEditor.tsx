import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { bracketMatching, indentOnInput, type LanguageSupport } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { useEffect, useRef } from 'react'

import { languageOf, type EditorLanguage } from '../../core/domain/language.domain-model.ts'
import { editorTheme } from './editor-theme.ts'

export type CodeEditorProps = {
  readonly path: string
  readonly content: string
  readonly label: string
  readonly onChange: (path: string, content: string) => void
}

const LANGUAGES: Readonly<Record<EditorLanguage, () => LanguageSupport | undefined>> = {
  typescript: () => javascript({ typescript: true }),
  javascript: () => javascript(),
  json: () => javascript(),
  markdown: () => markdown(),
  text: () => undefined,
}

const makeState = (path: string, doc: string, label: string, onDocChange: (content: string) => void): EditorState => {
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
  ]
  if (language !== undefined) extensions.push(language)
  return EditorState.create({ doc, extensions })
}

export const CodeEditor = ({ path, content, label, onChange }: CodeEditorProps) => {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const states = useRef(new Map<string, EditorState>())
  const currentPath = useRef<string | null>(null)
  const latestOnChange = useRef(onChange)

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
    editor.setState(
      states.current.get(path) ?? makeState(path, content, label, (next) => latestOnChange.current(path, next))
    )
  }, [path, content, label])

  return <div ref={container} className="h-full overflow-hidden" />
}
