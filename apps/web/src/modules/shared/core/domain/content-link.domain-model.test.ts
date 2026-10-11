import { describe, expect, it } from 'vitest'

import { resolveContentLink } from './content-link.domain-model.ts'

describe('resolveContentLink', () => {
  const embedded = ['strategy-ts', 'observer-ts']

  it('opens an embedded template in its sandbox', () => {
    expect(resolveContentLink('typika:observer-ts', embedded)).toEqual({ _tag: 'Template', href: '/play/observer-ts' })
  })

  it('keeps a template that is not embedded as text', () => {
    expect(resolveContentLink('typika:open-closed-ts', embedded)).toEqual({ _tag: 'Text' })
  })

  it('opens web links', () => {
    expect(resolveContentLink('https://refactoring.guru/', embedded)).toEqual({
      _tag: 'External',
      href: 'https://refactoring.guru/',
    })
  })

  it('keeps any other link as text', () => {
    expect(resolveContentLink('javascript:alert(1)', embedded)).toEqual({ _tag: 'Text' })
    expect(resolveContentLink('src/main.ts', embedded)).toEqual({ _tag: 'Text' })
    expect(resolveContentLink(undefined, embedded)).toEqual({ _tag: 'Text' })
  })
})
