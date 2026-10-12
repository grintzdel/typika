import { describe, expect, it } from 'vitest'

import { languageOf } from './language.domain-model.ts'

describe('languageOf', () => {
  it.each([
    ['src/main.ts', 'typescript'],
    ['src/app.tsx', 'typescript'],
    ['src/main.js', 'javascript'],
    ['cmd/shop/main.go', 'go'],
    ['go.mod', 'text'],
    ['package.json', 'json'],
    ['tour/01-overview.md', 'markdown'],
    ['LICENSE', 'text'],
    ['typika.toml', 'text'],
  ])('reads %s as %s', (path, language) => {
    expect(languageOf(path)).toBe(language)
  })
})
