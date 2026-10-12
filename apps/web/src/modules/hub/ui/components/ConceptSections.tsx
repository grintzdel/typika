import { useTranslation } from 'react-i18next'

import type { ConceptSection } from '../../core/domain/hub.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'
import { LanguageChips } from './LanguageChips.tsx'

export type ConceptSectionsProps = {
  readonly sections: ReadonlyArray<ConceptSection>
}

const topicHref = (topic: string) => `/templates?${new URLSearchParams({ topic }).toString()}`

export const ConceptSections = ({ sections }: ConceptSectionsProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.category} aria-labelledby={`category-${section.category}`}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id={`category-${section.category}`} className="text-lg font-semibold">
              {labels.category(section.category)}
            </h2>
            <span className="flex gap-3 text-sm">
              {section.families.map((family) => (
                <a
                  key={family}
                  href={topicHref(`${section.category}/${family}`)}
                  className="text-neutral-600 hover:text-sky-700 dark:text-neutral-400"
                >
                  {labels.family(family)}
                </a>
              ))}
            </span>
            <a href={topicHref(section.category)} className="ml-auto text-sm text-sky-700 hover:underline">
              {t('seeAll')}
            </a>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {section.concepts.map((concept) => (
              <li key={concept.name}>
                <a
                  href={`/templates/${concept.name}`}
                  className="block h-full rounded-lg border border-neutral-200 p-4 hover:border-sky-600 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-neutral-800 dark:hover:border-sky-500"
                >
                  <span className="block font-semibold">{concept.label}</span>
                  <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">{concept.summary}</span>
                  <LanguageChips languages={concept.languages.map(({ language }) => language)} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
