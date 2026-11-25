export type SkeletonProps = {
  readonly className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div aria-hidden="true" className={`animate-pulse rounded-sm bg-skeleton ${className}`} />
)
