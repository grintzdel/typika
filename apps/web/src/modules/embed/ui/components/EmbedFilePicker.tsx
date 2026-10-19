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
      className="h-7 max-w-[40%] min-w-0 truncate rounded-md border border-neutral-300 bg-white px-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
    >
      {paths.map((path) => (
        <option key={path} value={path}>
          {path}
        </option>
      ))}
    </select>
  )
}
