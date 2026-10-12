import { describe, expect, it } from 'vitest'

import { preferredLanguage, storeLanguage } from './language-preference.ts'

const memoryStorage = (entries: Record<string, string> = {}) => {
  const values = new Map(Object.entries(entries))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

const brokenStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('language preference', () => {
  it('prefers the stored language over the browser one', () => {
    expect(preferredLanguage(memoryStorage({ 'typika:language': 'en' }), ['fr-FR'])).toBe('en')
  })

  it('detects the browser language when none is stored', () => {
    expect(preferredLanguage(memoryStorage(), ['fr-FR'])).toBe('fr')
  })

  it('ignores a stored language that is not supported', () => {
    expect(preferredLanguage(memoryStorage({ 'typika:language': 'de' }), ['fr-FR'])).toBe('fr')
  })

  it('detects the browser language when the storage is blocked', () => {
    expect(preferredLanguage(brokenStorage, ['fr-FR'])).toBe('fr')
  })

  it('stores the chosen language for the next visit', () => {
    const storage = memoryStorage()

    storeLanguage(storage, 'fr')

    expect(preferredLanguage(storage, ['en-US'])).toBe('fr')
  })

  it('keeps going when the storage is blocked', () => {
    expect(() => storeLanguage(brokenStorage, 'fr')).not.toThrow()
  })
})
