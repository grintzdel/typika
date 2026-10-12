import { Language } from '@typika/manifest'
import * as Option from 'effect/Option'

import type { RegisteredTemplate } from '../check-registry/check-registry.ts'
import { INDEX_SCHEMA_VERSION, type IndexTemplate, type RegistryIndex } from '../domain/registry-index.domain-model.ts'
import type { Vocabulary } from '../domain/vocabulary.domain-model.ts'
import { keyOfRef } from '../resolve-ref/resolve-ref.ts'

export const INDEX_MAX_GZIP_BYTES = 500_000

export type BuildIndexInput = {
  readonly templates: ReadonlyArray<RegisteredTemplate>
  readonly vocabulary: Vocabulary
  readonly generatedAt: string
  readonly registryCommit: string
  readonly updatedAtOf: (file: string) => string | undefined
}

const searchTextOf = (template: RegisteredTemplate, labels: ReadonlyMap<string, string>) => {
  const { manifest, tourSteps } = template
  const words = [
    manifest.name,
    manifest.title,
    manifest.summary,
    ...manifest.keywords,
    ...manifest.facets.topic.map((topic) => labels.get(topic) ?? topic),
    ...tourSteps.map((step) => step.title),
    ...manifest.exercises.map((exercise) => exercise.title),
  ]
    .join(' ')
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((word) => word !== '')
  return [...new Set(words)].join(' ')
}

export const buildIndex = ({
  templates,
  vocabulary,
  generatedAt,
  registryCommit,
  updatedAtOf,
}: BuildIndexInput): RegistryIndex => {
  const byKey = new Map(
    templates.flatMap((template) =>
      Option.toArray(Option.map(keyOfRef(template.entry.ref), (key) => [key, template] as const))
    )
  )
  const resolve = (ref: string) =>
    Option.getOrUndefined(Option.flatMap(keyOfRef(ref), (key) => Option.fromNullishOr(byKey.get(key))))
  const labels = new Map(vocabulary.topics.map((topic) => [topic.id, topic.label]))

  const toIndexTemplate = (template: RegisteredTemplate): IndexTemplate => {
    const { entry, manifest, tourSteps, file } = template
    const variants = Object.fromEntries(
      Object.entries(manifest.variants ?? {}).flatMap(([language, ref]) => {
        const variant = ref === undefined ? undefined : resolve(ref)
        return variant === undefined ? [] : [[language, variant.manifest.name]]
      })
    )
    return {
      name: manifest.name,
      ref: entry.ref,
      category: entry.category,
      maintainers: entry.maintainers,
      addedAt: entry.added,
      updatedAt: updatedAtOf(file) ?? entry.added,
      manifest: {
        title: manifest.title,
        summary: manifest.summary,
        license: manifest.license,
        authors: manifest.authors,
        role: manifest.role,
        facets: manifest.facets,
        runtime: { kind: manifest.runtime.kind },
        base: manifest.base === undefined ? null : (resolve(manifest.base.template)?.entry.ref ?? null),
        variants,
        tour: { steps: tourSteps.map((step) => ({ id: step.id, title: step.title })) },
        exercises: manifest.exercises.map((exercise) => ({
          name: exercise.name,
          kind: exercise.kind,
          title: exercise.title,
        })),
      },
      parent: entry.parent ?? null,
      health: null,
      search: { text: searchTextOf(template, labels) },
    }
  }

  return {
    schema: INDEX_SCHEMA_VERSION,
    generatedAt,
    registryCommit,
    vocabulary: {
      topics: vocabulary.topics.map(({ id, label }) => {
        const [category = '', family] = id.split('/')
        return category === 'design-pattern' && family !== undefined
          ? { id, label, category, family }
          : { id, label, category }
      }),
      languages: Object.values(Language),
    },
    templates: templates.map(toIndexTemplate).toSorted((a, b) => a.name.localeCompare(b.name)),
  }
}
