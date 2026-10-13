import type { IncomingMessage } from 'node:http'

import type { Plugin } from 'vite'

const PROXY_PATH = '/kotlin-compiler'

export const proxiedCompilerUrl = (target: string) => `${PROXY_PATH}/${encodeURIComponent(target)}`

const readBody = async (request: IncomingMessage) => {
  const chunks: Array<Uint8Array> = []
  for await (const chunk of request) if (chunk instanceof Uint8Array) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export const kotlinCompilerProxy = (): Plugin => ({
  name: 'typika-kotlin-compiler-proxy',
  configureServer: (server) => {
    server.middlewares.use(PROXY_PATH, (request, response) => {
      const [, target = '', ...path] = (request.url ?? '').split('/')
      void (async () => {
        const answer = await fetch(`${decodeURIComponent(target)}/${path.join('/')}`, {
          method: request.method ?? 'GET',
          headers: { 'content-type': request.headers['content-type'] ?? 'application/json' },
          ...(request.method === 'POST' ? { body: await readBody(request) } : {}),
        })
        const retryAfter = answer.headers.get('retry-after')
        response.writeHead(answer.status, {
          'content-type': answer.headers.get('content-type') ?? 'application/json',
          ...(retryAfter === null ? {} : { 'retry-after': retryAfter }),
        })
        response.end(Buffer.from(await answer.arrayBuffer()))
      })().catch(() => {
        response.writeHead(502)
        response.end()
      })
    })
  },
})
