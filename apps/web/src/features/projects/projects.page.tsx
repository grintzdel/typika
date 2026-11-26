import { useTranslation } from 'react-i18next'

import { useLanguageMenu } from '../../modules/app/ui/hooks/use-language-menu.ts'
import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { NewProjectDialog } from '../../modules/project/ui/components/NewProjectDialog.tsx'
import { ProjectList } from '../../modules/project/ui/components/ProjectList.tsx'
import { StorageUsage } from '../../modules/project/ui/components/StorageUsage.tsx'
import { useNewProject } from '../../modules/project/ui/hooks/use-new-project.ts'
import { useProjects } from '../../modules/project/ui/hooks/use-projects.ts'
import { Button } from '../../ui/Button.tsx'
import { Skeleton } from '../../ui/Skeleton.tsx'

export const ProjectsPage = ({ initialTemplate }: { readonly initialTemplate: string | undefined }) => {
  const { t } = useTranslation('project')
  const languageMenu = useLanguageMenu()
  const projects = useProjects()
  const newProject = useNewProject({ initialTemplate })
  return (
    <>
      <HubHeader languageMenu={languageMenu} />
      <main className="mx-auto max-w-page space-y-4 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-page-title font-bold">{t('projects.title')}</h1>
          <Button variant="primary" size="md" onClick={() => newProject.handleOpenChange(true)}>
            {t('create.open')}
          </Button>
        </div>
        <NewProjectDialog
          isOpen={newProject.isOpen}
          initialTemplate={newProject.initialTemplate}
          templates={newProject.templates}
          isCreating={newProject.isCreating}
          hasFailed={newProject.hasFailed}
          onOpenChange={newProject.handleOpenChange}
          onCreateBlank={newProject.handleCreateBlank}
          onCopyTemplate={newProject.handleCopyTemplate}
        />
        <StorageUsage usage={projects.storage} />
        {projects.loadFailed ? (
          <p role="alert" className="text-base text-fg-muted">
            {t('projects.loadFailed')}
          </p>
        ) : projects.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <ProjectList
            projects={projects.projects}
            now={projects.now}
            onRename={projects.handleRename}
            onDuplicate={projects.handleDuplicate}
            onDelete={projects.handleDelete}
            onExport={projects.handleExport}
          />
        )}
      </main>
    </>
  )
}
