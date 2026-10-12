import { createReadStream } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { BROTLI_SUFFIX, type GoAssetManifest } from '@typika/runtime-go'
import { goAssetsDir, readAssetManifest } from '@typika/runtime-go/node'
import type { Plugin } from 'vite'

export const GO_ASSETS_MODULE = 'virtual:typika/go-assets'
const RESOLVED_MODULE = `\0${GO_ASSETS_MODULE}`
const ASSETS_DIR = 'assets/go'
const KEY_LENGTH = 16

const MEDIA_TYPES: Readonly<Record<string, string>> = { '.wasm': 'application/wasm' }

const dirOf = (manifest: GoAssetManifest) => `${ASSETS_DIR}/${manifest.key.slice(0, KEY_LENGTH)}/`

export const goAssetsPlugin = (packageDir?: string): Plugin => {
  let base = '/'
  let manifest: Promise<GoAssetManifest> | undefined
  const source = goAssetsDir(packageDir)

  const read = () =>
    (manifest ??= readAssetManifest(packageDir).catch((cause: unknown) => {
      manifest = undefined
      throw new Error(`Go assets missing in ${source}: run \`pnpm --filter @typika/runtime-go build:assets\`.`, {
        cause,
      })
    }))

  return {
    name: 'typika:go-assets',
    configResolved: (config) => {
      base = config.base
    },
    resolveId: (id) => (id === GO_ASSETS_MODULE ? RESOLVED_MODULE : undefined),
    async load(id) {
      if (id !== RESOLVED_MODULE) return undefined
      const assets = await read()
      return `export default ${JSON.stringify({ assetsUrl: `${base}${dirOf(assets)}`, manifest: assets })}`
    },
    configureServer: (server) => {
      server.middlewares.use(`${base}${ASSETS_DIR}/`, (request, response, next) => {
        read().then((assets) => {
          const [key, name] = (request.url ?? '').slice(1).split('?')[0]?.split('/') ?? []
          const file = assets.files.find((candidate) => candidate.name === name)
          if (key !== assets.key.slice(0, KEY_LENGTH) || file === undefined) return next()
          response.setHeader(
            'Content-Type',
            MEDIA_TYPES[file.name.slice(file.name.lastIndexOf('.'))] ?? 'application/octet-stream'
          )
          response.setHeader('Content-Length', String(file.bytes))
          createReadStream(join(source, file.name)).pipe(response)
          return undefined
        }, next)
      })
    },
    async writeBundle(options) {
      const assets = await read()
      const target = join(options.dir ?? '', dirOf(assets))
      await mkdir(target, { recursive: true })
      await Promise.all(
        assets.files
          .flatMap(({ name }) => [name, `${name}${BROTLI_SUFFIX}`])
          .map((file) => copyFile(join(source, file), join(target, file)))
      )
    },
  }
}
