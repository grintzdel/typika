import type { TemplateFiles } from '@typika/manifest'
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { ProjectTemplateNotFoundError } from '../domain/errors/project-template-not-found.error.ts'

export class TemplateSourcePort extends Context.Service<
  TemplateSourcePort,
  {
    readonly load: (name: string) => Effect.Effect<TemplateFiles, ProjectTemplateNotFoundError>
    readonly names: Effect.Effect<ReadonlyArray<string>>
  }
>()('@typika/web/TemplateSourcePort') {}
