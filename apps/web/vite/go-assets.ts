import { createReadStream } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { join } from 'node:path'

import { BROTLI_SUFFIX, type GoAssetManifest, type GoplsAssetManifest } from '@typika/runtime-go'
import { goAssetsDir, goplsAssetsDir, readAssetManifest, readGoplsAssetManifest } from '@typika/runtime-go/node'
import type { Plugin } from 'vite'

export const GO_ASSETS_MODULE = 'virtual:typika/go-assets'
const RESOLVED_MODULE = `\0${GO_ASSETS_MODULE}`
const ASSETS_DIR = 'assets/go'
const GOPLS_ASSETS_DIR = 'assets/gopls'
const KEY_LENGTH = 16

const MEDIA_TYPES: Readonly<Record<string, string>> = { '.wasm': 'application/wasm' }

const dirOf = (manifest: GoAssetManifest) => `${ASSETS_DIR}/${manifest.key.slice(0, KEY_LENGTH)}/`
const goplsDirOf = (manifest: GoplsAssetManifest) => `${GOPLS_ASSETS_DIR}/${manifest.key.slice(0, KEY_LENGTH)}/`

type Assets = { readonly toolchain: GoAssetManifest; readonly gopls: GoplsAssetManifest }

type ServedFile = { readonly name: string; readonly bytes: number }

const serveFrom =
  (dir: string, key: string, files: ReadonlyArray<ServedFile>) =>
  (url: string | undefined, response: ServerResponse) => {
    const [requestedKey, name] = (url ?? '').slice(1).split('?')[0]?.split('/') ?? []
    const file = files.find((candidate) => candidate.name === name)
    if (requestedKey !== key.slice(0, KEY_LENGTH) || file === undefined) return false
    response.setHeader(
      'Content-Type',
      MEDIA_TYPES[file.name.slice(file.name.lastIndexOf('.'))] ?? 'application/octet-stream'
    )
    response.setHeader('Content-Length', String(file.bytes))
    createReadStream(join(dir, file.name)).pipe(response)
    return true
  }

export const goAssetsPlugin = (packageDir?: string): Plugin => {
  let base = '/'
  let manifests: Promise<Assets> | undefined
  const source = goAssetsDir(packageDir)
  const goplsSource = goplsAssetsDir(packageDir)

  const read = () =>
    (manifests ??= Promise.all([readAssetManifest(packageDir), readGoplsAssetManifest(packageDir)]).then(
      ([toolchain, gopls]) => ({ toolchain, gopls }),
      (cause: unknown) => {
        manifests = undefined
        throw new Error(`Go assets missing in ${source}: run \`pnpm --filter @typika/runtime-go build:assets\`.`, {
          cause,
        })
      }
    ))

  return {
    name: 'typika:go-assets',
    configResolved: (config) => {
      base = config.base
    },
    resolveId: (id) => (id === GO_ASSETS_MODULE ? RESOLVED_MODULE : undefined),
    async load(id) {
      if (id !== RESOLVED_MODULE) return undefined
      const { toolchain, gopls } = await read()
      return `export default ${JSON.stringify({
        assetsUrl: `${base}${dirOf(toolchain)}`,
        manifest: toolchain,
        gopls: { assetsUrl: `${base}${goplsDirOf(gopls)}`, manifest: gopls },
      })}`
    },
    configureServer: (server) => {
      server.middlewares.use(`${base}${ASSETS_DIR}/`, (request, response, next) => {
        read().then(({ toolchain }) => {
          if (!serveFrom(source, toolchain.key, toolchain.files)(request.url, response)) next()
        }, next)
      })
      server.middlewares.use(`${base}${GOPLS_ASSETS_DIR}/`, (request, response, next) => {
        read().then(({ gopls }) => {
          if (!serveFrom(goplsSource, gopls.key, gopls.files)(request.url, response)) next()
        }, next)
      })
    },
    async writeBundle(options) {
      const { toolchain, gopls } = await read()
      const target = join(options.dir ?? '', dirOf(toolchain))
      const goplsTarget = join(options.dir ?? '', goplsDirOf(gopls))
      await mkdir(target, { recursive: true })
      await mkdir(goplsTarget, { recursive: true })
      await Promise.all([
        ...toolchain.files
          .flatMap(({ name }) => [name, `${name}${BROTLI_SUFFIX}`])
          .map((file) => copyFile(join(source, file), join(target, file))),
        ...gopls.files.map(({ name }) => copyFile(join(goplsSource, name), join(goplsTarget, name))),
      ])
    },
  }
}
