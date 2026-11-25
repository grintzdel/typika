import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogPopup, DialogTitle } from '../../../../ui/Dialog.tsx'
import { matchPaths } from '../../core/domain/quick-open.domain-model.ts'

export type QuickOpenDialogProps = {
  readonly open: boolean
  readonly paths: ReadonlyArray<string>
  readonly onOpenChange: (open: boolean) => void
  readonly onOpen: (path: string) => void
}

const MAX_OPTIONS = 50

const splitPath = (path: string) => {
  const slash = path.lastIndexOf('/')
  return { folder: path.slice(0, slash + 1), name: path.slice(slash + 1) }
}

const QuickOpenList = ({ paths, onOpenChange, onOpen }: Omit<QuickOpenDialogProps, 'open'>) => {
  const { t } = useTranslation('editor')
  const id = useId()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const matches = matchPaths(paths, query).slice(0, MAX_OPTIONS)
  const optionId = (index: number) => `${id}-option-${index}`

  const open = (path: string | undefined) => {
    if (path === undefined) return
    onOpen(path)
    onOpenChange(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        setActiveIndex((index) => Math.min(index + 1, matches.length - 1))
        break
      case 'ArrowUp':
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
        open(matches[activeIndex])
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <>
      <input
        role="combobox"
        aria-label={t('quickOpen.label')}
        aria-expanded="true"
        aria-controls={`${id}-list`}
        aria-activedescendant={matches.length === 0 ? undefined : optionId(activeIndex)}
        aria-autocomplete="list"
        placeholder={t('quickOpen.placeholder')}
        value={query}
        className="min-h-control-md w-full rounded-md border border-border-strong bg-surface-raised px-3 text-base"
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={handleKeyDown}
      />
      {matches.length === 0 ? (
        <p role="status" className="text-fg-muted">
          {t('quickOpen.empty')}
        </p>
      ) : (
        <ul id={`${id}-list`} role="listbox" aria-label={t('quickOpen.label')} className="max-h-80 overflow-auto">
          {matches.map((path, index) => {
            const { folder, name } = splitPath(path)
            return (
              <li
                key={path}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                data-path={path}
                className="flex min-h-target cursor-pointer items-baseline gap-2 rounded-sm px-3 text-compact aria-selected:bg-selected-bg aria-selected:text-selected-fg"
                onClick={() => open(path)}
                onMouseMove={() => setActiveIndex(index)}
              >
                <span className="font-semibold">{name}</span>
                <span className="truncate text-sm text-fg-muted">{folder}</span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export const QuickOpenDialog = ({ open, paths, onOpenChange, onOpen }: QuickOpenDialogProps) => {
  const { t } = useTranslation('editor')
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogPopup>
        <DialogTitle>{t('quickOpen.label')}</DialogTitle>
        <QuickOpenList paths={paths} onOpenChange={onOpenChange} onOpen={onOpen} />
      </DialogPopup>
    </Dialog>
  )
}
