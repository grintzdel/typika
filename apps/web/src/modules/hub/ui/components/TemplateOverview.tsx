import { useTranslation } from 'react-i18next'

import type { TemplatePage } from '../../core/domain/hub.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type TemplateOverviewProps = {
  readonly page: TemplatePage
}

const topicHref = (topic: string) => `/templates?${new URLSearchParams({ topic }).toString()}`

export const TemplateOverview = ({ page }: TemplateOverviewProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  return (
    <div className="space-y-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
      <nav aria-label={t('template.trail')}>
        <ol className="flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>
            <a href="/templates" className="hover:text-sky-700">
              {t('nav.templates')}
            </a>
          </li>
          {page.trail.map((crumb) => (
            <li key={crumb.topic} className="before:mr-2 before:content-['/']">
              <a href={topicHref(crumb.topic)} className="hover:text-sky-700">
                {crumb.family === undefined ? labels.category(crumb.category) : labels.family(crumb.family)}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div>
        <h1 className="text-2xl font-semibold">{page.title}</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">{page.summary}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <nav aria-label={t('template.language')} className="flex items-center gap-2">
          <span className="text-neutral-600 dark:text-neutral-400">{t('template.language')}</span>
          {page.languages.map(({ language, name }) => (
            <a
              key={name}
              href={`/templates/${name}`}
              aria-current={name === page.name ? 'page' : undefined}
              className="rounded border border-neutral-200 px-2 py-0.5 hover:border-sky-600 aria-[current=page]:border-sky-700 aria-[current=page]:bg-sky-50 dark:border-neutral-800 dark:aria-[current=page]:bg-sky-950"
            >
              {labels.language(language)}
            </a>
          ))}
        </nav>
        <p>
          <span className="text-neutral-600 dark:text-neutral-400">{t('template.level')} </span>
          {labels.level(page.level)}
        </p>
      </div>
      <a
        href={`/play/${page.name}`}
        className="inline-flex h-9 items-center rounded-md bg-sky-700 px-3.5 text-sm font-medium text-white hover:bg-sky-800"
      >
        {t('template.open')}
      </a>
    </div>
  )
}
