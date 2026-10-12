import { useTranslation } from 'react-i18next'

import { Skeleton } from '../../../../ui/Skeleton.tsx'

const CARDS = ['a', 'b', 'c', 'd', 'e', 'f']

export const HubSkeleton = () => {
  const { t } = useTranslation('hub')
  return (
    <div role="status" aria-label={t('loading')} className="grid gap-3 py-10 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((card) => (
        <Skeleton key={card} className="h-28" />
      ))}
    </div>
  )
}
