import { describe, expect, it } from 'vitest'

import { languageNameOf } from './language-name.domain-model.ts'

describe('languageNameOf', () => {
  it('names a language of the manifest', () => {
    expect(languageNameOf('typescript')).toBe('TypeScript')
  })

  it('keeps an unknown language as it is', () => {
    expect(languageNameOf('cobol')).toBe('cobol')
  })
})
