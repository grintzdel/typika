import { fileURLToPath } from 'node:url'

import * as Effect from 'effect/Effect'
import { serve } from 'srvx'

import { publicConfigFromEnv } from '../src/modules/shared/core/public-config/public-config-from-env.ts'
import { makeRequestHandler, type AppServer } from './handle-request.ts'

const dist = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))

const config = Effect.runSync(
  publicConfigFromEnv(process.env).pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error(`Invalid configuration: ${error.reason}`)
        return process.exit(1)
      })
    )
  )
)

const isAppServer = (value: unknown): value is AppServer =>
  typeof value === 'object' && value !== null && 'fetch' in value && typeof value.fetch === 'function'

const loaded: unknown = await import(/* @vite-ignore */ new URL('../server/server.js', import.meta.url).href)
const appServer = typeof loaded === 'object' && loaded !== null && 'default' in loaded ? loaded.default : undefined
if (!isAppServer(appServer)) throw new Error('dist/server/server.js does not export a fetch handler')

const server = serve({
  port: process.env.PORT ?? 3000,
  hostname: process.env.HOST ?? '0.0.0.0',
  silent: true,
  fetch: await makeRequestHandler({ config, clientDir: dist('client'), runtimeDir: dist('runtime'), appServer }),
})

await server.ready()
console.log(`Typika listening on ${server.url ?? ''} for ${config.publicUrl} and ${config.runtimeOrigin}`)
