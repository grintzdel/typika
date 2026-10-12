import { useTranslation } from 'react-i18next'

import type { EditorTab } from '../../../editor/core/domain/editor-tabs.domain-model.ts'
import { CodeEditor } from '../../../editor/ui/components/CodeEditor.tsx'
import { EditorTabs } from '../../../editor/ui/components/EditorTabs.tsx'
import type { LineRange } from '../../../editor/ui/components/tour-highlight.ts'
import type { FileTreeNode } from '../../../project/core/domain/file-tree.domain-model.ts'
import { FileTree } from '../../../project/ui/components/FileTree.tsx'
import { ContentMarkdown } from '../../../shared/ui/components/ContentMarkdown.tsx'
import type { ColumnView } from '../../core/domain/compare.domain-model.ts'

export type CompareColumnProps = {
  readonly languageName: string
  readonly name: string
  readonly isShown: boolean
  readonly tree: ReadonlyArray<FileTreeNode>
  readonly tabs: ReadonlyArray<EditorTab>
  readonly activeKey: string | undefined
  readonly editorTab: EditorTab | undefined
  readonly highlight: LineRange | undefined
  readonly view: ColumnView | undefined
  readonly embeddedTemplates: ReadonlyArray<string>
  readonly contentOf: (path: string) => string
  readonly onOpenFile: (path: string) => void
  readonly onSelectTab: (key: string) => void
  readonly onCloseTab: (key: string) => void
}

const NO_DIAGNOSTICS: ReadonlyArray<never> = []

const ignoreChange = () => undefined

export const CompareColumn = ({
  languageName,
  name,
  isShown,
  tree,
  tabs,
  activeKey,
  editorTab,
  highlight,
  view,
  embeddedTemplates,
  contentOf,
  onOpenFile,
  onSelectTab,
  onCloseTab,
}: CompareColumnProps) => {
  const { t } = useTranslation('compare')
  const isGreyed = view?._tag === 'Missing' || view?._tag === 'Dissolved'

  return (
    <section
      aria-label={languageName}
      className={`${isShown ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col border-neutral-200 md:flex md:border-r dark:border-neutral-800`}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <h2 className="font-semibold">{languageName}</h2>
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{name}</span>
        <a
          href={`/play/${name}`}
          className="ml-auto text-sm text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400"
        >
          {t('openInSandbox')}
        </a>
      </header>
      <details className="border-b border-neutral-200 text-sm dark:border-neutral-800">
        <summary className="cursor-pointer px-3 py-1 text-neutral-600 dark:text-neutral-400">{t('files')}</summary>
        <div className="max-h-48 overflow-auto">
          <FileTree nodes={tree} selectedPath={editorTab?.path} modifiedPaths={[]} onSelect={onOpenFile} />
        </div>
      </details>
      <div className="min-h-0 flex-1">
        {isGreyed ? (
          <div className="h-full overflow-auto bg-neutral-100 px-4 py-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            <p className="font-medium">{t('noEquivalent', { language: languageName })}</p>
            {view._tag === 'Dissolved' ? (
              <div lang="en">
                <ContentMarkdown markdown={view.body} embeddedTemplates={embeddedTemplates} />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={isGreyed ? 'hidden' : 'h-full'}>
          <EditorTabs tabs={tabs} activeKey={activeKey} onSelect={onSelectTab} onClose={onCloseTab}>
            {editorTab === undefined ? null : (
              <CodeEditor
                documentKey={editorTab.key}
                path={editorTab.path}
                content={contentOf(editorTab.path)}
                readOnly
                highlight={highlight}
                diagnostics={NO_DIAGNOSTICS}
                label={t('editor', { language: languageName })}
                languageService={undefined}
                onChange={ignoreChange}
              />
            )}
          </EditorTabs>
        </div>
      </div>
    </section>
  )
}
