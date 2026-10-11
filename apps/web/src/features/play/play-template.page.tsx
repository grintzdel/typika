import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fileTab, originalTab } from '../../modules/editor/core/domain/editor-tabs.domain-model.ts'
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
import { useTemplateProject } from '../../modules/project/ui/hooks/use-template-project.ts'
import { OutputPanels, type OutputPanel } from '../../modules/runtime/ui/components/OutputPanels.tsx'
import { RunToolbar } from '../../modules/runtime/ui/components/RunToolbar.tsx'
import { useSandboxRuntime } from '../../modules/runtime/ui/hooks/use-sandbox-runtime.ts'
import { useWriteProjectFiles } from '../../modules/runtime/ui/hooks/use-write-project-files.ts'
import { anchorOf, filesOfStep } from '../../modules/tour/core/domain/tour.domain-model.ts'
import { TourPanel } from '../../modules/tour/ui/components/TourPanel.tsx'
import { useTour } from '../../modules/tour/ui/hooks/use-tour.ts'
import { Toolbar } from '../../ui/Toolbar.tsx'
import { WorkbenchLayout } from '../../ui/WorkbenchLayout.tsx'

export const PlayTemplatePage = ({ templateName }: { readonly templateName: string }) => {
  const { t } = useTranslation('editor')
  const project = useTemplateProject(templateName)
  const edits = useEditFiles({ onPersist: project.handleSave, onSync: useWriteProjectFiles(templateName) })
  const runtime = useSandboxRuntime(templateName, edits.commitPending)
  const languageService = useLanguageService(templateName)
  const [panel, setPanel] = useState<OutputPanel>('console')
  const { template, failure } = project
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
          {active === undefined ? (
            <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{t('noFile')}</p>
          ) : (
            <CodeEditor
              key={template.generation}
              documentKey={active.key}
              path={active.path}
              content={active.isOriginal ? (template.originalOf(active.path) ?? '') : template.contentOf(active.path)}
              readOnly={active.isOriginal || isTypikaFile(active.path)}
              highlight={tabs.highlight}
              label={t('label')}
              languageService={languageService.session}
              onChange={edits.handleChange}
            />
          )}
        </EditorTabs>
      }
      {...(tour.step === undefined
        ? {}
        : {
            aside: (
              <TourPanel
                steps={template.tourSteps}
                index={tour.index}
                body={tour.step.body}
                isChanged={anchor?._tag === 'Changed'}
                announcement={tour.announcement}
                embeddedTemplates={project.embeddedTemplates}
                onSelect={tour.handleSelect}
                onOpenOriginal={() => {
                  if (anchor?._tag === 'Changed') tabs.handleOpenTabs([originalTab(anchor.path)], anchor.originalRange)
                }}
              />
            ),
          })}
      bottom={
        <OutputPanels active={panel} onActiveChange={setPanel} console={runtime.console} testRun={runtime.testRun} />
      }
    />
  )
}
