import { INDEX_SCHEMA_VERSION, RegistryIndexSchema } from '@typika/registry-tools/index-schema'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { ProjectLoadFailure } from '../domain/constants/project-load-failure.constant.ts'
import { ProjectIndexUnavailableError } from '../domain/errors/project-index-unavailable.error.ts'
import type { TemplateEntry } from '../domain/template-entry.domain-model.ts'
import { TemplateIndexPort } from '../ports/template-index.port.ts'

const VersionedSchema = Schema.Struct({ schema: Schema.Number })

const unavailable = (failure: ProjectLoadFailure, reason: string) =>
  new ProjectIndexUnavailableError({ failure, reason })

const decodeIndex = (body: unknown) =>
  Effect.gen(function* () {
    const { schema } = yield* Schema.decodeUnknownEffect(VersionedSchema)(body).pipe(
      Effect.mapError((error) => unavailable(ProjectLoadFailure.INVALID, error.message))
    )
    if (Math.trunc(schema) !== INDEX_SCHEMA_VERSION)
      return yield* unavailable(ProjectLoadFailure.UNSUPPORTED, `index schema ${schema} is not supported`)
    return yield* Schema.decodeUnknownEffect(RegistryIndexSchema)(body).pipe(
      Effect.mapError((error) => unavailable(ProjectLoadFailure.INVALID, error.message))
    )
  })

export const makeTemplateIndexFetch = (
  url: string,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof TemplateIndexPort> => {
  let cached: ReadonlyArray<TemplateEntry> | undefined

  const load = Effect.tryPromise({
    try: async () => {
      const response = await fetchFn(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as unknown
    },
    catch: (cause) => unavailable(ProjectLoadFailure.NETWORK, `Cannot load ${url}: ${String(cause)}`),
  }).pipe(
    Effect.flatMap(decodeIndex),
    Effect.map((index) =>
      index.templates.map((template): TemplateEntry => ({
        name: template.name,
        ref: template.ref,
        role: template.manifest.role,
        title: template.manifest.title,
        summary: template.manifest.summary,
        language: template.manifest.facets.language,
        level: template.manifest.facets.level,
      }))
    ),
    Effect.tap((entries) =>
      Effect.sync(() => {
        cached = entries
      })
    )
  )

  return { entries: Effect.suspend(() => (cached === undefined ? load : Effect.succeed(cached))) }
}

export const TemplateIndexFetchLayer = Layer.effect(
  TemplateIndexPort,
  Effect.map(AppConfig, (config) => makeTemplateIndexFetch(config.registryIndexUrl))
)
