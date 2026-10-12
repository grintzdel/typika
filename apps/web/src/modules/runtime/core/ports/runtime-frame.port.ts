import type { RuntimeKind } from '@typika/manifest'
import type {
  ProjectSnapshot,
  RuntimeAssetLoadError,
  RuntimeBootError,
  RuntimeLoadProgress,
  RuntimeSession,
  RuntimeUnsupportedError,
} from '@typika/runtime-core'
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Scope from 'effect/Scope'
import type * as Stream from 'effect/Stream'

import type { RuntimeFrameUnavailableError } from '../domain/errors/runtime-frame-unavailable.error.ts'

export type RuntimeFrameBootError =
  | RuntimeBootError
  | RuntimeAssetLoadError
  | RuntimeUnsupportedError
  | RuntimeFrameUnavailableError

export type RuntimeFrameLoadError = RuntimeAssetLoadError | RuntimeUnsupportedError | RuntimeFrameUnavailableError

export class RuntimeFramePort extends Context.Service<
  RuntimeFramePort,
  {
    readonly load: (kind: RuntimeKind) => Stream.Stream<RuntimeLoadProgress, RuntimeFrameLoadError>
    readonly boot: (snapshot: ProjectSnapshot) => Effect.Effect<RuntimeSession, RuntimeFrameBootError, Scope.Scope>
  }
>()('@typika/web/RuntimeFramePort') {}
