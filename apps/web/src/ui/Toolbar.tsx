import type { ReactNode } from 'react'

export const Toolbar = ({ children }: { readonly children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">{children}</div>
)
