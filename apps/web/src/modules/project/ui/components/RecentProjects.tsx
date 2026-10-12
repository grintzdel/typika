import { useTranslation } from 'react-i18next'

import type { RecentProject } from '../../core/domain/project.domain-model.ts'

export type RecentProjectsProps = {
  readonly projects: ReadonlyArray<RecentProject>
  readonly now: number
}

const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1_000],
]

const relativeTime = (language: string, elapsed: number) => {
  const [unit, size] = UNITS.find(([, length]) => elapsed >= length) ?? ['second', 1_000]
  return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(-Math.round(elapsed / size), unit)
}

export const RecentProjects = ({ projects, now }: RecentProjectsProps) => {
  const { t, i18n } = useTranslation('project')
  if (projects.length === 0) return null
  return (
    <section aria-labelledby="recent-projects" className="border-t border-neutral-200 py-6 dark:border-neutral-800">
      <h2 id="recent-projects" className="mb-2 font-semibold">
        {t('recent.title')}
      </h2>
      <ul className="space-y-1 text-sm">
        {projects.map((project) => (
          <li key={project.path}>
            <a href={project.path} className="text-sky-700 hover:underline">
              {project.exercise === undefined ? project.name : `${project.name} · ${project.exercise}`}
            </a>{' '}
            <span className="text-neutral-600 dark:text-neutral-400">
              · {t('recent.modified', { time: relativeTime(i18n.language, now - project.updatedAt) })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
