import { MergeView, unifiedMergeView } from '@codemirror/merge'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { useEffect, useRef } from 'react'

import { editorTheme } from '../../../editor/ui/components/editor-theme.ts'
import { languageSupportOf } from '../../../editor/ui/components/language-support.ts'
import { diffSigns } from './diff-signs.ts'
import { diffTheme } from './diff-theme.ts'

export const DiffLayout = {
  SPLIT: 'split',
  UNIFIED: 'unified',
} as const

export type DiffLayout = (typeof DiffLayout)[keyof typeof DiffLayout]

export type DiffEditorProps = {
  readonly path: string
  readonly before: string
  readonly after: string
  readonly layout: DiffLayout
  readonly labels: { readonly before: string; readonly after: string }
  readonly unifiedLabel: string
}

const COLLAPSE_UNCHANGED = { margin: 3, minSize: 4 }

const extensionsFor = (path: string, label: string): Array<Extension> => {
  const language = languageSupportOf(path)
  return [
    lineNumbers(),
    diffSigns,
    EditorState.readOnly.of(true),
    EditorView.contentAttributes.of({ 'aria-label': label }),
    editorTheme,
    diffTheme,
    ...(language === undefined ? [] : [language]),
  ]
}

export const DiffEditor = ({ path, before, after, layout, labels, unifiedLabel }: DiffEditorProps) => {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = container.current
    if (parent === null) return undefined
    const view =
      layout === DiffLayout.SPLIT
        ? new MergeView({
            a: { doc: before, extensions: extensionsFor(path, labels.before) },
            b: { doc: after, extensions: extensionsFor(path, labels.after) },
            parent,
            collapseUnchanged: COLLAPSE_UNCHANGED,
          })
        : new EditorView({
            parent,
            state: EditorState.create({
              doc: after,
              extensions: [
                ...extensionsFor(path, unifiedLabel),
                unifiedMergeView({ original: before, mergeControls: false, collapseUnchanged: COLLAPSE_UNCHANGED }),
              ],
            }),
          })
    return () => view.destroy()
  }, [path, before, after, layout, labels.before, labels.after, unifiedLabel])

  return <div ref={container} className="h-full overflow-auto [&_.cm-mergeView]:h-full" />
}
