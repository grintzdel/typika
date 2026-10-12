import { validateTemplate, type TourStep } from '@typika/manifest'
import * as Effect from 'effect/Effect'

import { ProjectTemplateInvalidError } from '../../../../project/core/domain/errors/project-template-invalid.error.ts'
import { ProjectTemplateNotFoundError } from '../../../../project/core/domain/errors/project-template-not-found.error.ts'
import { projectFilesOf } from '../../../../project/core/domain/project.domain-model.ts'
import {
  entryForRef,
  entryNamed,
  type TemplateEntry,
} from '../../../../project/core/domain/template-entry.domain-model.ts'
import { TemplateFilesPort } from '../../../../project/core/ports/template-files.port.ts'
import { TemplateIndexPort } from '../../../../project/core/ports/template-index.port.ts'
import { byLanguage, chooseSides, type SidesChoice, type VariantLink } from '../../domain/compare.domain-model.ts'

export type ComparedVariant = VariantLink & {
  readonly title: string
  readonly entry: string
  readonly files: ReadonlyMap<string, string>
  readonly tourSteps: ReadonlyArray<TourStep>
}

export type Comparison = { readonly name: string; readonly variants: ReadonlyArray<VariantLink> } & (
  | { readonly _tag: 'Ready'; readonly a: ComparedVariant; readonly b: ComparedVariant }
  | { readonly _tag: 'Choose'; readonly choice: Exclude<SidesChoice, { readonly _tag: 'Chosen' }> }
)

export type ComparisonRequest = {
  readonly name: string
  readonly a: string | undefined
  readonly b: string | undefined
}

const loadVariant = (entry: TemplateEntry) =>
  Effect.gen(function* () {
    const source = yield* TemplateFilesPort
    const files = yield* source.load(entry.ref)
    const { manifest, tourSteps } = yield* validateTemplate(files).pipe(
      Effect.mapError(
        (error) =>
          new ProjectTemplateInvalidError({
            name: entry.name,
            issues: error._tag === 'ManifestInvalidError' ? error.issues : [],
          })
      )
    )
    return {
      manifest,
      variant: {
        language: manifest.facets.language,
        name: entry.name,
        title: manifest.title,
        entry: manifest.runtime.entry,
        files: projectFilesOf(files) as ReadonlyMap<string, string>,
        tourSteps,
      } satisfies ComparedVariant,
    }
  })

export const openComparisonProgram = ({ name, a, b }: ComparisonRequest) =>
  Effect.gen(function* () {
    const entries = yield* (yield* TemplateIndexPort).entries
    const entry = entryNamed(entries, name)
    if (entry === undefined) return yield* new ProjectTemplateNotFoundError({ name })
    const opened = yield* loadVariant(entry)
    const variants = [
      { language: opened.variant.language, name: entry.name },
      ...Object.entries(opened.manifest.variants ?? {}).flatMap(([language, ref]) => {
        const variant = entryNamed(entries, ref) ?? entryForRef(entries, ref)
        return variant === undefined || variant.language !== language || variant.role !== 'template'
          ? []
          : [{ language: variant.language, name: variant.name }]
      }),
    ].toSorted(byLanguage)
    const choice = chooseSides(variants, a, b)
    if (choice._tag !== 'Chosen') return { _tag: 'Choose', name, variants, choice } satisfies Comparison
    const load = (side: VariantLink) =>
      side.name === entry.name
        ? Effect.succeed(opened.variant)
        : Effect.flatMap(Effect.fromNullishOr(entryNamed(entries, side.name)), loadVariant).pipe(
            Effect.map(({ variant }) => variant),
            Effect.catchTag('NoSuchElementError', () =>
              Effect.fail(new ProjectTemplateNotFoundError({ name: side.name }))
            )
          )
    const [left, right] = yield* Effect.all([load(choice.a), load(choice.b)])
    return { _tag: 'Ready', name, variants, a: left, b: right } satisfies Comparison
  })
