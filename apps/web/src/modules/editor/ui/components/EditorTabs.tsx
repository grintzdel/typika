import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EditorTabKind, type EditorTab } from '../../core/domain/editor-tabs.domain-model.ts'

export type EditorTabsProps = {
  readonly tabs: ReadonlyArray<EditorTab>
  readonly activeKey: string | undefined
  readonly onSelect: (key: string) => void
  readonly onClose: (key: string) => void
  readonly children: ReactNode
}

const nameOf = (path: string) => path.split('/').at(-1) ?? path

export const EditorTabs = ({ tabs, activeKey, onSelect, onClose, children }: EditorTabsProps) => {
  const { t } = useTranslation('editor')
  const id = useId()
  const buttons = useRef(new Map<string, HTMLButtonElement>())

  const labelOf = (tab: EditorTab) => {
    const name = nameOf(tab.path)
    const labels: Readonly<Record<EditorTabKind, string>> = {
      [EditorTabKind.FILE]: name,
      [EditorTabKind.ORIGINAL]: t('tabs.original', { name }),
      [EditorTabKind.BASE_DIFF]: t('tabs.baseDiff', { name }),
      [EditorTabKind.MINE_DIFF]: t('tabs.mineDiff', { name }),
      [EditorTabKind.SOLUTION_DIFF]: t('tabs.solutionDiff', { name }),
    }
    return labels[tab.kind]
  }
  const tabId = (index: number) => `${id}-tab-${index}`
  const activeIndex = tabs.findIndex((tab) => tab.key === activeKey)

  const select = (index: number) => {
    const tab = tabs.at(index % tabs.length)
    if (tab === undefined) return
    onSelect(tab.key)
    buttons.current.get(tab.key)?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number, key: string) => {
    switch (event.key) {
      case 'ArrowRight':
        select(index + 1)
        break
      case 'ArrowLeft':
        select(index - 1 + tabs.length)
        break
      case 'Home':
        select(0)
        break
      case 'End':
        select(tabs.length - 1)
        break
      case 'Delete':
        onClose(key)
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <div className="flex h-full flex-col">
      <div
        role="tablist"
        aria-label={t('tabs.label')}
        className="flex shrink-0 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.key === activeKey
          const label = labelOf(tab)
          return (
            <div
              key={tab.key}
              role="presentation"
              className={`flex items-center border-r border-neutral-200 text-sm dark:border-neutral-800 ${isActive ? 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400'}`}
            >
              <button
                ref={(element) => {
                  if (element === null) buttons.current.delete(tab.key)
                  else buttons.current.set(tab.key, element)
                }}
                type="button"
                role="tab"
                id={tabId(index)}
                title={tab.path}
                aria-selected={isActive}
                aria-keyshortcuts="Delete"
                tabIndex={isActive ? 0 : -1}
                className={`py-1.5 pl-3 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-600 ${tab.kind === EditorTabKind.FILE ? '' : 'italic'}`}
                onClick={() => onSelect(tab.key)}
                onKeyDown={(event) => handleKeyDown(event, index, tab.key)}
              >
                {label}
              </button>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                title={t('tabs.close', { name: label })}
                className="mx-1 rounded px-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                onClick={() => onClose(tab.key)}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <div
        role="tabpanel"
        className="min-h-0 flex-1"
        {...(activeIndex === -1 ? {} : { 'aria-labelledby': tabId(activeIndex) })}
      >
        {children}
      </div>
    </div>
  )
}
