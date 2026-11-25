import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import type { ComponentProps } from 'react'

type WithClassName<P> = Omit<P, 'className'> & { readonly className?: string }

export const Tabs = BaseTabs.Root

export const TabsList = ({ className = '', ...props }: WithClassName<ComponentProps<typeof BaseTabs.List>>) => (
  <BaseTabs.List className={`flex gap-1 border-b border-border px-3 ${className}`} {...props} />
)

export const Tab = ({ className = '', ...props }: WithClassName<ComponentProps<typeof BaseTabs.Tab>>) => (
  <BaseTabs.Tab
    className={`relative min-h-10 rounded-sm px-3 text-compact text-fg-muted after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-t-[3px] hover:text-fg focus-visible:outline-offset-[-3px] aria-selected:font-bold aria-selected:text-fg aria-selected:after:bg-accent ${className}`}
    {...props}
  />
)

export const TabsPanel = ({ className = '', ...props }: WithClassName<ComponentProps<typeof BaseTabs.Panel>>) => (
  <BaseTabs.Panel className={`min-h-0 flex-1 overflow-auto ${className}`} {...props} />
)
