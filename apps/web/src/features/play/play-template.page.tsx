import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeEditor } from '../../modules/editor/ui/components/CodeEditor.tsx'
import { useEditFiles } from '../../modules/editor/ui/hooks/use-edit-files.ts'
import { FileTree } from '../../modules/project/ui/components/FileTree.tsx'
import { TemplateLoadError } from '../../modules/project/ui/components/TemplateLoadError.tsx'
import { useOpenTemplate } from '../../modules/project/ui/hooks/use-open-template.ts'
import { OutputPanels, type OutputPanel } from '../../modules/runtime/ui/components/OutputPanels.tsx'
import { RunToolbar } from '../../modules/runtime/ui/components/RunToolbar.tsx'
import { useSandboxRuntime } from '../../modules/runtime/ui/hooks/use-sandbox-runtime.ts'
import { useWriteProjectFiles } from '../../modules/runtime/ui/hooks/use-write-project-files.ts'
import { WorkbenchLayout } from '../../ui/WorkbenchLayout.tsx'

export const PlayTemplatePage = ({ templateName }: { readonly templateName: string }) => {
  const { t } = useTranslation('editor')
  const { template, failure } = useOpenTemplate(templateName)
  const edits = useEditFiles(useWriteProjectFiles(templateName))
  const runtime = useSandboxRuntime(templateName, edits.takePending)
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined)
  const [panel, setPanel] = useState<OutputPanel>('console')

  if (failure !== undefined) return <TemplateLoadError failure={failure} />
  if (template === undefined) return null

  const path = selectedPath ?? template.entry

  return (
    <WorkbenchLayout
      toolbar={
        <RunToolbar
          title={template.title}
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
      }
      sidebar={<FileTree nodes={template.tree} selectedPath={path} onSelect={setSelectedPath} />}
      main={
        <CodeEditor path={path} content={template.contentOf(path)} label={t('label')} onChange={edits.handleChange} />
      }
      bottom={
        <OutputPanels active={panel} onActiveChange={setPanel} console={runtime.console} testRun={runtime.testRun} />
      }
    />
  )
}
