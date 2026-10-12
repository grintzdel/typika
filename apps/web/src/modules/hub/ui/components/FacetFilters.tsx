import { useTranslation } from 'react-i18next'

import { Facet } from '../../core/domain/constants/facet.constant.ts'
import type { FacetOptions, TemplateFilters } from '../../core/domain/template-filters.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type FacetFiltersProps = {
  readonly options: FacetOptions
  readonly filters: TemplateFilters
  readonly onToggle: (facet: Facet, value: string) => void
}

const FacetCheckbox = ({
  label,
  checked,
  onChange,
}: {
  readonly label: string
  readonly checked: boolean
  readonly onChange: () => void
}) => (
  <label className="flex items-center gap-2 py-0.5 text-sm">
    <input type="checkbox" checked={checked} onChange={onChange} className="accent-sky-700" />
    {label}
  </label>
)

export const FacetFilters = ({ options, filters, onToggle }: FacetFiltersProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  const isChecked = (facet: Facet, value: string) => filters[facet].includes(value)
  return (
    <div aria-label={t('facets.label')} role="group" className="space-y-5">
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{labels.facet(Facet.TOPIC)}</legend>
        <ul>
          {options.topics.map((option) => (
            <li key={option.topic}>
              <FacetCheckbox
                label={labels.category(option.category)}
                checked={isChecked(Facet.TOPIC, option.topic)}
                onChange={() => onToggle(Facet.TOPIC, option.topic)}
              />
              <ul className="ml-5">
                {option.families.map((family) => (
                  <li key={family.topic}>
                    <FacetCheckbox
                      label={labels.family(family.family)}
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
              checked={isChecked(facet, value)}
              onChange={() => onToggle(facet, value)}
            />
          ))}
        </fieldset>
      ))}
    </div>
  )
}
