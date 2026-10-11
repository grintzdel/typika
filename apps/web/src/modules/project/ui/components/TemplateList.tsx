import type { Language } from '@typika/manifest'
import { useTranslation } from 'react-i18next'

import type { TemplateSummary } from '../../core/domain/project.domain-model.ts'

const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  go: 'Go',
  kotlin: 'Kotlin',
}

export type TemplateListProps = {
  readonly templates: ReadonlyArray<TemplateSummary>
}

export const TemplateList = ({ templates }: TemplateListProps) => {
  const { t } = useTranslation('home')
  return (
    <ul aria-label={t('list')} className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => (
        <li key={template.name}>
          <a
            href={`/play/${template.name}`}
            className="block h-full rounded-lg border border-neutral-200 p-4 hover:border-sky-600 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-neutral-800 dark:hover:border-sky-500"
          >
            <span className="block font-semibold">{template.title}</span>
            <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">{template.summary}</span>
            <span className="mt-3 flex gap-2 text-xs">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                {LANGUAGE_NAMES[template.language]}
              </span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                {t(`levels.${template.level}`)}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
