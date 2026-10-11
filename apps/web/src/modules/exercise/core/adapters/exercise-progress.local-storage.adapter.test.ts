import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { makeExerciseProgressLocalStorage } from './exercise-progress.local-storage.adapter.ts'

const memoryStorage = (): Storage => {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  }
}

const failing = () => {
  throw new Error('SecurityError')
}

const brokenStorage = (): Storage => ({
  length: 0,
  clear: failing,
  getItem: failing,
  key: failing,
  removeItem: failing,
  setItem: failing,
})

describe('exercise progress in local storage', () => {
  it('remembers the solved exercises of each template', async () => {
    const progress = makeExerciseProgressLocalStorage(memoryStorage())

    await Effect.runPromise(progress.markSolved('strategy-ts', 'implement-express'))
    await Effect.runPromise(progress.markSolved('strategy-ts', 'implement-express'))
    await Effect.runPromise(progress.markSolved('observer-ts', 'add-listener'))

    expect(await Effect.runPromise(progress.solved('strategy-ts'))).toEqual(['implement-express'])
  })

  it('ignores a value it cannot read', async () => {
    const storage = memoryStorage()
    storage.setItem('typika:solved-exercises:strategy-ts', '{not json')

    expect(await Effect.runPromise(makeExerciseProgressLocalStorage(storage).solved('strategy-ts'))).toEqual([])
  })

  it('carries on when the storage is unavailable', async () => {
    const progress = makeExerciseProgressLocalStorage(brokenStorage())

    await Effect.runPromise(progress.markSolved('strategy-ts', 'implement-express'))

    expect(await Effect.runPromise(progress.solved('strategy-ts'))).toEqual([])
  })
})
