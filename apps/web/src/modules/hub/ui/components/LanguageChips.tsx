import { useHubLabels } from '../hooks/use-hub-labels.ts'

export type LanguageChipsProps = {
  readonly languages: ReadonlyArray<string>
}

export const LanguageChips = ({ languages }: LanguageChipsProps) => {
  const labels = useHubLabels()
  return (
    <span className="mt-3 flex flex-wrap gap-2 text-sm">
      {languages.map((language) => (
        <span key={language} className="rounded-full bg-surface-muted px-3 py-0.5">
          {labels.language(language)}
        </span>
      ))}
    </span>
  )
}
