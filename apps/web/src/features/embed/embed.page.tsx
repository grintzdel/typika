import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeEditor } from '../../modules/editor/ui/components/CodeEditor.tsx'
import { useLanguageService } from '../../modules/editor/ui/hooks/use-language-service.ts'
import { EmbedPanel } from '../../modules/embed/core/domain/constants/embed-option.constant.ts'
import type { EmbedOptions } from '../../modules/embed/core/domain/embed.domain-model.ts'
import { EmbedFilePicker } from '../../modules/embed/ui/components/EmbedFilePicker.tsx'
import { EmbedLayout } from '../../modules/embed/ui/components/EmbedLayout.tsx'
import { EmbedTourStep } from '../../modules/embed/ui/components/EmbedTourStep.tsx'
import { OpenInTypikaLink } from '../../modules/embed/ui/components/OpenInTypikaLink.tsx'
import { useEmbedHost } from '../../modules/embed/ui/hooks/use-embed-host.ts'
import { useEmbedOpenLink } from '../../modules/embed/ui/hooks/use-embed-open-link.ts'
import { useEmbedRuntime } from '../../modules/embed/ui/hooks/use-embed-runtime.ts'
import { isTypikaFile } from '../../modules/project/core/domain/file-tree.domain-model.ts'
import { embedProjectKeyOf } from '../../modules/project/core/domain/project.domain-model.ts'
import { TemplateLoadError } from '../../modules/project/ui/components/TemplateLoadError.tsx'
import { WorkbenchSkeleton } from '../../modules/project/ui/components/WorkbenchSkeleton.tsx'
import { useTemplateProject } from '../../modules/project/ui/hooks/use-template-project.ts'
import { OutputPanels, type OutputPanel } from '../../modules/runtime/ui/components/OutputPanels.tsx'
import { RunToolbar } from '../../modules/runtime/ui/components/RunToolbar.tsx'
import { anchorOf } from '../../modules/tour/core/domain/tour.domain-model.ts'
import { Toolbar } from '../../ui/Toolbar.tsx'

export type EmbedPageProps = {
  readonly templateName: string
  readonly options: EmbedOptions
}

export const EmbedPage = ({ templateName, options }: EmbedPageProps) => {
  const { t } = useTranslation('editor')
  const projectKey = embedProjectKeyOf(templateName)
  const project = useTemplateProject(projectKey)
  const { template, failure } = project
  const runtime = useEmbedRuntime(projectKey, options, template?.runtime)
  const host = useEmbedHost({ options, isLoaded: template !== undefined, testRun: runtime.testRun })
  const openHref = useEmbedOpenLink(projectKey, template, runtime.editedFiles)
  const [isEditing, setEditing] = useState(false)
  const languageService = useLanguageService(projectKey, { isStarted: isEditing })
  const [panel, setPanel] = useState<OutputPanel>(options.panel === EmbedPanel.TESTS ? 'tests' : 'console')
  const [selection, setSelection] = useState<{ readonly step: string | undefined; readonly path: string }>()

  if (failure !== undefined) return <TemplateLoadError failure={failure} onRetry={project.handleRetry} />
  if (template === undefined) return <WorkbenchSkeleton />

  const step = template.tourSteps.find(({ id }) => id === host.tourStep)
  const requested = options.file ?? template.entry
  const path = (selection?.step === host.tourStep ? selection?.path : undefined) ?? step?.file ?? requested
  const anchor =
    step?.file === path
      ? anchorOf(step, runtime.editedContentOf(path) ?? template.contentOf(path), template.originalOf(path))
      : undefined
  const highlight =
    anchor?._tag === 'Highlighted' ? anchor.range : path === requested && step === undefined ? options.lines : undefined

  return (
    <EmbedLayout
      rootRef={host.rootRef}
      onMainFocus={() => setEditing(true)}
      toolbar={
        <Toolbar>
          <EmbedFilePicker
            paths={[...template.files.keys()].filter((file) => !isTypikaFile(file)).toSorted()}
            selected={path}
            onSelect={(file) => setSelection({ step: host.tourStep, path: file })}
          />
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
          <OpenInTypikaLink href={openHref} />
        </Toolbar>
      }
      step={step === undefined ? null : <EmbedTourStep title={step.title} body={step.body} />}
      main={
        <CodeEditor
          key={template.generation}
          documentKey={path}
          path={path}
          content={template.contentOf(path)}
          readOnly={options.readOnly || isTypikaFile(path)}
          highlight={highlight}
          diagnostics={runtime.diagnostics.filter((diagnostic) => diagnostic.location?.file === path)}
          label={t('label')}
          languageService={languageService.session}
          onChange={runtime.handleChange}
        />
      }
      bottom={
        options.panel === EmbedPanel.NONE ? null : (
          <OutputPanels active={panel} onActiveChange={setPanel} console={runtime.console} testRun={runtime.testRun} />
        )
      }
    />
  )
}
