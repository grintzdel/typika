import type { Diagnostic } from '@typika/runtime-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageMenu } from '../../modules/app/ui/components/LanguageMenu.tsx'
import { useLanguageMenu } from '../../modules/app/ui/hooks/use-language-menu.ts'
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
  solutionDiffTab,
  type EditorTab,
} from '../../modules/editor/core/domain/editor-tabs.domain-model.ts'
import { CodeEditor } from '../../modules/editor/ui/components/CodeEditor.tsx'
import { EditorTabs } from '../../modules/editor/ui/components/EditorTabs.tsx'
import { LanguageServiceStatus } from '../../modules/editor/ui/components/LanguageServiceStatus.tsx'
import { useEditFiles } from '../../modules/editor/ui/hooks/use-edit-files.ts'
import { useEditorTabs } from '../../modules/editor/ui/hooks/use-editor-tabs.ts'
import { useLanguageService } from '../../modules/editor/ui/hooks/use-language-service.ts'
import { ExerciseList } from '../../modules/exercise/ui/components/ExerciseList.tsx'
import { ExercisePanel } from '../../modules/exercise/ui/components/ExercisePanel.tsx'
import { useExercise } from '../../modules/exercise/ui/hooks/use-exercise.ts'
import { HealthBanner } from '../../modules/hub/ui/components/HealthBanner.tsx'
import { isTypikaFile } from '../../modules/project/core/domain/file-tree.domain-model.ts'
import { FileTree } from '../../modules/project/ui/components/FileTree.tsx'
import { ProjectStatus } from '../../modules/project/ui/components/ProjectStatus.tsx'
import { ResetProjectDialog } from '../../modules/project/ui/components/ResetProjectDialog.tsx'
import { TemplateLoadError } from '../../modules/project/ui/components/TemplateLoadError.tsx'
import { WorkbenchSkeleton } from '../../modules/project/ui/components/WorkbenchSkeleton.tsx'
import { useBaseTemplate } from '../../modules/project/ui/hooks/use-base-template.ts'
import { useTemplateProject } from '../../modules/project/ui/hooks/use-template-project.ts'
import { OutputPanels, type OutputPanel } from '../../modules/runtime/ui/components/OutputPanels.tsx'
import { RunToolbar } from '../../modules/runtime/ui/components/RunToolbar.tsx'
import { useSandboxRuntime } from '../../modules/runtime/ui/hooks/use-sandbox-runtime.ts'
import { useWriteProjectFiles } from '../../modules/runtime/ui/hooks/use-write-project-files.ts'
import { anchorOf, filesOfStep } from '../../modules/tour/core/domain/tour.domain-model.ts'
import { TourPanel } from '../../modules/tour/ui/components/TourPanel.tsx'
import { TourStepBody } from '../../modules/tour/ui/components/TourStepBody.tsx'
import { useTour } from '../../modules/tour/ui/hooks/use-tour.ts'
import { SidePanel } from '../../ui/SidePanel.tsx'
import { Toolbar } from '../../ui/Toolbar.tsx'
import { WorkbenchLayout } from '../../ui/WorkbenchLayout.tsx'

type SideTab = 'tour' | 'diff' | 'exercise'

const NO_FILES: ReadonlyMap<string, string> = new Map()
const NO_DIAGNOSTICS: ReadonlyArray<Diagnostic> = []

const DIFF_TABS: Readonly<Record<DiffSource, (path: string) => EditorTab>> = {
  [DiffSource.BASE]: baseDiffTab,
  [DiffSource.MINE]: mineDiffTab,
  [DiffSource.SOLUTION]: solutionDiffTab,
}

const DIFF_SOURCES: Readonly<Partial<Record<EditorTab['kind'], DiffSource>>> = {
  [EditorTabKind.BASE_DIFF]: DiffSource.BASE,
  [EditorTabKind.MINE_DIFF]: DiffSource.MINE,
  [EditorTabKind.SOLUTION_DIFF]: DiffSource.SOLUTION,
}

export type PlayTemplatePageProps = {
  readonly projectKey: string
  readonly initialPanel: 'diff' | undefined
}

export const PlayTemplatePage = ({ projectKey, initialPanel }: PlayTemplatePageProps) => {
  const { t } = useTranslation(['editor', 'tour', 'diff', 'exercise'])
  const languageMenu = useLanguageMenu()
  const project = useTemplateProject(projectKey)
  const edits = useEditFiles({ onPersist: project.handleSave, onSync: useWriteProjectFiles(projectKey) })
  const runtime = useSandboxRuntime(projectKey, edits.commitPending)
  const languageService = useLanguageService(projectKey)
  const [panel, setPanel] = useState<OutputPanel>('console')
  const [sideTab, setSideTab] = useState<SideTab | undefined>(initialPanel)
  const [isSolutionShown, setSolutionShown] = useState(false)
  const { template, failure } = project
  const base = useBaseTemplate(projectKey)
  const diff = useDiff({
    templateFiles: template?.templateFiles ?? NO_FILES,
    currentFiles: new Map([...(template?.files ?? NO_FILES), ...edits.editedFiles]),
    base: base.base,
    solutionFiles: isSolutionShown ? template?.exercise?.solutionFiles : undefined,
  })
  const exerciseProgress = useExercise({
    templateName: template?.name ?? '',
    exercise: template?.exercise,
    exercises: template?.exercises ?? [],
    testRun: runtime.testRun,
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

  if (failure !== undefined) return <TemplateLoadError failure={failure} onRetry={project.handleRetry} />
  if (template === undefined) return <WorkbenchSkeleton />

  const active = tabs.activeTab
  const { editorTab } = tabs
  const isCode = active?.kind === EditorTabKind.FILE || active?.kind === EditorTabKind.ORIGINAL
  const diffSource = active === undefined ? undefined : DIFF_SOURCES[active.kind]
  const { anchor } = tour

  return (
    <WorkbenchLayout
      toolbar={
        <>
          <HealthBanner health={template.health} alternatives={`/templates/${template.name}`} />
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
              download={runtime.download}
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
              onStop={runtime.handleStop}
              onRetry={runtime.handleRetry}
            />
            <ResetProjectDialog
              modifiedPaths={project.modifiedPaths}
              onConfirm={() => {
                edits.discardPending()
                project.handleReset()
              }}
            />
            <LanguageMenu {...languageMenu} />
          </Toolbar>
        </>
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
                diagnostics={
                  editorTab.kind === EditorTabKind.FILE
                    ? runtime.diagnostics.filter((diagnostic) => diagnostic.location?.file === editorTab.path)
                    : NO_DIAGNOSTICS
                }
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
                    {
                      [DiffSource.BASE]: { before: t('diff:editors.base'), after: t('diff:editors.template') },
                      [DiffSource.MINE]: { before: t('diff:editors.original'), after: t('diff:editors.mine') },
                      [DiffSource.SOLUTION]: { before: t('diff:editors.mine'), after: t('diff:editors.solution') },
                    }[diffSource]
                  }
                  unifiedLabel={t('diff:editors.unified')}
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
          active={sideTab ?? (template.exercise !== undefined ? 'exercise' : tour.step === undefined ? 'diff' : 'tour')}
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
                        announcement={tour.announcement}
                        onSelect={tour.handleSelect}
                      >
                        <TourStepBody
                          body={tour.step.body}
                          isChanged={anchor?._tag === 'Changed'}
                          embeddedTemplates={project.embeddedTemplates}
                          onOpenOriginal={() => {
                            if (anchor?._tag === 'Changed')
                              tabs.handleOpenTabs([originalTab(anchor.path)], anchor.originalRange)
                          }}
                        />
                      </TourPanel>
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
                  hasSolution={diff.hasSolution}
                  changes={diff.changes}
                  isLoading={base.isLoading}
                  onSourceChange={diff.handleSourceChange}
                  onOpen={(path) => tabs.handleOpenTabs([DIFF_TABS[diff.source](path)], undefined)}
                />
              ),
            },
            ...(template.exercise !== undefined
              ? [
                  {
                    value: 'exercise' as const,
                    label: t('exercise:tab'),
                    content: (
                      <ExercisePanel
                        exercise={template.exercise}
                        progress={exerciseProgress.progress}
                        isSolved={exerciseProgress.isSolved}
                        next={exerciseProgress.next}
                        revealedHints={exerciseProgress.revealedHints}
                        embeddedTemplates={project.embeddedTemplates}
                        onRevealHint={exerciseProgress.handleRevealHint}
                        onShowSolution={() => {
                          setSolutionShown(true)
                          diff.handleSourceChange(DiffSource.SOLUTION)
                          setSideTab('diff')
                        }}
                        onApplySolution={() => {
                          edits.discardPending()
                          project.handleApplySolution()
                        }}
                      />
                    ),
                  },
                ]
              : template.exercises.length > 0
                ? [
                    {
                      value: 'exercise' as const,
                      label: t('exercise:listTab'),
                      content: (
                        <ExerciseList
                          templateName={template.name}
                          exercises={template.exercises}
                          solved={exerciseProgress.solved}
                        />
                      ),
                    },
                  ]
                : []),
          ]}
        />
      }
      bottom={
        <OutputPanels active={panel} onActiveChange={setPanel} console={runtime.console} testRun={runtime.testRun} />
      }
    />
  )
}
