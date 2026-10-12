import { useTranslation } from 'react-i18next'

import { Skeleton } from '../../../../ui/Skeleton.tsx'

const CARDS = 6

export const TemplateListSkeleton = () => {
  const { t } = useTranslation('home')
  return (
    <div role="status" aria-label={t('loading')} className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: CARDS }, (_, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}
