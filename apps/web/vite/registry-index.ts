import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildLocalIndex,
  formatReport,
  KOTLIN_ARTIFACTS_DIR,
  readKotlinArtifactKeys,
  type LocalIndexBuild,
  type RegistryIndex,
} from '@typika/registry-tools'
import type { Plugin } from 'vite'

export const REGISTRY_INDEX_MODULE = 'virtual:typika/registry-index'
const RESOLVED_MODULE = `\0${REGISTRY_INDEX_MODULE}`
const INDEX_PATH = '/registry/index.json'
const REGISTRY_DIR = fileURLToPath(new URL('../../../registry', import.meta.url))
const ARTIFACTS_PATH = `/registry/${KOTLIN_ARTIFACTS_DIR}`
const ARTIFACT_FILE = /^\/([0-9a-f]{64})\.json$/

export const registryIndexPlugin = (
  build: () => Promise<LocalIndexBuild> = () => buildLocalIndex(REGISTRY_DIR),
  registryDir = REGISTRY_DIR
): Plugin => {
  let built: Promise<RegistryIndex> | undefined

  const index = () =>
    (built ??= build().then((result) => {
      if (result.index === undefined) throw new Error(`The local registry has errors:\n${formatReport(result.checks)}`)
      return result.index
    }))

  const artifact = (key: string) => readFile(join(registryDir, KOTLIN_ARTIFACTS_DIR, `${key}.json`), 'utf8')

  return {
    name: 'typika:registry-index',
    resolveId: (id) => (id === REGISTRY_INDEX_MODULE ? RESOLVED_MODULE : undefined),
    async load(id) {
      if (id !== RESOLVED_MODULE) return undefined
      if (this.environment.config.consumer === 'client')
        return this.error(`${REGISTRY_INDEX_MODULE} is for the server only`)
      return `export default ${JSON.stringify(await index())}`
    },
    configureServer: (server) => {
      index().catch((error: unknown) => server.config.logger.error(String(error)))
      server.middlewares.use(INDEX_PATH, (_, response, next) => {
        index().then((value) => {
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(value))
        }, next)
      })
      server.middlewares.use(ARTIFACTS_PATH, (request, response) => {
        const key = ARTIFACT_FILE.exec(request.url ?? '')?.[1]
        const notFound = () => {
          response.statusCode = 404
          response.end()
        }
        if (key === undefined) return notFound()
        artifact(key).then((body) => {
          response.setHeader('Content-Type', 'application/json')
          response.end(body)
        }, notFound)
      })
    },
    async generateBundle() {
      if (this.environment.config.consumer !== 'client') return
      this.emitFile({ type: 'asset', fileName: INDEX_PATH.slice(1), source: JSON.stringify(await index()) })
      const artifacts = await Promise.all(
        [...(await readKotlinArtifactKeys(registryDir))].map(async (key) => ({ key, source: await artifact(key) }))
      )
      for (const { key, source } of artifacts)
        this.emitFile({ type: 'asset', fileName: `${ARTIFACTS_PATH.slice(1)}/${key}.json`, source })
    },
  }
}
