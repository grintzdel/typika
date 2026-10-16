import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

import * as Effect from 'effect/Effect'
import { createServer, type Plugin, type ViteDevServer } from 'vite'

import { kotlinRelayFromEnv } from '../server/kotlin-relay.ts'
import { appHeaders as headersOfAppPath, RUNTIME_HEADERS } from '../server/security-headers.ts'
import {
  KOTLIN_COMPILER_PATH,
  publicConfigFromEnv,
} from '../src/modules/shared/core/public-config/public-config-from-env.ts'

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

const toWebRequest = async (request: IncomingMessage, origin: string) => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
  }
  const chunks: Array<Uint8Array> = []
  for await (const chunk of request) if (chunk instanceof Uint8Array) chunks.push(chunk)
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  return Object.assign(
    new Request(`${origin}${request.url ?? '/'}`, {
      method: request.method ?? 'GET',
      headers,
      ...(hasBody ? { body: Buffer.concat(chunks) } : {}),
    }),
    { ip: request.socket.remoteAddress ?? '' }
  )
}

const sendWebResponse = async (response: Response, target: ServerResponse) => {
  target.writeHead(response.status, Object.fromEntries(response.headers))
  target.end(Buffer.from(await response.arrayBuffer()))
}

export const kotlinCompilerRelay = (): Plugin => ({
  name: 'typika:kotlin-compiler-relay',
  configureServer: (server) => {
    const origin = process.env.TYPIKA_PUBLIC_URL ?? DEV_ENV.TYPIKA_PUBLIC_URL
    const relay = kotlinRelayFromEnv(process.env, origin)
    if (relay === undefined) return
    server.middlewares.use((request, response, next) => {
      if (!(request.url ?? '').startsWith(`${KOTLIN_COMPILER_PATH}/`)) return next()
      void toWebRequest(request, origin)
        .then(relay)
        .then((answer) => sendWebResponse(answer, response))
    })
  },
})
