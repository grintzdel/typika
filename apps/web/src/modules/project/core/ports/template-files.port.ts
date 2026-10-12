import type { TemplateFiles } from '@typika/manifest'
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { ProjectFilesUnavailableError } from '../domain/errors/project-files-unavailable.error.ts'

export class TemplateFilesPort extends Context.Service<
  TemplateFilesPort,
  {
    readonly load: (ref: string) => Effect.Effect<TemplateFiles, ProjectFilesUnavailableError>
  }
>()('@typika/web/TemplateFilesPort') {}
