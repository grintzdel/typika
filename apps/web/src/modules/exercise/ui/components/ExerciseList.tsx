import { useTranslation } from 'react-i18next'

export type ExerciseListProps = {
  readonly templateName: string
  readonly exercises: ReadonlyArray<{ readonly name: string; readonly title: string; readonly kind: string }>
  readonly solved: ReadonlyArray<string>
}

export const ExerciseList = ({ templateName, exercises, solved }: ExerciseListProps) => {
  const { t } = useTranslation('exercise')
  return (
    <ul aria-label={t('list')} className="space-y-1 px-2 py-3 text-compact">
      {exercises.map((exercise) => (
        <li key={exercise.name}>
          <a
            href={`/play/${templateName}?exercise=${exercise.name}`}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-surface-muted"
          >
            <span className="rounded-full bg-surface-muted px-3 py-0.5 font-mono text-sm">{exercise.kind}</span>
            <span>{exercise.title}</span>
            {solved.includes(exercise.name) ? (
              <span className="ml-auto text-sm font-semibold text-success-text">{t('solvedBadge')}</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  )
}
