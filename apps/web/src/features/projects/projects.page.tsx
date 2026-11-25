import { useTranslation } from 'react-i18next'

import { useLanguageMenu } from '../../modules/app/ui/hooks/use-language-menu.ts'
import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { ProjectList } from '../../modules/project/ui/components/ProjectList.tsx'
import { StorageUsage } from '../../modules/project/ui/components/StorageUsage.tsx'
import { useProjects } from '../../modules/project/ui/hooks/use-projects.ts'
import { Skeleton } from '../../ui/Skeleton.tsx'

export const ProjectsPage = () => {
  const { t } = useTranslation('project')
  const languageMenu = useLanguageMenu()
  const projects = useProjects()
  return (
    <>
      <HubHeader languageMenu={languageMenu} />
      <main className="mx-auto max-w-page space-y-4 px-6 py-8">
        <h1 className="text-page-title font-bold">{t('projects.title')}</h1>
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
