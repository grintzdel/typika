import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeEditor } from '../../modules/editor/ui/components/CodeEditor.tsx'
import { useEditFiles } from '../../modules/editor/ui/hooks/use-edit-files.ts'
import { useLanguageService } from '../../modules/editor/ui/hooks/use-language-service.ts'
import { FileTree } from '../../modules/project/ui/components/FileTree.tsx'
import { ProjectStatus } from '../../modules/project/ui/components/ProjectStatus.tsx'
import { ResetProjectDialog } from '../../modules/project/ui/components/ResetProjectDialog.tsx'
import { TemplateLoadError } from '../../modules/project/ui/components/TemplateLoadError.tsx'
import { useTemplateProject } from '../../modules/project/ui/hooks/use-template-project.ts'
import { OutputPanels, type OutputPanel } from '../../modules/runtime/ui/components/OutputPanels.tsx'
import { RunToolbar } from '../../modules/runtime/ui/components/RunToolbar.tsx'
import { useSandboxRuntime } from '../../modules/runtime/ui/hooks/use-sandbox-runtime.ts'
import { useWriteProjectFiles } from '../../modules/runtime/ui/hooks/use-write-project-files.ts'
import { Toolbar } from '../../ui/Toolbar.tsx'
import { WorkbenchLayout } from '../../ui/WorkbenchLayout.tsx'

export const PlayTemplatePage = ({ templateName }: { readonly templateName: string }) => {
  const { t } = useTranslation('editor')
  const project = useTemplateProject(templateName)
  const edits = useEditFiles({ onPersist: project.handleSave, onSync: useWriteProjectFiles(templateName) })
  const runtime = useSandboxRuntime(templateName, edits.commitPending)
  const languageService = useLanguageService(templateName)
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [panel, setPanel] = useState<OutputPanel>('console')

  const { template, failure } = project
  if (failure !== undefined) return <TemplateLoadError failure={failure} />
  if (template === undefined) return null

  const path = selectedPath ?? template.entry

  return (
    <WorkbenchLayout
      toolbar={
        <Toolbar>
          <ProjectStatus
            title={template.title}
            isModified={project.modifiedPaths.length > 0}
            saveFailed={project.saveFailed}
          />
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
          selectedPath={path}
          modifiedPaths={project.modifiedPaths}
          onSelect={setSelectedPath}
        />
      }
      main={
        <CodeEditor
          key={template.generation}
          path={path}
          content={template.contentOf(path)}
          label={t('label')}
          languageService={languageService}
          onChange={edits.handleChange}
        />
      }
      bottom={
        <OutputPanels active={panel} onActiveChange={setPanel} console={runtime.console} testRun={runtime.testRun} />
      }
    />
  )
}
