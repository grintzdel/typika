import { useTranslation } from 'react-i18next'

import type { ListedTemplate } from '../../core/domain/hub.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'
import { HealthBadge } from './HealthBadge.tsx'

export type TemplateCardsProps = {
  readonly templates: ReadonlyArray<ListedTemplate>
}

export const TemplateCards = ({ templates }: TemplateCardsProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  return (
    <ul aria-label={t('list.results')} className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => (
        <li key={template.name}>
          <a
            href={`/templates/${template.name}`}
            className="block h-full rounded-lg border border-border bg-surface-raised p-5 shadow-sm transition-[border-color,box-shadow,translate] duration-150 hover:-translate-y-px hover:border-accent hover:shadow-md"
          >
            <span className="block font-semibold">{template.title}</span>
            <span className="mt-1 block text-base text-fg-muted">{template.summary}</span>
            <span className="mt-3 flex gap-2 text-sm">
              <span className="rounded-full bg-surface-muted px-3 py-0.5">{labels.language(template.language)}</span>
              <span className="rounded-full bg-surface-muted px-3 py-0.5">{labels.level(template.level)}</span>
              <HealthBadge status={template.health} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
