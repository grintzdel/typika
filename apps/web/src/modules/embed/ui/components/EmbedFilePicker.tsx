import { useTranslation } from 'react-i18next'

export type EmbedFilePickerProps = {
  readonly paths: ReadonlyArray<string>
  readonly selected: string | undefined
  readonly onSelect: (path: string) => void
}

export const EmbedFilePicker = ({ paths, selected, onSelect }: EmbedFilePickerProps) => {
  const { t } = useTranslation('embed')
  return (
    <select
      aria-label={t('file')}
      value={selected ?? ''}
      onChange={(event) => onSelect(event.target.value)}
      className="min-h-control-sm max-w-[40%] min-w-0 truncate rounded-md border border-border-strong bg-surface-raised px-3 font-mono text-sm"
    >
      {paths.map((path) => (
        <option key={path} value={path}>
          {path}
        </option>
      ))}
    </select>
  )
}
