import type { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import { RuntimeBootError } from '../domain/errors/runtime-boot.error.ts'
import type { RuntimePort } from '../domain/runtime.port.ts'

export const makeFakeRuntimePort = (kind: RuntimeKind): RuntimePort => ({
  kind,
  load: Stream.empty,
  boot: () => Effect.fail(new RuntimeBootError({ kind, cause: 'fake runtime' })),
})
