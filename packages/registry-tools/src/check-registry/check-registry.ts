import {
  ExerciseKind,
  makeIssue,
  ManifestIssueCode,
  parseTemplateRef,
  validateTemplate,
  type Manifest,
  type ManifestIssue,
  type TemplateFiles,
  type TourStep,
} from '@typika/manifest'
import { checkTemplates, type TemplateCheck, type TemplateRunners } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import spdxLicenses from 'spdx-license-list/spdx.json' with { type: 'json' }

import { decodeToml } from '../decode-toml/decode-toml.ts'
import { RegistryCategory } from '../domain/constants/registry-category.constant.ts'
import { RegistryEntrySchema, type RegistryEntry } from '../domain/registry-entry.domain-model.ts'
import { VocabularySchema, type Vocabulary } from '../domain/vocabulary.domain-model.ts'
import { VOCABULARY_FILE, type RegistrySource } from '../read-registry/read-registry.ts'
import { keyOf, keyOfRef, type PinnedRef, type ResolveRef } from '../resolve-ref/resolve-ref.ts'

export type RegisteredTemplate = {
  readonly file: string
  readonly entry: RegistryEntry
  readonly manifest: Manifest
  readonly tourSteps: ReadonlyArray<TourStep>
}

export type RegistryReport = {
  readonly checks: ReadonlyArray<TemplateCheck>
  readonly templates: ReadonlyArray<RegisteredTemplate>
  readonly vocabulary: Vocabulary
}

type Resolved = {
  readonly file: string
  readonly entry: RegistryEntry
  readonly key: string
  readonly files: TemplateFiles
}

const PINNED_SHA = /^[0-9a-f]{7,40}$/
const OFFICIAL_OWNER = 'typika'
const CATEGORIES_WITH_REFACTOR: ReadonlySet<string> = new Set(['principle', 'design-pattern'])
const OSI_LICENSES: ReadonlySet<string> = new Set(
  Object.entries(spdxLicenses)
    .filter(([, license]) => license.osiApproved)
    .map(([id]) => id)
)

const nameOfFile = (file: string) => file.slice(file.lastIndexOf('/') + 1, -'.toml'.length)
const categoryOfFile = (file: string) => file.split('/')[1]
const issuesOf = (error: { readonly _tag: string; readonly issues?: ReadonlyArray<ManifestIssue> }) =>
  error.issues ?? []

const pinnedRefOf = (path: string, ref: string): Effect.Effect<PinnedRef, ReadonlyArray<ManifestIssue>> => {
  const parsed = parseTemplateRef(ref)
  if (Option.isNone(parsed)) {
    return Effect.fail([
      makeIssue(
        ManifestIssueCode.INVALID_REF,
        path,
        `"${ref}" is not a valid template reference (expected github:<owner>/<repo>[/<path>][@<ref>]).`
      ),
    ])
  }
  const pin = parsed.value.ref
  return pin !== undefined && PINNED_SHA.test(pin)
    ? Effect.succeed({ ...parsed.value, ref: pin })
    : Effect.fail([makeIssue(ManifestIssueCode.REF_NOT_PINNED, path, `Ref "${ref}" must be pinned to a commit SHA.`)])
}

const checkEntry = (file: string, entry: RegistryEntry, ref: PinnedRef): ReadonlyArray<ManifestIssue> => [
  ...(categoryOfFile(file) === entry.category
    ? []
    : [
        makeIssue(
          ManifestIssueCode.INVALID_VALUE,
          'category',
          `Invalid value for "category": expected "${categoryOfFile(file) ?? ''}", the folder of the entry.`
        ),
      ]),
  ...(entry.category === RegistryCategory.OFFICIAL && ref.owner !== OFFICIAL_OWNER
    ? [makeIssue(ManifestIssueCode.CATEGORY_MISMATCH, 'ref', `An official template must live under github:typika/.`)]
    : []),
]

const checkManifest = (
  file: string,
  entry: RegistryEntry,
  manifest: Manifest,
  tourSteps: ReadonlyArray<TourStep>,
  vocabulary: Vocabulary
): ReadonlyArray<ManifestIssue> => {
  const name = nameOfFile(file)
  const topics = new Set(vocabulary.topics.map((topic) => topic.id))
  const category = manifest.facets.topic[0].split('/')[0] ?? ''
  const isTemplate = manifest.role === 'template'
  const ids = tourSteps.map((step) => step.id)
  return [
    ...(manifest.name === name
      ? []
      : [
          makeIssue(
            ManifestIssueCode.ENTRY_NAME_MISMATCH,
            'name',
            `Entry file "${file}" must be named after its template "${manifest.name}".`
          ),
        ]),
    ...(OSI_LICENSES.has(manifest.license)
      ? []
      : [
          makeIssue(ManifestIssueCode.LICENSE_NOT_OSI, 'license', `License "${manifest.license}" is not OSI-approved.`),
        ]),
    ...(entry.category === RegistryCategory.OFFICIAL && manifest.license !== 'MIT-0'
      ? [makeIssue(ManifestIssueCode.LICENSE_NOT_MIT0, 'license', 'An official template must use the MIT-0 license.')]
      : []),
    ...manifest.facets.topic.flatMap((topic, index) =>
      topics.has(topic)
        ? []
        : [
            makeIssue(
              ManifestIssueCode.INVALID_VALUE,
              `facets.topic[${index}]`,
              `Invalid value for "facets.topic[${index}]": "${topic}" is not in the registry vocabulary.`
            ),
          ]
    ),
    ...(isTemplate &&
    CATEGORIES_WITH_REFACTOR.has(category) &&
    !manifest.exercises.some((exercise) => exercise.kind === ExerciseKind.REFACTOR)
      ? [
          makeIssue(
            ManifestIssueCode.REFACTOR_EXERCISE_MISSING,
            'exercises',
            `A ${category} template needs at least one refactor exercise.`
          ),
        ]
      : []),
    ...(isTemplate &&
    entry.category === RegistryCategory.OFFICIAL &&
    (ids[0] !== 'overview' || ids.at(-1) !== 'trade-offs')
      ? [
          makeIssue(
            ManifestIssueCode.TOUR_REQUIRED_STEP,
            'tour.steps',
            'An official tour must start with "overview" and end with "trade-offs".'
          ),
        ]
      : []),
  ]
}

const checkParent = (entry: RegistryEntry, keys: ReadonlySet<string>): ReadonlyArray<ManifestIssue> => {
  if (entry.parent === undefined) return []
  const key = keyOfRef(entry.parent)
  return Option.isSome(key) && keys.has(key.value)
    ? []
    : [
        makeIssue(
          ManifestIssueCode.REF_UNRESOLVABLE,
          'parent',
          `Cannot resolve "${entry.parent}": it is not in the registry.`
        ),
      ]
}

const duplicateName = (file: string, files: ReadonlyArray<string>): ReadonlyArray<ManifestIssue> =>
  files.some((other) => other < file && nameOfFile(other) === nameOfFile(file))
    ? [makeIssue(ManifestIssueCode.NAME_TAKEN, 'name', `Template name "${nameOfFile(file)}" is already registered.`)]
    : []

const asRegistryIssue = (issue: ManifestIssue): ManifestIssue =>
  issue.code === ManifestIssueCode.SIZE ? { ...issue, code: ManifestIssueCode.SIZE_EXCEEDED } : issue

export const checkRegistry = (
  source: RegistrySource,
  resolveRef: ResolveRef,
  runners: TemplateRunners
): Effect.Effect<RegistryReport> =>
  Effect.gen(function* () {
    const vocabularyResult = yield* Effect.result(decodeToml(VocabularySchema, VOCABULARY_FILE, source.vocabulary))
    const vocabulary = vocabularyResult._tag === 'Success' ? vocabularyResult.success : { topics: [] }
    const vocabularyCheck: TemplateCheck = {
      dir: VOCABULARY_FILE,
      name: undefined,
      issues: vocabularyResult._tag === 'Success' ? [] : issuesOf(vocabularyResult.failure),
      exercisesRun: false,
    }

    const failures = new Map<string, ReadonlyArray<ManifestIssue>>()
    const resolved: Array<Resolved> = []
    for (const { file, source: toml } of source.entries) {
      const outcome = yield* Effect.result(
        Effect.gen(function* () {
          const entry = yield* Effect.mapError(decodeToml(RegistryEntrySchema, file, toml), issuesOf)
          const ref = yield* pinnedRefOf('ref', entry.ref)
          const entryIssues = checkEntry(file, entry, ref)
          if (entryIssues.length > 0) return yield* Effect.fail(entryIssues)
          const files = yield* resolveRef(ref).pipe(
            Effect.mapError((error) => [
              makeIssue(ManifestIssueCode.REF_UNRESOLVABLE, 'ref', `Cannot resolve "${entry.ref}": ${error.reason}.`),
            ])
          )
          return { file, entry, key: keyOf(ref), files }
        })
      )
      if (outcome._tag === 'Success') resolved.push(outcome.success)
      else failures.set(file, outcome.failure)
    }

    const keys = new Set(resolved.map((template) => template.key))
    const templateChecks = yield* checkTemplates(
      new Map(resolved.map((template) => [template.key, template.files])),
      runners,
      { refOf: (key) => key, dirOf: (ref) => Option.getOrUndefined(keyOfRef(ref)) }
    )
    const checkOfKey = new Map(templateChecks.map((check) => [check.dir, check]))

    const templates: Array<RegisteredTemplate> = []
    const files = source.entries.map((entry) => entry.file)
    const checks = yield* Effect.forEach(source.entries, ({ file }) =>
      Effect.gen(function* () {
        const failed = failures.get(file)
        if (failed !== undefined) return { dir: file, name: undefined, issues: failed, exercisesRun: false }
        const template = resolved.find((candidate) => candidate.file === file)
        if (template === undefined) return { dir: file, name: undefined, issues: [], exercisesRun: false }
        const check = checkOfKey.get(template.key)
        const valid = yield* Effect.option(validateTemplate(template.files))
        const registryIssues = Option.match(valid, {
          onNone: () => [],
          onSome: ({ manifest, tourSteps }) => {
            templates.push({ file, entry: template.entry, manifest, tourSteps })
            return checkManifest(file, template.entry, manifest, tourSteps, vocabulary)
          },
        })
        return {
          dir: file,
          name: check?.name,
          issues: [
            ...duplicateName(file, files),
            ...(check?.issues ?? []).map(asRegistryIssue),
            ...registryIssues,
            ...checkParent(template.entry, keys),
          ],
          exercisesRun: check?.exercisesRun ?? false,
        }
      })
    )
    return {
      checks: vocabularyCheck.issues.length > 0 ? [vocabularyCheck, ...checks] : checks,
      templates,
      vocabulary,
    }
  })
