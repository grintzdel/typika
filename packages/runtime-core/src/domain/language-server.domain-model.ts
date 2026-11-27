import type * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import type * as Stream from 'effect/Stream'

import type { RuntimeAssetLoadError } from './errors/runtime-asset-load.error.ts'
import type { RuntimeProcessError } from './errors/runtime-process.error.ts'

export const LanguageServerEventSchema = Schema.Union([
  Schema.TaggedStruct('Message', { message: Schema.String }),
  Schema.TaggedStruct('Restarted', {}),
])

export type LanguageServerEvent = typeof LanguageServerEventSchema.Type

export type LanguageServerError = RuntimeProcessError | RuntimeAssetLoadError

export interface LanguageServer {
  readonly rootUri: string
  readonly connect: Stream.Stream<LanguageServerEvent, LanguageServerError>
  readonly send: (message: string) => Effect.Effect<void, RuntimeProcessError>
}
