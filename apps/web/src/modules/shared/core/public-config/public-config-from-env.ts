import * as Effect from 'effect/Effect'

import { AppConfigInvalidError } from '../domain/errors/app-config-invalid.error.ts'
import type { PublicConfig } from '../domain/public-config.domain-model.ts'

type Env = Readonly<Record<string, string | undefined>>

const parseUrl = (name: string, value: string | undefined) =>
  Effect.suspend(() => {
    if (value === undefined || value === '')
      return Effect.fail(new AppConfigInvalidError({ reason: `${name} is missing` }))
    return URL.canParse(value)
      ? Effect.succeed(new URL(value))
      : Effect.fail(new AppConfigInvalidError({ reason: `${name} is not a URL: ${value}` }))
  })

export const publicConfigFromEnv = (env: Env): Effect.Effect<PublicConfig, AppConfigInvalidError> =>
  Effect.gen(function* () {
    const publicUrl = yield* parseUrl('TYPIKA_PUBLIC_URL', env.TYPIKA_PUBLIC_URL)
    const runtimeUrl = yield* parseUrl('TYPIKA_RUNTIME_ORIGIN', env.TYPIKA_RUNTIME_ORIGIN)
    if (runtimeUrl.origin === publicUrl.origin)
      return yield* new AppConfigInvalidError({ reason: 'TYPIKA_RUNTIME_ORIGIN must differ from the app origin' })
    const packageUrlTemplate = env.TYPIKA_PACKAGE_URL_TEMPLATE
    return {
      publicUrl: publicUrl.href.replace(/\/$/, ''),
      runtimeOrigin: runtimeUrl.origin,
      ...(packageUrlTemplate === undefined || packageUrlTemplate === '' ? {} : { packageUrlTemplate }),
    }
  })
