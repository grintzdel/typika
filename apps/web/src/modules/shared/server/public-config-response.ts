import * as Effect from 'effect/Effect'

import { publicConfigFromEnv } from '../core/public-config/public-config-from-env.ts'

export const publicConfigResponse = (env: Readonly<Record<string, string | undefined>>) =>
  Effect.runSync(
    publicConfigFromEnv(env).pipe(
      Effect.match({
        onSuccess: (config) => Response.json(config, { headers: { 'Cache-Control': 'no-store' } }),
        onFailure: (error) => Response.json({ error: error.reason }, { status: 500 }),
      })
    )
  )
