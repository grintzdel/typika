import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { TemplatePage } from '../../core/domain/hub.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type TemplateDetailsProps = {
  readonly page: TemplatePage
}

const Section = ({
  id,
  title,
  children,
}: {
  readonly id: string
  readonly title: string
  readonly children: ReactNode
}) => (
  <section aria-labelledby={id}>
    <h2 id={id} className="mb-2 font-semibold">
      {title}
    </h2>
    {children}
  </section>
)

export const TemplateDetails = ({ page }: TemplateDetailsProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  const variants = page.languages.filter(({ name }) => name !== page.name)
  return (
    <div className="grid gap-8 py-6 md:grid-cols-[1fr_16rem]">
      <div className="space-y-6">
        <Section id="template-tour" title={t('template.tour')}>
          <ol className="list-decimal space-y-1 pl-6 text-sm">
            {page.tourSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>
        {page.base === undefined ? null : (
          <Section id="template-base" title={t('template.base')}>
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <span>{t('template.baseName', { name: page.base })}</span>
              <a href={`/play/${page.name}?panel=diff`} className="text-sky-700 hover:underline">
                {t('template.viewDiff')}
              </a>
            </p>
            {page.parent === undefined ? null : (
              <p className="mt-1 text-sm">
                <a href={`/templates/${page.parent}`} className="text-sky-700 hover:underline">
                  {t('template.parent', { name: page.parent })}
                </a>
              </p>
            )}
          </Section>
        )}
        <Section id="template-exercises" title={t('template.exercises')}>
          <ul className="space-y-1 text-sm">
            {page.exercises.map((exercise) => (
              <li key={exercise.name}>
                <a
                  href={`/play/${page.name}?exercise=${encodeURIComponent(exercise.name)}`}
                  className="text-sky-700 hover:underline"
                >
                  {exercise.title}{' '}
                  <span className="text-neutral-600 dark:text-neutral-400">
                    ({t(`template.exerciseKinds.${exercise.kind}`)})
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <aside className="space-y-6 text-sm">
        <Section id="template-topics" title={t('template.topics')}>
          <ul className="space-y-1">
            {page.topics.map((topic) => (
              <li key={topic.id}>{topic.label}</li>
            ))}
          </ul>
        </Section>
        {variants.length === 0 ? null : (
          <Section id="template-variants" title={t('template.variants')}>
            <ul className="flex flex-wrap gap-3">
              {variants.map(({ language, name }) => (
                <li key={name}>
                  <a href={`/templates/${name}`} className="text-sky-700 hover:underline">
                    {labels.language(language)}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <Section id="template-about" title={t('template.about')}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-neutral-600 dark:text-neutral-400">{t('template.maintainers')}</dt>
            <dd>{page.maintainers.join(', ')}</dd>
            <dt className="text-neutral-600 dark:text-neutral-400">{t('template.license')}</dt>
            <dd>{page.license}</dd>
            <dt className="text-neutral-600 dark:text-neutral-400">{t('template.ref')}</dt>
            <dd className="font-mono text-xs break-all">{page.ref}</dd>
          </dl>
        </Section>
      </aside>
    </div>
  )
}
