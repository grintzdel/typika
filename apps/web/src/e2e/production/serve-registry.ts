import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, sep } from 'node:path'
import { argv, env } from 'node:process'

const root = resolve(argv[2] ?? 'dist/client/registry')
const port = Number(env.PORT ?? 3101)

createServer(async (request, response) => {
  const path = resolve(root, `.${decodeURIComponent(new URL(request.url ?? '/', 'http://registry').pathname)}`)
  const info = await stat(path).catch(() => undefined)
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  if (!path.startsWith(`${root}${sep}`) || info?.isFile() !== true) {
    response.writeHead(404).end('Not found')
    return
  }
  response.writeHead(200, { 'Content-Type': path.endsWith('.json') ? 'application/json' : 'text/plain' })
  response.end(await readFile(path))
}).listen(port, '127.0.0.1')
