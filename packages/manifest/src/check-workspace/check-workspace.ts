import * as Effect from 'effect/Effect'
import * as Result from 'effect/Result'

import { ManifestIssueCode } from '../domain/constants/issue-code.constant.ts'
import { ManifestInvalidError } from '../domain/errors/manifest-invalid.error.ts'
import { isWarning, makeIssue, type ManifestIssue } from '../domain/manifest-issue.domain-model.ts'
import type { Exercise, Manifest } from '../domain/manifest.domain-model.ts'
import type { TemplateFiles } from '../domain/template-files.domain-model.ts'
import type { TourStep } from '../domain/tour-step.domain-model.ts'
import { parseTourStep } from '../parse-tour-step/parse-tour-step.ts'

export type CheckWorkspaceOptions = {
  readonly knownTopics?: ReadonlySet<string>
}

export type WorkspaceReport = {
  readonly tourSteps: ReadonlyArray<TourStep>
  readonly warnings: ReadonlyArray<ManifestIssue>
}

export const SizeLimit = {
  FILES: 200,
  TEXT_BYTES: 1_000_000,
  IMAGE_BYTES: 200_000,
} as const

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['png', 'jpg', 'svg', 'webp'])
const TEMPLATE_ROOT = '.'

const textOf = (files: TemplateFiles, path: string): string | undefined => {
  const content = files.get(path)
  return typeof content === 'string' ? content : undefined
}

const lineCount = (content: string): number => {
  const lines = content.split(/\r?\n/)
  return lines.at(-1) === '' ? lines.length - 1 : lines.length
}

const hasRegion = (content: string, region: string): boolean => {
  const lines = content.split(/\r?\n/).map((line) => line.trim())
  const start = lines.indexOf(`// #region tour:${region}`)
  if (start === -1) return false
  let depth = 1
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('// #region ')) depth += 1
    if (line === '// #endregion') depth -= 1
    if (depth === 0) return true
  }
  return false
}

const checkRequiredFiles = (manifest: Manifest, files: TemplateFiles): ReadonlyArray<ManifestIssue> => {
  const entries: Array<readonly [string, string]> = [['runtime.entry', manifest.runtime.entry]]
  if (manifest.commands?.start !== undefined) entries.push(['commands.start', manifest.commands.start])
  return [
    ...entries
      .filter(([, path]) => !files.has(path))
      .map(([field, path]) =>
        makeIssue(ManifestIssueCode.ENTRY_NOT_FOUND, field, `Entry file "${path}" does not exist.`)
      ),
    ...(files.has('LICENSE')
      ? []
      : [makeIssue(ManifestIssueCode.LICENSE_FILE_MISSING, 'LICENSE', 'LICENSE file is missing.')]),
    ...(files.has('README.md')
      ? []
      : [makeIssue(ManifestIssueCode.README_FILE_MISSING, 'README.md', 'README.md file is missing.')]),
  ]
}

const checkAnchors = (step: TourStep, files: TemplateFiles): ReadonlyArray<ManifestIssue> => {
  const missing = [step.file, ...step.also]
    .filter((path): path is string => path !== undefined && !files.has(path))
    .map((path) =>
      makeIssue(
        ManifestIssueCode.TOUR_FRONTMATTER,
        step.path,
        `Tour step "${step.path}": file "${path}" does not exist.`
      )
    )
  if (missing.length > 0 || step.file === undefined) return missing

  const content = textOf(files, step.file) ?? ''
  if (step.lines !== undefined) {
    const count = lineCount(content)
    if (step.lines.end <= count) return []
    const lines = step.lines.start === step.lines.end ? `${step.lines.start}` : `${step.lines.start}-${step.lines.end}`
    return [
      makeIssue(
        ManifestIssueCode.TOUR_ANCHOR_OUT_OF_RANGE,
        step.path,
        `Tour step "${step.id}": lines ${lines} are outside "${step.file}" (${count} lines).`
      ),
    ]
  }
  if (step.region !== undefined && !hasRegion(content, step.region)) {
    return [
      makeIssue(
        ManifestIssueCode.TOUR_REGION_NOT_FOUND,
        step.path,
        `Tour step "${step.id}": region "${step.region}" not found in "${step.file}".`
      ),
    ]
  }
  return []
}

const checkTour = (manifest: Manifest, files: TemplateFiles) => {
  const steps: Array<TourStep> = []
  const issues: Array<ManifestIssue> = []
  const ids = new Set<string>()
  for (const [index, path] of (manifest.tour?.steps ?? []).entries()) {
    const source = textOf(files, path)
    if (source === undefined) {
      issues.push(
        makeIssue(ManifestIssueCode.TOUR_STEP_NOT_FOUND, `tour.steps[${index}]`, `Tour step "${path}" does not exist.`)
      )
      continue
    }
    const parsed = Effect.runSync(Effect.result(parseTourStep(path, source)))
    if (Result.isFailure(parsed)) {
      issues.push(...parsed.failure.issues)
      continue
    }
    const step = parsed.success
    if (ids.has(step.id)) {
      issues.push(
        makeIssue(ManifestIssueCode.TOUR_DUPLICATE_ID, path, `Tour step id "${step.id}" is used more than once.`)
      )
    }
    ids.add(step.id)
    issues.push(...checkAnchors(step, files))
    steps.push(step)
  }
  return { steps, issues }
}

const removedPaths = (files: TemplateFiles, directory: string): ReadonlySet<string> =>
  new Set(
    (textOf(files, `${directory}start/.typika-remove`) ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
  )

const checkExercise = (exercise: Exercise, files: TemplateFiles): ReadonlyArray<ManifestIssue> => {
  const directory = `exercises/${exercise.name}/`
  const missing = (path: string) =>
    makeIssue(ManifestIssueCode.EXERCISE_PATH_NOT_FOUND, path, `Exercise "${exercise.name}": "${path}" does not exist.`)
  const paths = [...files.keys()]
  const removed = removedPaths(files, directory)
  const inStartState = (path: string) =>
    files.has(`${directory}start/${path}`) || (exercise.from === 'self' && files.has(path) && !removed.has(path))

  return [
    ...(files.has(`${directory}README.md`) ? [] : [missing(`${directory}README.md`)]),
    ...(paths.some((path) => path.startsWith(`${directory}solution/`)) ? [] : [missing(`${directory}solution`)]),
    ...exercise.hints.filter((hint) => !files.has(`${directory}${hint}`)).map((hint) => missing(`${directory}${hint}`)),
    ...(exercise.from === 'self' ? exercise.failing.filter((path) => !inStartState(path)).map(missing) : []),
  ]
}

const checkUndeclaredExercises = (manifest: Manifest, files: TemplateFiles): ReadonlyArray<ManifestIssue> => {
  const declared = new Set(manifest.exercises.map((exercise) => exercise.name))
  const folders = new Set(
    [...files.keys()]
      .map((path) => path.split('/'))
      .filter((segments) => segments[0] === 'exercises' && segments.length > 2)
      .map((segments) => segments[1] ?? '')
  )
  return [...folders]
    .filter((folder) => !declared.has(folder))
    .map((folder) =>
      makeIssue(
        ManifestIssueCode.EXERCISE_UNDECLARED,
        `exercises/${folder}`,
        `Folder "exercises/${folder}" is not declared in [[exercises]].`
      )
    )
}

const checkTopics = (manifest: Manifest, knownTopics: ReadonlySet<string> | undefined): ReadonlyArray<ManifestIssue> =>
  knownTopics === undefined
    ? []
    : manifest.facets.topic.flatMap((topic, index) =>
        knownTopics.has(topic)
          ? []
          : [
              makeIssue(
                ManifestIssueCode.UNKNOWN_TOPIC,
                `facets.topic[${index}]`,
                `Topic "${topic}" is not in the registry vocabulary yet.`
              ),
            ]
      )

const sizeWarning = (path: string, limit: string, actual: string) =>
  makeIssue(ManifestIssueCode.SIZE, path, `Template exceeds ${limit}: ${actual}.`)

const checkSizes = (files: TemplateFiles): ReadonlyArray<ManifestIssue> => {
  const encoder = new TextEncoder()
  const entries = [...files.entries()]
  const fileCount = entries.filter(([path]) => !path.startsWith('exercises/')).length
  const textBytes = entries.reduce(
    (total, [, content]) => (typeof content === 'string' ? total + encoder.encode(content).byteLength : total),
    0
  )
  const binaryWarnings = entries.flatMap(([path, content]) => {
    if (typeof content === 'string') return []
    const extension = path.split('.').at(-1)?.toLowerCase() ?? ''
    if (!IMAGE_EXTENSIONS.has(extension)) {
      return [sizeWarning(path, 'the image-only rule for binary files', `"${path}"`)]
    }
    return content.byteLength > SizeLimit.IMAGE_BYTES
      ? [sizeWarning(path, '200 KB per image', `"${path}" is ${content.byteLength} bytes`)]
      : []
  })
  return [
    ...(fileCount > SizeLimit.FILES ? [sizeWarning(TEMPLATE_ROOT, '200 files', `${fileCount}`)] : []),
    ...(textBytes > SizeLimit.TEXT_BYTES ? [sizeWarning(TEMPLATE_ROOT, '1 MB of text', `${textBytes} bytes`)] : []),
    ...binaryWarnings,
  ]
}

export const checkWorkspace = (
  manifest: Manifest,
  files: TemplateFiles,
  options: CheckWorkspaceOptions = {}
): Effect.Effect<WorkspaceReport, ManifestInvalidError> => {
  const tour = checkTour(manifest, files)
  const issues = [
    ...checkRequiredFiles(manifest, files),
    ...tour.issues,
    ...manifest.exercises.flatMap((exercise) => checkExercise(exercise, files)),
    ...checkUndeclaredExercises(manifest, files),
    ...checkTopics(manifest, options.knownTopics),
    ...checkSizes(files),
  ]
  const errors = issues.filter((issue) => !isWarning(issue))
  const warnings = issues.filter(isWarning)
  return errors.length > 0
    ? Effect.fail(new ManifestInvalidError({ issues: [...errors, ...warnings] }))
    : Effect.succeed({ tourSteps: tour.steps, warnings })
}
