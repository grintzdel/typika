import { describe, expect, it } from 'vitest'

import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'
import { makeIndexedDbCompileCache } from './indexed-db-compile-cache.ts'

const compiled = (code: string): KotlinCompilation => ({
  _tag: 'Compiled',
  artifact: { kind: 'js', code, sourceMap: '{}' },
  diagnostics: [],
})

const databaseName = () => `typika-test-${crypto.randomUUID()}`

describe('makeIndexedDbCompileCache', () => {
  it('keeps a compilation from one page load to the next', async () => {
    const name = databaseName()
    await makeIndexedDbCompileCache({ databaseName: name, maxBytes: 1_000 }).set('a', compiled('x'))

    expect(await makeIndexedDbCompileCache({ databaseName: name, maxBytes: 1_000 }).get('a')).toEqual(compiled('x'))
  })

  it('misses a key it never stored', async () => {
    expect(await makeIndexedDbCompileCache({ databaseName: databaseName(), maxBytes: 1_000 }).get('a')).toBeUndefined()
  })

  it('evicts the least recently used compilation when it exceeds its size', async () => {
    const cache = makeIndexedDbCompileCache({ databaseName: databaseName(), maxBytes: 200 })
    await cache.set('a', compiled('a'.repeat(30)))
    await cache.set('b', compiled('b'.repeat(30)))
    await cache.get('a')
    await cache.set('c', compiled('c'.repeat(30)))

    expect(await cache.get('a')).toBeDefined()
    expect(await cache.get('b')).toBeUndefined()
    expect(await cache.get('c')).toBeDefined()
  })

  it('does not keep a compilation larger than the whole cache', async () => {
    const cache = makeIndexedDbCompileCache({ databaseName: databaseName(), maxBytes: 10 })
    await cache.set('a', compiled('a'.repeat(30)))

    expect(await cache.get('a')).toBeUndefined()
  })
})
