import { useTranslation } from 'react-i18next'

import type { TemplatePage } from '../../core/domain/hub.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'
import { HealthBadge } from './HealthBadge.tsx'

export type TemplateOverviewProps = {
  readonly page: TemplatePage
}

const topicHref = (topic: string) => `/templates?${new URLSearchParams({ topic }).toString()}`

export const TemplateOverview = ({ page }: TemplateOverviewProps) => {
  const { t, i18n } = useTranslation('hub')
  const labels = useHubLabels()
  return (
    <div className="space-y-4 border-b border-border pb-6">
      <nav aria-label={t('template.trail')}>
        <ol className="flex flex-wrap gap-2 text-base text-fg-muted">
          <li>
            <a href="/templates" className="hover:text-link">
              {t('nav.templates')}
            </a>
          </li>
          {page.trail.map((crumb) => (
            <li key={crumb.topic} className="before:mr-2 before:content-['/']">
              <a href={topicHref(crumb.topic)} className="hover:text-link">
                {crumb.family === undefined ? labels.category(crumb.category) : labels.family(crumb.family)}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div>
        <h1 lang="en" className="text-page-title font-bold">
          {page.title}
        </h1>
        <p lang="en" className="mt-1 text-fg-muted">
          {page.summary}
        </p>
        {i18n.resolvedLanguage === 'en' ? null : (
          <p className="mt-2 text-sm text-fg-subtle">{t('template.contentInEnglish')}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
        <nav aria-label={t('template.language')} className="flex items-center gap-2">
          <span className="text-fg-muted">{t('template.language')}</span>
          {page.languages.map(({ language, name }) => (
            <a
              key={name}
              href={`/templates/${name}`}
              aria-current={name === page.name ? 'page' : undefined}
              className="inline-flex min-h-target items-center rounded-full border border-border-strong px-3 hover:bg-surface-muted aria-[current=page]:border-accent aria-[current=page]:bg-selected-bg aria-[current=page]:font-semibold aria-[current=page]:text-selected-fg"
            >
              {labels.language(language)}
            </a>
          ))}
        </nav>
        <p>
          <span className="text-fg-muted">{t('template.level')} </span>
          {labels.level(page.level)}
        </p>
        <HealthBadge status={page.health?.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/play/${page.name}`}
          className="inline-flex min-h-control-md items-center rounded-md bg-accent px-5 text-base font-semibold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
        >
          {t('template.open')}
        </a>
        {page.comparisons.length === 0 ? null : (
          <nav aria-label={t('template.compare')} className="flex flex-wrap gap-2">
            {page.comparisons.map(({ language }) => (
              <a
                key={language}
                href={`/compare/${page.name}?${new URLSearchParams({ a: page.language, b: language }).toString()}`}
                className="inline-flex min-h-control-md items-center rounded-md border border-border-strong bg-surface-raised px-5 text-base font-semibold shadow-sm transition-colors duration-150 hover:bg-surface-muted"
              >
                {t('template.compareWith', { language: labels.language(language) })}
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
