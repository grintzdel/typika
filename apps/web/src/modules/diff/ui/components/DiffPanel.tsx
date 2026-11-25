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
  readonly hasSolution: boolean
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
  [FileChangeStatus.ADDED]: 'text-success-text',
  [FileChangeStatus.MODIFIED]: 'text-warning-text',
  [FileChangeStatus.DELETED]: 'text-danger-text',
}

export const DiffPanel = ({
  source,
  baseName,
  hasSolution,
  changes,
  isLoading,
  onSourceChange,
  onOpen,
}: DiffPanelProps) => {
  const { t } = useTranslation('diff')

  return (
    <div className="flex h-full min-h-0 flex-col text-compact">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Button
          aria-pressed={source === DiffSource.BASE}
          disabled={baseName === undefined}
          onClick={() => onSourceChange(DiffSource.BASE)}
        >
          {t('sinceBase')}
        </Button>
        <Button aria-pressed={source === DiffSource.MINE} onClick={() => onSourceChange(DiffSource.MINE)}>
          {t('mine')}
        </Button>
        {hasSolution ? (
          <Button aria-pressed={source === DiffSource.SOLUTION} onClick={() => onSourceChange(DiffSource.SOLUTION)}>
            {t('solution')}
          </Button>
        ) : null}
        {source === DiffSource.BASE && baseName !== undefined ? (
          <a
            href={`/play/${baseName}`}
            target="_blank"
            rel="noopener"
            className="ml-auto text-link underline underline-offset-2 hover:text-link-hover"
          >
            {t('openBase')}
          </a>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {isLoading ? <p className="px-2 text-fg-muted">{t('loading')}</p> : null}
        {!isLoading && changes.length === 0 ? <p className="px-2 text-fg-muted">{t('empty')}</p> : null}
        {!isLoading && changes.length > 0 ? (
          <ul aria-label={t('files')}>
            {changes.map((change) => (
              <li key={change.path}>
                <button
                  type="button"
                  aria-label={`${change.path}, ${t(`status.${change.status}`)}`}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-surface-muted"
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
