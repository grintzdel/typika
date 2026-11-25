import { useTranslation } from 'react-i18next'

import { TemplateSort } from '../../core/domain/constants/template-sort.constant.ts'

export type ResultsToolbarProps = {
  readonly count: number
  readonly sort: TemplateSort
  readonly canRankByRelevance: boolean
  readonly onSort: (sort: TemplateSort) => void
}

const SORTS: ReadonlyArray<TemplateSort> = Object.values(TemplateSort)

const isSort = (value: string): value is TemplateSort => (SORTS as ReadonlyArray<string>).includes(value)

export const ResultsToolbar = ({ count, sort, canRankByRelevance, onSort }: ResultsToolbarProps) => {
  const { t } = useTranslation('hub')
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-base">
      <p role="status" className="text-fg-muted">
        {t('list.count', { count })}
      </p>
      <label className="flex items-center gap-2">
        {t('list.sortBy')}
        <select
          value={sort}
          onChange={(event) => isSort(event.target.value) && onSort(event.target.value)}
          className="min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3"
        >
          {SORTS.filter((option) => canRankByRelevance || option !== TemplateSort.RELEVANCE).map((option) => (
            <option key={option} value={option}>
              {t(`list.sorts.${option}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
