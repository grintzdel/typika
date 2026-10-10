import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import type { ComponentProps } from 'react'

type WithClassName<P> = Omit<P, 'className'> & { readonly className?: string }

export const Tabs = BaseTabs.Root

export const TabsList = ({ className = '', ...props }: WithClassName<ComponentProps<typeof BaseTabs.List>>) => (
  <BaseTabs.List
    className={`flex gap-1 border-b border-neutral-200 px-2 dark:border-neutral-800 ${className}`}
    {...props}
  />
)

export const Tab = ({ className = '', ...props }: WithClassName<ComponentProps<typeof BaseTabs.Tab>>) => (
  <BaseTabs.Tab
    className={`-mb-px border-b-2 border-transparent px-2 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-sky-600 data-[selected]:border-sky-700 data-[selected]:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 dark:data-[selected]:text-neutral-100 ${className}`}
    {...props}
  />
)

export const TabsPanel = ({ className = '', ...props }: WithClassName<ComponentProps<typeof BaseTabs.Panel>>) => (
  <BaseTabs.Panel className={`min-h-0 flex-1 overflow-auto ${className}`} {...props} />
)
