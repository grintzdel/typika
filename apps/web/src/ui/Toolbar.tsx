import type { ReactNode } from 'react'

export const Toolbar = ({ children }: { readonly children: ReactNode }) => (
  <div className="flex items-center gap-3 px-3 py-2">{children}</div>
)
