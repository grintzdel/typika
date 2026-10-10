import type { ReactNode } from 'react'

export type WorkbenchLayoutProps = {
  readonly toolbar: ReactNode
  readonly sidebar: ReactNode
  readonly main: ReactNode
  readonly bottom: ReactNode
}

export const WorkbenchLayout = ({ toolbar, sidebar, main, bottom }: WorkbenchLayoutProps) => (
  <div className="grid h-dvh grid-cols-[minmax(10rem,16rem)_1fr] grid-rows-[auto_1fr_minmax(10rem,35%)]">
    <header className="col-span-2 border-b border-neutral-200 dark:border-neutral-800">{toolbar}</header>
    <nav className="row-span-2 overflow-auto border-r border-neutral-200 dark:border-neutral-800">{sidebar}</nav>
    <main className="min-h-0 overflow-hidden">{main}</main>
    <div className="flex min-h-0 flex-col border-t border-neutral-200 dark:border-neutral-800">{bottom}</div>
  </div>
)
