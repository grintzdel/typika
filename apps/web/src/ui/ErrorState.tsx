import type { ReactNode } from 'react'

export type ErrorStateProps = {
  readonly title: string
  readonly children?: ReactNode
}

export const ErrorState = ({ title, children }: ErrorStateProps) => (
  <div role="alert" className="mx-auto mt-16 flex max-w-dialog flex-col gap-3 px-6 text-center">
    <h1 className="text-2xl font-bold">{title}</h1>
    {children}
  </div>
)
