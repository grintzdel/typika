import type {
  ProjectSnapshot,
  RuntimeAssetLoadError,
  RuntimeBootError,
  RuntimeSession,
  RuntimeUnsupportedError,
} from '@typika/runtime-core'
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Scope from 'effect/Scope'

import type { RuntimeFrameUnavailableError } from '../domain/errors/runtime-frame-unavailable.error.ts'

export type RuntimeFrameBootError =
  | RuntimeBootError
  | RuntimeAssetLoadError
  | RuntimeUnsupportedError
  | RuntimeFrameUnavailableError

export class RuntimeFramePort extends Context.Service<
  RuntimeFramePort,
  {
    readonly boot: (snapshot: ProjectSnapshot) => Effect.Effect<RuntimeSession, RuntimeFrameBootError, Scope.Scope>
  }
>()('@typika/web/RuntimeFramePort') {}
