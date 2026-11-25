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
    className={`grid h-dvh grid-rows-[auto_1fr_minmax(11.25rem,35%)] bg-bg ${aside === undefined ? 'grid-cols-[minmax(12.5rem,17.5rem)_1fr]' : 'grid-cols-[minmax(12.5rem,17.5rem)_1fr_minmax(20rem,27.5rem)]'}`}
  >
    <header className="col-span-full border-b border-border bg-bg">{toolbar}</header>
    <nav className="row-span-2 overflow-auto border-r border-border bg-surface">{sidebar}</nav>
    <main className="min-h-0 overflow-hidden bg-surface-raised">{main}</main>
    {aside === undefined ? null : (
      <div className="min-h-0 overflow-hidden border-l border-border bg-surface">{aside}</div>
    )}
    <div
      className={`flex min-h-0 flex-col border-t border-border bg-surface ${aside === undefined ? '' : 'col-span-2'}`}
    >
      {bottom}
    </div>
  </div>
)
