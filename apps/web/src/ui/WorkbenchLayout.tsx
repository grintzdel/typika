import type { ReactNode } from 'react'

export type WorkbenchLayoutProps = {
  readonly toolbar: ReactNode
  readonly sidebar: ReactNode
  readonly main: ReactNode
  readonly aside?: ReactNode
  readonly bottom: ReactNode
}

export const WorkbenchLayout = ({ toolbar, sidebar, main, aside, bottom }: WorkbenchLayoutProps) => (
  <div
    className={`grid h-dvh grid-rows-[auto_1fr_minmax(10rem,35%)] ${aside === undefined ? 'grid-cols-[minmax(10rem,16rem)_1fr]' : 'grid-cols-[minmax(10rem,16rem)_1fr_minmax(18rem,26rem)]'}`}
  >
    <header className="col-span-full border-b border-neutral-200 dark:border-neutral-800">{toolbar}</header>
    <nav className="row-span-2 overflow-auto border-r border-neutral-200 dark:border-neutral-800">{sidebar}</nav>
    <main className="min-h-0 overflow-hidden">{main}</main>
    {aside === undefined ? null : (
      <div className="min-h-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-800">{aside}</div>
    )}
    <div
      className={`flex min-h-0 flex-col border-t border-neutral-200 dark:border-neutral-800 ${aside === undefined ? '' : 'col-span-2'}`}
    >
      {bottom}
    </div>
  </div>
)
