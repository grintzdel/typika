import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { fetchRegistryIndex } from '../../../shared/core/registry-index/fetch-registry-index.ts'
import { ProjectIndexUnavailableError } from '../domain/errors/project-index-unavailable.error.ts'
import type { TemplateEntry } from '../domain/template-entry.domain-model.ts'
import { TemplateIndexPort } from '../ports/template-index.port.ts'

export const makeTemplateIndexFetch = (
  url: string,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof TemplateIndexPort> => {
  let cached: ReadonlyArray<TemplateEntry> | undefined

  const load = fetchRegistryIndex(url, fetchFn).pipe(
    Effect.mapError(({ failure, reason }) => new ProjectIndexUnavailableError({ failure, reason })),
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
