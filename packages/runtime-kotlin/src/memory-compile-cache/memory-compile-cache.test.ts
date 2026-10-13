import { describe, expect, it } from 'vitest'

import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'
import { makeMemoryCompileCache } from './memory-compile-cache.ts'

const compiled = (code: string): KotlinCompilation => ({
  _tag: 'Compiled',
  artifact: { kind: 'js', code, sourceMap: '{}' },
  diagnostics: [],
})

describe('makeMemoryCompileCache', () => {
  it('returns what was stored under a key', async () => {
    const cache = makeMemoryCompileCache(1_000)
    await cache.set('a', compiled('x'))

    expect(await cache.get('a')).toEqual(compiled('x'))
    expect(await cache.get('b')).toBeUndefined()
  })

  it('evicts the least recently used compilation when it exceeds its size', async () => {
    const cache = makeMemoryCompileCache(200)
    await cache.set('a', compiled('a'.repeat(30)))
    await cache.set('b', compiled('b'.repeat(30)))
    await cache.get('a')
    await cache.set('c', compiled('c'.repeat(30)))

    expect(await cache.get('a')).toBeDefined()
    expect(await cache.get('b')).toBeUndefined()
    expect(await cache.get('c')).toBeDefined()
  })

  it('does not keep a compilation larger than the whole cache', async () => {
    const cache = makeMemoryCompileCache(10)
    await cache.set('a', compiled('a'.repeat(30)))

    expect(await cache.get('a')).toBeUndefined()
  })
})
