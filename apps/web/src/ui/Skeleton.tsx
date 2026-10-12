export type SkeletonProps = {
  readonly className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div aria-hidden="true" className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-800 ${className}`} />
)
