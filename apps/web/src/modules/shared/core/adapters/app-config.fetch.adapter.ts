import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import { AppConfigInvalidError } from '../domain/errors/app-config-invalid.error.ts'
import { PublicConfigSchema, type PublicConfig } from '../domain/public-config.domain-model.ts'
import { AppConfig } from '../ports/app-config.port.ts'

export const fetchPublicConfig = (url: string): Effect.Effect<PublicConfig, AppConfigInvalidError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as unknown
    },
    catch: (cause) => new AppConfigInvalidError({ reason: `Cannot load ${url}: ${String(cause)}` }),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(PublicConfigSchema)),
    Effect.mapError((error) =>
      error._tag === 'AppConfigInvalidError' ? error : new AppConfigInvalidError({ reason: error.message })
    )
  )

export const AppConfigFetchLayer = Layer.effect(AppConfig, fetchPublicConfig('/config.json'))
