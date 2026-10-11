import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DiffSource } from '../../modules/diff/core/domain/file-changes.domain-model.ts'
import { DiffEditor } from '../../modules/diff/ui/components/DiffEditor.tsx'
import { DiffFileHeader } from '../../modules/diff/ui/components/DiffFileHeader.tsx'
import { DiffPanel } from '../../modules/diff/ui/components/DiffPanel.tsx'
import { useDiff } from '../../modules/diff/ui/hooks/use-diff.ts'
import {
  baseDiffTab,
  EditorTabKind,
  fileTab,
  mineDiffTab,
  originalTab,
} from '../../modules/editor/core/domain/editor-tabs.domain-model.ts'
import { CodeEditor } from '../../modules/editor/ui/components/CodeEditor.tsx'
import { EditorTabs } from '../../modules/editor/ui/components/EditorTabs.tsx'
import { LanguageServiceStatus } from '../../modules/editor/ui/components/LanguageServiceStatus.tsx'
import { useEditFiles } from '../../modules/editor/ui/hooks/use-edit-files.ts'
import { useEditorTabs } from '../../modules/editor/ui/hooks/use-editor-tabs.ts'
import { useLanguageService } from '../../modules/editor/ui/hooks/use-language-service.ts'
import { isTypikaFile } from '../../modules/project/core/domain/file-tree.domain-model.ts'
import { FileTree } from '../../modules/project/ui/components/FileTree.tsx'
import { ProjectStatus } from '../../modules/project/ui/components/ProjectStatus.tsx'
import { ResetProjectDialog } from '../../modules/project/ui/components/ResetProjectDialog.tsx'
import { TemplateLoadError } from '../../modules/project/ui/components/TemplateLoadError.tsx'
import { useBaseTemplate } from '../../modules/project/ui/hooks/use-base-template.ts'
import { useTemplateProject } from '../../modules/project/ui/hooks/use-template-project.ts'
import { OutputPanels, type OutputPanel } from '../../modules/runtime/ui/components/OutputPanels.tsx'
import { RunToolbar } from '../../modules/runtime/ui/components/RunToolbar.tsx'
import { useSandboxRuntime } from '../../modules/runtime/ui/hooks/use-sandbox-runtime.ts'
import { useWriteProjectFiles } from '../../modules/runtime/ui/hooks/use-write-project-files.ts'
import { anchorOf, filesOfStep } from '../../modules/tour/core/domain/tour.domain-model.ts'
import { TourPanel } from '../../modules/tour/ui/components/TourPanel.tsx'
import { useTour } from '../../modules/tour/ui/hooks/use-tour.ts'
import { SidePanel } from '../../ui/SidePanel.tsx'
import { Toolbar } from '../../ui/Toolbar.tsx'
import { WorkbenchLayout } from '../../ui/WorkbenchLayout.tsx'

type SideTab = 'tour' | 'diff'

const NO_FILES: ReadonlyMap<string, string> = new Map()

export const PlayTemplatePage = ({ templateName }: { readonly templateName: string }) => {
  const { t } = useTranslation(['editor', 'tour', 'diff'])
  const project = useTemplateProject(templateName)
  const edits = useEditFiles({ onPersist: project.handleSave, onSync: useWriteProjectFiles(templateName) })
  const runtime = useSandboxRuntime(templateName, edits.commitPending)
  const languageService = useLanguageService(templateName)
  const [panel, setPanel] = useState<OutputPanel>('console')
  const [sideTab, setSideTab] = useState<SideTab | undefined>(undefined)
  const { template, failure } = project
  const base = useBaseTemplate(templateName)
  const diff = useDiff({
    templateFiles: template?.templateFiles ?? NO_FILES,
    currentFiles: new Map([...(template?.files ?? NO_FILES), ...edits.editedFiles]),
    base: base.base,
  })
  const tabs = useEditorTabs(template?.entry)
  const tour = useTour({
    steps: template?.tourSteps ?? [],
    anchorOf: (step) =>
      anchorOf(
        step,
        step.file === undefined ? undefined : (edits.editedContentOf(step.file) ?? template?.contentOf(step.file)),
        step.file === undefined ? undefined : template?.originalOf(step.file)
      ),
    onOpen: (step, anchor) =>
      tabs.handleOpenTabs(filesOfStep(step).map(fileTab), anchor._tag === 'Highlighted' ? anchor.range : undefined),
  })

  if (failure !== undefined) return <TemplateLoadError failure={failure} />
  if (template === undefined) return null

  const active = tabs.activeTab
  const { editorTab } = tabs
  const isCode = active?.kind === EditorTabKind.FILE || active?.kind === EditorTabKind.ORIGINAL
  const diffSource =
    active?.kind === EditorTabKind.BASE_DIFF
      ? DiffSource.BASE
      : active?.kind === EditorTabKind.MINE_DIFF
        ? DiffSource.MINE
        : undefined
  const { anchor } = tour

  return (
    <WorkbenchLayout
      toolbar={
        <Toolbar>
          <ProjectStatus
            title={template.title}
            isModified={project.modifiedPaths.length > 0}
            saveFailed={project.saveFailed}
          />
          <LanguageServiceStatus status={languageService.status} />
          <RunToolbar
            status={runtime.status}
            bootError={runtime.bootError}
            isRunning={runtime.isRunning}
            isTesting={runtime.isTesting}
            onRun={() => {
              setPanel('console')
              runtime.handleRun()
            }}
            onTest={() => {
              setPanel('tests')
              runtime.handleTest()
            }}
            onRetry={runtime.handleRetry}
          />
          <ResetProjectDialog
            modifiedPaths={project.modifiedPaths}
            onConfirm={() => {
              edits.discardPending()
              project.handleReset()
            }}
          />
        </Toolbar>
      }
      sidebar={
        <FileTree
          nodes={template.tree}
          selectedPath={active?.path}
          modifiedPaths={project.modifiedPaths}
          onSelect={tabs.handleOpenFile}
        />
      }
      main={
        <EditorTabs tabs={tabs.tabs} activeKey={active?.key} onSelect={tabs.handleSelect} onClose={tabs.handleClose}>
          {editorTab === undefined ? null : (
            <div className={isCode ? 'h-full' : 'hidden'}>
              <CodeEditor
                key={template.generation}
                documentKey={editorTab.key}
                path={editorTab.path}
                content={
                  editorTab.kind === EditorTabKind.ORIGINAL
                    ? (template.originalOf(editorTab.path) ?? '')
                    : template.contentOf(editorTab.path)
                }
                readOnly={editorTab.kind === EditorTabKind.ORIGINAL || isTypikaFile(editorTab.path)}
                highlight={tabs.highlight}
                label={t('label')}
                languageService={languageService.session}
                onChange={edits.handleChange}
              />
            </div>
          )}
          {diffSource === undefined || active === undefined ? null : (
            <div className="flex h-full flex-col">
              <DiffFileHeader
                layout={diff.layout}
                steps={template.tourSteps.flatMap((step, index) =>
                  step.file === active.path ? [{ index, title: step.title }] : []
                )}
                onLayoutChange={diff.handleLayoutChange}
                onOpenStep={(index) => {
                  setSideTab('tour')
                  tour.handleSelect(index)
                }}
              />
              <div className="min-h-0 flex-1">
                <DiffEditor
                  path={active.path}
                  {...diff.versionsOf(diffSource, active.path)}
                  layout={diff.layout}
                  labels={
                    diffSource === DiffSource.BASE
                      ? {
                          before: t('diff:editors.base'),
                          after: t('diff:editors.template'),
                          unified: t('diff:editors.unified'),
                        }
                      : {
                          before: t('diff:editors.original'),
                          after: t('diff:editors.mine'),
                          unified: t('diff:editors.unified'),
                        }
                  }
                />
              </div>
            </div>
          )}
          {active === undefined ? (
            <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{t('noFile')}</p>
          ) : null}
        </EditorTabs>
      }
      aside={
        <SidePanel
          label={t('sidePanel')}
          active={sideTab ?? (tour.step === undefined ? 'diff' : 'tour')}
          onActiveChange={setSideTab}
          items={[
            ...(tour.step === undefined
              ? []
              : [
                  {
                    value: 'tour' as const,
                    label: t('tour:tab'),
                    content: (
                      <TourPanel
                        steps={template.tourSteps}
                        index={tour.index}
                        body={tour.step.body}
                        isChanged={anchor?._tag === 'Changed'}
                        announcement={tour.announcement}
                        embeddedTemplates={project.embeddedTemplates}
                        onSelect={tour.handleSelect}
                        onOpenOriginal={() => {
                          if (anchor?._tag === 'Changed')
                            tabs.handleOpenTabs([originalTab(anchor.path)], anchor.originalRange)
                        }}
                      />
                    ),
                  },
                ]),
            {
              value: 'diff' as const,
              label: t('diff:label'),
              content: (
                <DiffPanel
                  source={diff.source}
                  baseName={diff.baseName}
                  changes={diff.changes}
                  isLoading={base.isLoading}
                  onSourceChange={diff.handleSourceChange}
                  onOpen={(path) =>
                    tabs.handleOpenTabs(
                      [diff.source === DiffSource.BASE ? baseDiffTab(path) : mineDiffTab(path)],
                      undefined
                    )
                  }
                />
              ),
            },
          ]}
        />
      }
      bottom={
        <OutputPanels active={panel} onActiveChange={setPanel} console={runtime.console} testRun={runtime.testRun} />
      }
    />
  )
}
