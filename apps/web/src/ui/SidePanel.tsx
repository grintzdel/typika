import type { ReactNode } from 'react'

import { Tab, Tabs, TabsList, TabsPanel } from './Tabs.tsx'

export type SidePanelItem<V extends string> = {
  readonly value: V
  readonly label: string
  readonly content: ReactNode
}

export type SidePanelProps<V extends string> = {
  readonly label: string
  readonly active: V
  readonly items: ReadonlyArray<SidePanelItem<V>>
  readonly onActiveChange: (value: V) => void
}

export const SidePanel = <V extends string>({ label, active, items, onActiveChange }: SidePanelProps<V>) => (
  <aside aria-label={label} className="flex h-full min-h-0 flex-col">
    <Tabs
      value={active}
      onValueChange={(value) => {
        const item = items.find((candidate) => candidate.value === value)
        if (item !== undefined) onActiveChange(item.value)
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList>
        {items.map((item) => (
          <Tab key={item.value} value={item.value}>
            {item.label}
          </Tab>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsPanel key={item.value} value={item.value} className="overflow-hidden">
          {item.content}
        </TabsPanel>
      ))}
    </Tabs>
  </aside>
)
