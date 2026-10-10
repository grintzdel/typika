import type { TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { ProjectTemplateNotFoundError } from './domain/errors/project-template-not-found.error.ts'
import { TemplateSourcePort } from './ports/template-source.port.ts'

export const makeProjectTestLayer = (templates: Readonly<Record<string, TemplateFiles>>) =>
  Layer.succeed(TemplateSourcePort, {
    load: (name) => {
      const files = templates[name]
      return files === undefined ? Effect.fail(new ProjectTemplateNotFoundError({ name })) : Effect.succeed(files)
    },
  })
