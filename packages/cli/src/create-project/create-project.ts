import { exerciseStates, validateTemplate, type Language, type Manifest, type TemplateFiles } from '@typika/manifest'
import type { RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Effect from 'effect/Effect'

import { composeProject } from '../compose-project/compose-project.ts'
import { ExerciseNotFoundError } from '../domain/errors/exercise-not-found.error.ts'
import { VariantNotFoundError } from '../domain/errors/variant-not-found.error.ts'
import {
  isPinnedOnSha,
  isRef,
  locateTemplate,
  pinnedVia,
  type LocatedTemplate,
} from '../locate-template/locate-template.ts'
import type { TemplateSource } from '../template-source/template-source.ts'

export type CreateOptions = {
  readonly template: string
  readonly variant?: Language
  readonly exercise?: string
  readonly keepTour: boolean
}

export type ProjectPlan = {
  readonly manifest: Manifest
  readonly ref: string
  readonly files: TemplateFiles
  readonly warnings: ReadonlyArray<string>
}

const warningsOf = ({ ref, entry }: LocatedTemplate): ReadonlyArray<string> => [
  ...(isPinnedOnSha(ref) ? [] : [`${ref} is not pinned on a commit SHA: its content can change.`]),
  ...(entry?.health?.status === 'deprecated' ? [`${entry.name} is deprecated.`] : []),
  ...(entry?.health?.status === 'broken' ? [`${entry.name} is marked broken in the registry.`] : []),
]

export const createProject = (source: TemplateSource, options: CreateOptions) =>
  Effect.gen(function* () {
    const index: RegistryIndex | undefined = isRef(options.template) ? undefined : yield* source.index
    const load = (located: LocatedTemplate) =>
      Effect.flatMap(source.files(located.ref), (files) =>
        Effect.map(validateTemplate(files), ({ manifest }) => ({ ...located, files, manifest }))
      )

    let template = yield* load(yield* locateTemplate(options.template, index))
    const { variant } = options
    if (variant !== undefined && template.manifest.facets.language !== variant) {
      const ref = template.manifest.variants?.[variant]
      if (ref === undefined)
        return yield* new VariantNotFoundError({ template: template.manifest.name, language: variant })
      template = yield* load(pinnedVia(index, ref))
    }

    const { manifest, files } = template
    const definition =
      options.exercise === undefined ? undefined : manifest.exercises.find(({ name }) => name === options.exercise)
    if (options.exercise !== undefined && definition === undefined)
      return yield* new ExerciseNotFoundError({ template: manifest.name, exercise: options.exercise })

    const base =
      definition?.from === 'base' && manifest.base !== undefined
        ? (yield* load(pinnedVia(index, manifest.base.template))).files
        : undefined
    const exercise =
      definition === undefined
        ? undefined
        : { definition, start: (yield* exerciseStates({ template: files, base, exercise: definition })).start }

    return {
      manifest,
      ref: template.ref,
      warnings: warningsOf(template),
      files: composeProject({
        manifest,
        files,
        ref: template.ref,
        keepTour: options.keepTour,
        ...(exercise === undefined ? {} : { exercise }),
      }),
    } satisfies ProjectPlan
  })
