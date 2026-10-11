import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import {
  DiffSource,
  FileChangeStatus,
  type FileChange,
  type FileChangeStatus as Status,
} from '../../core/domain/file-changes.domain-model.ts'

export type DiffPanelProps = {
  readonly source: DiffSource
  readonly baseName: string | undefined
  readonly changes: ReadonlyArray<FileChange>
  readonly isLoading: boolean
  readonly onSourceChange: (source: DiffSource) => void
  readonly onOpen: (path: string) => void
}

const SIGNS: Readonly<Record<Status, string>> = {
  [FileChangeStatus.ADDED]: '+',
  [FileChangeStatus.MODIFIED]: '~',
  [FileChangeStatus.DELETED]: '-',
}

const SIGN_COLORS: Readonly<Record<Status, string>> = {
  [FileChangeStatus.ADDED]: 'text-green-700 dark:text-green-400',
  [FileChangeStatus.MODIFIED]: 'text-amber-700 dark:text-amber-400',
  [FileChangeStatus.DELETED]: 'text-red-700 dark:text-red-400',
}

export const DiffPanel = ({ source, baseName, changes, isLoading, onSourceChange, onOpen }: DiffPanelProps) => {
  const { t } = useTranslation('diff')

  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Button
          aria-pressed={source === DiffSource.BASE}
          disabled={baseName === undefined}
          className="aria-pressed:bg-sky-100 aria-pressed:text-sky-950 dark:aria-pressed:bg-sky-950 dark:aria-pressed:text-sky-100"
          onClick={() => onSourceChange(DiffSource.BASE)}
        >
          {t('sinceBase')}
        </Button>
        <Button
          aria-pressed={source === DiffSource.MINE}
          className="aria-pressed:bg-sky-100 aria-pressed:text-sky-950 dark:aria-pressed:bg-sky-950 dark:aria-pressed:text-sky-100"
          onClick={() => onSourceChange(DiffSource.MINE)}
        >
          {t('mine')}
        </Button>
        {source === DiffSource.BASE && baseName !== undefined ? (
          <a
            href={`/play/${baseName}`}
            target="_blank"
            rel="noopener"
            className="ml-auto text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
          >
            {t('openBase')}
          </a>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {isLoading ? <p className="px-2 text-neutral-600 dark:text-neutral-400">{t('loading')}</p> : null}
        {!isLoading && changes.length === 0 ? (
          <p className="px-2 text-neutral-600 dark:text-neutral-400">{t('empty')}</p>
        ) : null}
        {!isLoading && changes.length > 0 ? (
          <ul aria-label={t('files')}>
            {changes.map((change) => (
              <li key={change.path}>
                <button
                  type="button"
                  aria-label={`${change.path}, ${t(`status.${change.status}`)}`}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-sky-600 dark:hover:bg-neutral-800"
                  onClick={() => onOpen(change.path)}
                >
                  <span aria-hidden="true" className={`w-3 font-mono font-bold ${SIGN_COLORS[change.status]}`}>
                    {SIGNS[change.status]}
                  </span>
                  <span className="truncate">{change.path}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
