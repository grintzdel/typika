import type { ReactNode } from 'react'

export type ErrorStateProps = {
  readonly title: string
  readonly children?: ReactNode
}

export const ErrorState = ({ title, children }: ErrorStateProps) => (
  <div role="alert" className="mx-auto mt-24 max-w-lg space-y-2 px-6 text-center">
    <h1 className="text-lg font-semibold">{title}</h1>
    {children}
  </div>
)
