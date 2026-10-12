import { fileURLToPath } from 'node:url'

import * as Effect from 'effect/Effect'
import { createServer, type Plugin, type ViteDevServer } from 'vite'

import { appHeaders as headersOfAppPath, RUNTIME_HEADERS } from '../server/security-headers.ts'
import { publicConfigFromEnv } from '../src/modules/shared/core/public-config/public-config-from-env.ts'

const DEV_ENV = {
  TYPIKA_PUBLIC_URL: 'http://localhost:3000',
  TYPIKA_RUNTIME_ORIGIN: 'http://127.0.0.1:3001',
}

export const withDevEnv = () => {
  for (const [name, value] of Object.entries(DEV_ENV)) process.env[name] ??= value
}

export const publicConfigJson = () => JSON.stringify(Effect.runSync(publicConfigFromEnv(process.env)))

export const appHeaders = (): Plugin => ({
  name: 'typika:app-headers',
  configureServer: (server) => {
    server.middlewares.use((request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
      for (const [name, value] of Object.entries(headersOfAppPath(pathname))) response.setHeader(name, value)
      next()
    })
  },
})

export const runtimeHeaders = (): Plugin => ({
  name: 'typika:runtime-headers',
  configureServer: (server) => {
    server.middlewares.use((_, response, next) => {
      for (const [name, value] of Object.entries(RUNTIME_HEADERS)) response.setHeader(name, value)
      next()
    })
  },
})

export const runtimeConfigEndpoint = (): Plugin => ({
  name: 'typika:runtime-config',
  configureServer: (server) => {
    server.middlewares.use('/runtime/config.json', (_, response) => {
      response.setHeader('Content-Type', 'application/json')
      response.end(publicConfigJson())
    })
  },
})

export const runtimeFrameDevServer = (): Plugin => {
  let runtime: ViteDevServer | undefined
  return {
    name: 'typika:runtime-frame-dev-server',
    apply: 'serve',
    config: () => withDevEnv(),
    configureServer: async (server) => {
      runtime = await createServer({
        configFile: fileURLToPath(new URL('../vite.runtime.config.ts', import.meta.url)),
      })
      await runtime.listen()
      server.httpServer?.on('close', () => void runtime?.close())
    },
  }
}
