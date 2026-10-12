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

const pluginOf = (build: LocalIndexBuild) => {
  const builder = vi.fn(async () => build)
  return { plugin: registryIndexPlugin(builder), builder }
}

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
    const { plugin, builder } = pluginOf({ checks: [], index: INDEX })

    expect(callHook(plugin.resolveId, {}, REGISTRY_INDEX_MODULE)).toBe(`\0${REGISTRY_INDEX_MODULE}`)
    await expect(load(plugin, 'server')).resolves.toBe(`export default ${JSON.stringify(INDEX)}`)
    await load(plugin, 'server')
    expect(builder).toHaveBeenCalledOnce()
  })

  it('keeps the index module out of the client', async () => {
    const { plugin } = pluginOf({ checks: [], index: INDEX })

    await expect(load(plugin, 'client')).rejects.toThrow(/server/)
  })

  it('fails when the registry has errors', async () => {
    const { plugin } = pluginOf({ checks: [], index: undefined })

    await expect(load(plugin, 'server')).rejects.toThrow(/registry/)
  })
})
