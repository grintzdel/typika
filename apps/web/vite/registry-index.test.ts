import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { LocalIndexBuild } from '@typika/registry-tools'
import { describe, expect, it, vi } from 'vitest'

import { registryIndex } from '../src/modules/shared/__tests__/registry-index.factory.ts'
import { REGISTRY_INDEX_MODULE, registryIndexPlugin } from './registry-index.ts'

const INDEX = registryIndex()

const callHook = (hook: unknown, context: object, ...args: ReadonlyArray<unknown>): unknown => {
  const handler: unknown = typeof hook === 'object' && hook !== null && 'handler' in hook ? hook.handler : hook
  if (typeof handler !== 'function') throw new Error('Expected a hook function')
  return Reflect.apply(handler, context, args)
}

const BUILD: LocalIndexBuild = { checks: [], index: INDEX, templates: [], deprecated: new Set() }
const KEY = 'a'.repeat(64)
const ARTIFACT = '{"_tag":"Failed","diagnostics":[]}\n'

const pluginOf = (build: LocalIndexBuild, registryDir?: string) => {
  const builder = vi.fn(async () => build)
  return { plugin: registryIndexPlugin(builder, registryDir), builder }
}

const registryWithArtifacts = async (files: Readonly<Record<string, string>>) => {
  const root = await mkdtemp(join(tmpdir(), 'typika-registry-'))
  const dir = join(root, 'artifacts', 'kotlin')
  await mkdir(dir, { recursive: true })
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(dir, name), content)))
  return root
}

type Middleware = (
  request: { readonly url?: string },
  response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void },
  next: (error?: unknown) => void
) => void

const middlewaresOf = (plugin: ReturnType<typeof registryIndexPlugin>) => {
  const middlewares = new Map<string, Middleware>()
  const server = {
    config: { logger: { error: vi.fn() } },
    middlewares: { use: (path: string, middleware: Middleware) => middlewares.set(path, middleware) },
  }
  callHook(plugin.configureServer, {}, server)
  return middlewares
}

const serve = (middleware: Middleware | undefined, url: string) =>
  new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve, reject) => {
    const headers: Record<string, string> = {}
    const response = {
      statusCode: 200,
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value
      },
      end: (body?: string) => resolve({ status: response.statusCode, headers, body: body ?? '' }),
    }
    if (middleware === undefined) reject(new Error('No middleware'))
    else middleware({ url }, response, reject)
  })

const load = (plugin: ReturnType<typeof registryIndexPlugin>, consumer: 'client' | 'server') => {
  const context = {
    environment: { config: { consumer } },
    error: (message: string) => {
      throw new Error(message)
    },
  }
  return Promise.resolve(callHook(plugin.load, context, `\0${REGISTRY_INDEX_MODULE}`))
}

describe('registryIndexPlugin', () => {
  it('resolves the index module for the server', async () => {
    const { plugin, builder } = pluginOf(BUILD)

    expect(callHook(plugin.resolveId, {}, REGISTRY_INDEX_MODULE)).toBe(`\0${REGISTRY_INDEX_MODULE}`)
    await expect(load(plugin, 'server')).resolves.toBe(`export default ${JSON.stringify(INDEX)}`)
    await load(plugin, 'server')
    expect(builder).toHaveBeenCalledOnce()
  })

  it('keeps the index module out of the client', async () => {
    const { plugin } = pluginOf(BUILD)

    await expect(load(plugin, 'client')).rejects.toThrow(/server/)
  })

  it('fails when the registry has errors', async () => {
    const { plugin } = pluginOf({ checks: [], index: undefined, templates: [], deprecated: new Set() })

    await expect(load(plugin, 'server')).rejects.toThrow(/registry/)
  })

  it('serves the precompiled Kotlin artifacts in development', async () => {
    const { plugin } = pluginOf(BUILD, await registryWithArtifacts({ [`${KEY}.json`]: ARTIFACT }))
    const artifacts = middlewaresOf(plugin).get('/registry/artifacts/kotlin')

    await expect(serve(artifacts, `/${KEY}.json`)).resolves.toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: ARTIFACT,
    })
    await expect(serve(artifacts, `/${'b'.repeat(64)}.json`)).resolves.toMatchObject({ status: 404 })
    await expect(serve(artifacts, '/../index.json')).resolves.toMatchObject({ status: 404 })
  })

  it('emits the precompiled Kotlin artifacts next to the index', async () => {
    const { plugin } = pluginOf(BUILD, await registryWithArtifacts({ [`${KEY}.json`]: ARTIFACT }))
    const emitFile = vi.fn()

    await callHook(plugin.generateBundle, { environment: { config: { consumer: 'client' } }, emitFile })

    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: `registry/artifacts/kotlin/${KEY}.json`,
      source: ARTIFACT,
    })
  })
})
