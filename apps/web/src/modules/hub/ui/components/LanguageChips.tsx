import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type LanguageChipsProps = {
  readonly languages: ReadonlyArray<string>
}

export const LanguageChips = ({ languages }: LanguageChipsProps) => {
  const labels = useHubLabels()
  return (
    <span className="mt-3 flex flex-wrap gap-2 text-xs">
      {languages.map((language) => (
        <span key={language} className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
          {labels.language(language)}
        </span>
      ))}
    </span>
  )
}
