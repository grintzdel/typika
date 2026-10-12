import { useTranslation } from 'react-i18next'

import { Facet } from '../../core/domain/constants/facet.constant.ts'
import type { FacetOptions, TemplateFilters } from '../../core/domain/template-filters.domain-model.ts'
import type { FacetCounts } from '../../core/domain/template-query.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type FacetFiltersProps = {
  readonly options: FacetOptions
  readonly filters: TemplateFilters
  readonly counts: FacetCounts
  readonly onToggle: (facet: Facet, value: string) => void
}

const FacetCheckbox = ({
  label,
  count,
  checked,
  onChange,
}: {
  readonly label: string
  readonly count: number
  readonly checked: boolean
  readonly onChange: () => void
}) => (
  <label
    className={`flex items-center gap-2 py-0.5 text-sm ${count === 0 && !checked ? 'text-neutral-400 dark:text-neutral-600' : ''}`}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={count === 0 && !checked}
      onChange={onChange}
      className="accent-sky-700"
    />
    {label} <span className="ml-auto text-xs text-neutral-500 tabular-nums dark:text-neutral-400">{count}</span>
  </label>
)

export const FacetFilters = ({ options, filters, counts, onToggle }: FacetFiltersProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  const isChecked = (facet: Facet, value: string) => filters[facet].includes(value)
  const countOf = (facet: Facet, value: string) => counts[facet][value] ?? 0
  return (
    <div aria-label={t('facets.label')} role="group" className="space-y-5">
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{labels.facet(Facet.TOPIC)}</legend>
        <ul>
          {options.topics.map((option) => (
            <li key={option.topic}>
              <FacetCheckbox
                label={labels.category(option.category)}
                count={countOf(Facet.TOPIC, option.topic)}
                checked={isChecked(Facet.TOPIC, option.topic)}
                onChange={() => onToggle(Facet.TOPIC, option.topic)}
              />
              <ul className="ml-5">
                {option.families.map((family) => (
                  <li key={family.topic}>
                    <FacetCheckbox
                      label={labels.family(family.family)}
                      count={countOf(Facet.TOPIC, family.topic)}
                      checked={isChecked(Facet.TOPIC, family.topic)}
                      onChange={() => onToggle(Facet.TOPIC, family.topic)}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </fieldset>
      {options.values.map(({ facet, values }) => (
        <fieldset key={facet}>
          <legend className="mb-1 text-sm font-semibold">{labels.facet(facet)}</legend>
          {values.map((value) => (
            <FacetCheckbox
              key={value}
              label={labels.value(facet, value)}
              count={countOf(facet, value)}
              checked={isChecked(facet, value)}
              onChange={() => onToggle(facet, value)}
            />
          ))}
        </fieldset>
      ))}
    </div>
  )
}
