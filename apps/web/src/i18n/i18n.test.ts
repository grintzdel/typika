import { describe, expect, it } from 'vitest'

import { detectLanguage } from './i18n.ts'
import { resources } from './resources.ts'

const keysOf = (value: unknown, prefix = ''): Array<string> =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) => keysOf(child, `${prefix}${key}.`))
    : [prefix]

describe('i18n', () => {
  it('picks the first supported browser language', () => {
    expect(detectLanguage(['de-DE', 'fr-FR', 'en'])).toBe('fr')
  })

  it('falls back to English', () => {
    expect(detectLanguage(['de-DE'])).toBe('en')
  })

  it('has the same keys in every language', () => {
    expect(keysOf(resources.fr)).toEqual(keysOf(resources.en))
  })
})
