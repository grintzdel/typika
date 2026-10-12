import { useTranslation } from 'react-i18next'

import { Skeleton } from '../../../../ui/Skeleton.tsx'

export const WorkbenchSkeleton = () => {
  const { t } = useTranslation('project')
  return (
    <div role="status" aria-label={t('loading')} className="flex h-dvh flex-col gap-2 p-2">
      <Skeleton className="h-9 w-full" />
      <div className="flex min-h-0 flex-1 gap-2">
        <Skeleton className="w-56" />
        <Skeleton className="flex-1" />
        <Skeleton className="w-80" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
