import { useTranslation } from 'react-i18next'

export type ExerciseListProps = {
  readonly templateName: string
  readonly exercises: ReadonlyArray<{ readonly name: string; readonly title: string; readonly kind: string }>
  readonly solved: ReadonlyArray<string>
}

export const ExerciseList = ({ templateName, exercises, solved }: ExerciseListProps) => {
  const { t } = useTranslation('exercise')
  return (
    <ul aria-label={t('list')} className="space-y-1 px-2 py-3 text-sm">
      {exercises.map((exercise) => (
        <li key={exercise.name}>
          <a
            href={`/play/${templateName}?exercise=${exercise.name}`}
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-sky-600 dark:hover:bg-neutral-800"
          >
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">
              {exercise.kind}
            </span>
            <span>{exercise.title}</span>
            {solved.includes(exercise.name) ? (
              <span className="ml-auto text-xs font-semibold text-green-700 dark:text-green-400">
                {t('solvedBadge')}
              </span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  )
}
