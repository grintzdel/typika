import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { ProjectIndexUnavailableError } from '../domain/errors/project-index-unavailable.error.ts'
import type { TemplateEntry } from '../domain/template-entry.domain-model.ts'

export class TemplateIndexPort extends Context.Service<
  TemplateIndexPort,
  {
    readonly entries: Effect.Effect<ReadonlyArray<TemplateEntry>, ProjectIndexUnavailableError>
  }
>()('@typika/web/TemplateIndexPort') {}
