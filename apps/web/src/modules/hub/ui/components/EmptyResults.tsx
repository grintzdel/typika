import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import type { Facet } from '../../core/domain/constants/facet.constant.ts'
import type { ActiveFilter } from '../../core/domain/template-filters.domain-model.ts'
import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type EmptyResultsProps = {
  readonly active: ReadonlyArray<ActiveFilter>
  readonly onRemove: (facet: Facet, value: string) => void
  readonly onReset: () => void
}

export const EmptyResults = ({ active, onRemove, onReset }: EmptyResultsProps) => {
  const { t } = useTranslation('hub')
  const labels = useHubLabels()
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
      <p className="font-semibold">{t('list.empty')}</p>
      <ul aria-label={t('list.activeFilters')} className="mt-3 flex flex-wrap gap-2">
        {active.map(({ facet, value }) => (
          <li key={`${facet}=${value}`}>
            <Button onClick={() => onRemove(facet, value)}>
              {t('list.remove', { facet: labels.facet(facet), value: labels.value(facet, value) })}
              <span aria-hidden="true">×</span>
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="primary" className="mt-4" onClick={onReset}>
        {t('list.reset')}
      </Button>
    </div>
  )
}
