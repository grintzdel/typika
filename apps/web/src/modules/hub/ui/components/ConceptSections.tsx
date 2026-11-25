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
            <h2 id={`category-${section.category}`} className="text-xl font-bold">
              {labels.category(section.category)}
            </h2>
            <span className="flex gap-3 text-base">
              {section.families.map((family) => (
                <a
                  key={family}
                  href={topicHref(`${section.category}/${family}`)}
                  className="text-fg-muted hover:text-link"
                >
                  {labels.family(family)}
                </a>
              ))}
            </span>
            <a
              href={topicHref(section.category)}
              className="ml-auto text-base text-link underline underline-offset-2 hover:text-link-hover"
            >
              {t('seeAll')}
            </a>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {section.concepts.map((concept) => (
              <li key={concept.name}>
                <a
                  href={`/templates/${concept.name}`}
                  className="block h-full rounded-lg border border-border bg-surface-raised p-5 shadow-sm transition-[border-color,box-shadow,translate] duration-150 hover:-translate-y-px hover:border-accent hover:shadow-md"
                >
                  <span className="block font-semibold">{concept.label}</span>
                  <span className="mt-1 block text-base text-fg-muted">{concept.summary}</span>
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
