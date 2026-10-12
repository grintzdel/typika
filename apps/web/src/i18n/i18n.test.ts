import { createInstance } from 'i18next'
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

  it('formats the dates and the numbers in the chosen language', async () => {
    const t = await createInstance().init({ resources, lng: 'fr', interpolation: { escapeValue: false } })

    expect(t('hub:template.updatedOn', { date: new Date('2026-10-12') })).toBe('12 octobre 2026')
    expect(t('hub:list.count', { count: 1234 })).toMatch(/^1\s234 templates$/u)
  })
})
