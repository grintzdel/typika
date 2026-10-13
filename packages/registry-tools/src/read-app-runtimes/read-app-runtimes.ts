import { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { AppConfigUnreadableError } from '../domain/errors/app-config-unreadable.error.ts'

const AppRuntimesConfigSchema = Schema.Struct({ kotlinCompilerUrl: Schema.optionalKey(Schema.String) })

export const readAppRuntimes = (
  appUrl: string,
  fetch: (url: string) => Promise<Response> = globalThis.fetch
): Effect.Effect<ReadonlySet<RuntimeKind>, AppConfigUnreadableError> =>
  Effect.gen(function* () {
    const url = `${appUrl.replace(/\/$/, '')}/config.json`
    const body = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${url} answered ${response.status}`)
        return (await response.json()) as unknown
      },
      catch: (cause) => new AppConfigUnreadableError({ reason: String(cause) }),
    })
    const config = yield* Schema.decodeUnknownEffect(AppRuntimesConfigSchema)(body).pipe(
      Effect.mapError((cause) => new AppConfigUnreadableError({ reason: String(cause) }))
    )
    return new Set<RuntimeKind>([
      RuntimeKind.BROWSER_JS,
      RuntimeKind.GO,
      ...(config.kotlinCompilerUrl === undefined ? [] : [RuntimeKind.KOTLIN]),
    ])
  })
