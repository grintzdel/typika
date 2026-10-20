import type { TemplateFiles } from '@typika/manifest'
import type { RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Effect from 'effect/Effect'

import { NetworkError } from '../domain/errors/network.error.ts'
import { TemplateNotFoundError } from '../domain/errors/template-not-found.error.ts'
import type { TemplateSource } from '../template-source/template-source.ts'

export const makeFakeSource = (
  index: RegistryIndex | undefined,
  templates: Readonly<Record<string, TemplateFiles>>
): TemplateSource & { readonly requested: Array<string> } => {
  const requested: Array<string> = []
  return {
    requested,
    index:
      index === undefined
        ? Effect.fail(new NetworkError({ url: 'https://typika.test/index.json', reason: 'offline' }))
        : Effect.succeed(index),
    files: (ref) => {
      requested.push(ref)
      const files = templates[ref]
      return files === undefined ? Effect.fail(new TemplateNotFoundError({ template: ref })) : Effect.succeed(files)
    },
  }
}
