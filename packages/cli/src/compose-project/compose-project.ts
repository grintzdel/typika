import {
  MANIFEST_FILE,
  withoutExercises,
  withoutTypikaFiles,
  withParent,
  type Exercise,
  type Manifest,
  type TemplateFiles,
} from '@typika/manifest'

export const PUBLIC_APP_URL = 'https://typika.dev'

const TOUR_DIR = 'tour/'
const README = 'README.md'
const EXERCISE_STATEMENT = 'EXERCISE.md'

export type ProjectSource = {
  readonly manifest: Manifest
  readonly files: TemplateFiles
  readonly ref: string
  readonly exercise?: { readonly definition: Exercise; readonly start: TemplateFiles }
  readonly keepTour: boolean
}

const typikaFilesOf = (files: TemplateFiles, withExercises: boolean): TemplateFiles =>
  new Map(
    [...files].filter(
      ([path]) =>
        path === MANIFEST_FILE || path.startsWith(TOUR_DIR) || (withExercises && path.startsWith('exercises/'))
    )
  )

const readmeOf = (manifest: Manifest) =>
  `# ${manifest.title}\n\n${manifest.summary}\n\nCreated from [${manifest.name}](${PUBLIC_APP_URL}/templates/${manifest.name}) with Typika.\n`

export const composeProject = ({ manifest, files, ref, exercise, keepTour }: ProjectSource): TemplateFiles => {
  const code = withoutTypikaFiles(exercise === undefined ? files : withoutExercises(exercise.start))
  const kept = keepTour ? withParent(new Map([...code, ...typikaFilesOf(files, exercise === undefined)]), ref) : code
  const statement = exercise === undefined ? undefined : files.get(`exercises/${exercise.definition.name}/README.md`)
  return new Map([
    ...(kept.has(README) ? [] : [[README, readmeOf(manifest)] as const]),
    ...kept,
    ...(statement === undefined ? [] : [[EXERCISE_STATEMENT, statement] as const]),
  ])
}
