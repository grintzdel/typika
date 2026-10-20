import { execFile } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { buildLocalIndex } from '@typika/registry-tools'

const MONOREPO = fileURLToPath(new URL('../../../..', import.meta.url))
const ARCHIVE = /^\/archive\/typika\/templates\/([0-9a-f]{7,40})\.tar\.gz$/

export type LocalRegistry = {
  readonly indexUrl: string
  readonly archiveUrl: string
  readonly close: () => Promise<void>
}

const archiveOf = async (ref: string) =>
  (
    await promisify(execFile)(
      'git',
      ['-C', MONOREPO, 'archive', '--format=tar.gz', `--prefix=templates-${ref}/`, `${ref}:templates`],
      { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }
    )
  ).stdout

export const serveLocalRegistry = async (only: ReadonlySet<string>): Promise<LocalRegistry> => {
  const { index, checks } = await buildLocalIndex(`${MONOREPO}/registry`, undefined, { only })
  if (index === undefined) throw new Error(`The local index does not build: ${JSON.stringify(checks)}`)
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://registry').pathname
    if (path === '/index.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(index))
      return
    }
    const ref = ARCHIVE.exec(path)?.[1]
    if (ref === undefined) {
      response.writeHead(404).end('Not found')
      return
    }
    archiveOf(ref).then(
      (archive) => response.writeHead(200, { 'Content-Type': 'application/gzip' }).end(archive),
      () => response.writeHead(404).end('Not found')
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('The local registry has no port.')
  const origin = `http://127.0.0.1:${address.port}`
  return {
    indexUrl: `${origin}/index.json`,
    archiveUrl: `${origin}/archive/{owner}/{repo}/{ref}.tar.gz`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
