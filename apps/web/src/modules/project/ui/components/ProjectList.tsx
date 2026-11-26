import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ConfirmButton } from '../../../../ui/ConfirmButton.tsx'
import { languageNameOf } from '../../../shared/core/domain/language-name.domain-model.ts'
import type { ProjectListItem } from '../../core/domain/project.domain-model.ts'
import { ExportDialog } from './ExportDialog.tsx'
import { relativeTime } from './relative-time.ts'

export type ProjectListProps = {
  readonly projects: ReadonlyArray<ProjectListItem>
  readonly now: number
  readonly onRename: (id: string, name: string) => void
  readonly onDuplicate: (id: string, name: string) => void
  readonly onDelete: (id: string) => void
  readonly onExport: (id: string, includeTypikaFiles: boolean) => void
}

type ProjectRowProps = Omit<ProjectListProps, 'projects'> & { readonly project: ProjectListItem }

const RenameForm = ({
  name,
  onSubmit,
  onCancel,
}: {
  readonly name: string
  readonly onSubmit: (name: string) => void
  readonly onCancel: () => void
}) => {
  const { t } = useTranslation('project')
  const [value, setValue] = useState(name)
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value)
      }}
    >
      <input
        aria-label={t('list.nameLabel')}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
        }}
        autoFocus
        className="min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 text-base"
      />
      <Button type="submit" variant="primary">
        {t('list.save')}
      </Button>
      <Button onClick={onCancel}>{t('list.cancel')}</Button>
    </form>
  )
}

const ProjectRow = ({ project, now, onRename, onDuplicate, onDelete, onExport }: ProjectRowProps) => {
  const { t, i18n } = useTranslation('project')
  const [isRenaming, setRenaming] = useState(false)
  const details = [
    project.isPersonal ? t('list.personal') : (project.templateTitle ?? project.templateName),
    ...(project.language === undefined ? [] : [languageNameOf(project.language)]),
    ...(project.exercise === undefined ? [] : [t('list.exercise', { name: project.exercise })]),
    t('recent.modified', { time: relativeTime(i18n.language, now - project.updatedAt) }),
  ]
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <RenameForm
            name={project.name}
            onCancel={() => setRenaming(false)}
            onSubmit={(name) => {
              setRenaming(false)
              onRename(project.id, name)
            }}
          />
        ) : (
          <a href={project.path} className="font-semibold text-link underline underline-offset-2 hover:text-link-hover">
            {project.name}
          </a>
        )}
        <p className="text-base text-fg-muted">{details.join(' · ')}</p>
      </div>
      {isRenaming ? null : (
        <div className="flex gap-2">
          <Button onClick={() => setRenaming(true)}>{t('list.rename')}</Button>
          <Button onClick={() => onDuplicate(project.id, t('list.copyName', { name: project.name }))}>
            {t('list.duplicate')}
          </Button>
          <ExportDialog onExport={(includeTypikaFiles) => onExport(project.id, includeTypikaFiles)} />
          <ConfirmButton
            title={t('list.deleteTitle', { name: project.name })}
            description={t('list.deleteDescription')}
            confirm={t('list.delete')}
            cancel={t('list.cancel')}
            onConfirm={() => onDelete(project.id)}
          >
            {t('list.delete')}
          </ConfirmButton>
        </div>
      )}
    </li>
  )
}

export const ProjectList = ({ projects, ...row }: ProjectListProps) => {
  const { t } = useTranslation('project')
  if (projects.length === 0)
    return (
      <div className="space-y-3 py-6">
        <p className="text-fg-muted">{t('list.empty')}</p>
        <a href="/templates" className="text-link underline underline-offset-2 hover:text-link-hover">
          {t('list.browse')}
        </a>
      </div>
    )
  return (
    <ul aria-label={t('list.label')} className="divide-y divide-border">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} {...row} />
      ))}
    </ul>
  )
}
