import type { RuntimeKind } from '@typika/manifest'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'

import { RuntimeAssetLoadError } from '../domain/errors/runtime-asset-load.error.ts'
import { RuntimeUnsupportedError } from '../domain/errors/runtime-unsupported.error.ts'
import type { RuntimePort } from '../domain/runtime.port.ts'

export class RuntimeRegistry extends Context.Service<
  RuntimeRegistry,
  {
    readonly get: (kind: RuntimeKind) => Effect.Effect<RuntimePort, RuntimeUnsupportedError | RuntimeAssetLoadError>
  }
>()('@typika/RuntimeRegistry') {}

export type RuntimeLoaders = Partial<Readonly<Record<RuntimeKind, () => Promise<RuntimePort>>>>

export const makeRuntimeRegistry = (loaders: RuntimeLoaders): Context.Service.Shape<typeof RuntimeRegistry> => {
  const loaded = new Map<RuntimeKind, RuntimePort>()

  return {
    get: (kind) =>
      Effect.suspend((): Effect.Effect<RuntimePort, RuntimeUnsupportedError | RuntimeAssetLoadError> => {
        const port = loaded.get(kind)
        if (port !== undefined) return Effect.succeed(port)
        const loader = loaders[kind]
        if (loader === undefined) return Effect.fail(new RuntimeUnsupportedError({ kind }))
        return Effect.tryPromise({
          try: () => loader(),
          catch: (cause) => new RuntimeAssetLoadError({ asset: `runtime-${kind}`, cause }),
        }).pipe(Effect.tap((loadedPort) => Effect.sync(() => loaded.set(kind, loadedPort))))
      }),
  }
}
