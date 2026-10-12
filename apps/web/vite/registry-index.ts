import { fileURLToPath } from 'node:url'

import { buildLocalIndex, formatReport, type LocalIndexBuild, type RegistryIndex } from '@typika/registry-tools'
import type { Plugin } from 'vite'

export const REGISTRY_INDEX_MODULE = 'virtual:typika/registry-index'
const RESOLVED_MODULE = `\0${REGISTRY_INDEX_MODULE}`
const INDEX_PATH = '/registry/index.json'
const REGISTRY_DIR = fileURLToPath(new URL('../../../registry', import.meta.url))

export const registryIndexPlugin = (
  build: () => Promise<LocalIndexBuild> = () => buildLocalIndex(REGISTRY_DIR)
): Plugin => {
  let built: Promise<RegistryIndex> | undefined

  const index = () =>
    (built ??= build().then((result) => {
      if (result.index === undefined) throw new Error(`The local registry has errors:\n${formatReport(result.checks)}`)
      return result.index
    }))

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
    },
    async generateBundle() {
      if (this.environment.config.consumer !== 'client') return
      this.emitFile({ type: 'asset', fileName: INDEX_PATH.slice(1), source: JSON.stringify(await index()) })
    },
  }
}
