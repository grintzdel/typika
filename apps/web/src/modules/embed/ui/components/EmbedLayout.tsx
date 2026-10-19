import type { ReactNode, Ref } from 'react'

export type EmbedLayoutProps = {
  readonly rootRef: Ref<HTMLDivElement>
  readonly toolbar: ReactNode
  readonly step: ReactNode
  readonly main: ReactNode
  readonly bottom: ReactNode
  readonly onMainFocus: () => void
}

export const EmbedLayout = ({ rootRef, toolbar, step, main, bottom, onMainFocus }: EmbedLayoutProps) => (
  <div ref={rootRef} className="flex h-dvh flex-col">
    <header className="border-b border-neutral-200 dark:border-neutral-800">{toolbar}</header>
    {step}
    <main className="min-h-0 flex-1 overflow-hidden" onFocus={onMainFocus}>
      {main}
    </main>
    {bottom === null ? null : (
      <div className="flex h-[40%] min-h-[8rem] flex-col border-t border-neutral-200 dark:border-neutral-800">
        {bottom}
      </div>
    )}
  </div>
)
