import * as Option from 'effect/Option'
import { describe, expect, it } from 'vitest'

import { formatTemplateRef, parseTemplateRef } from './parse-template-ref.ts'

describe('parseTemplateRef', () => {
  it.each([
    ['github:typika/templates', { owner: 'typika', repo: 'templates' }],
    ['github:typika/templates/strategy/ts', { owner: 'typika', repo: 'templates', path: 'strategy/ts' }],
    ['github:typika/templates@v1.2.0', { owner: 'typika', repo: 'templates', ref: 'v1.2.0' }],
    ['github:some-one/my.repo_2/a/b@3f2c1e0', { owner: 'some-one', repo: 'my.repo_2', path: 'a/b', ref: '3f2c1e0' }],
  ])('parses %s', (input, expected) => {
    expect(Option.getOrUndefined(parseTemplateRef(input))).toEqual(expected)
  })

  it.each([
    ['typika/templates'],
    ['gitlab:typika/templates'],
    ['github:typika'],
    ['github:-typika/templates'],
    ['github:typika/templates/'],
    ['github:typika/templates/../other'],
    ['github:typika/templates/a//b'],
    ['github:typika/templates@'],
    ['github:typika/templates@main@v1'],
    ['github:typika/templates@has space'],
  ])('rejects %s', (input) => {
    expect(Option.isNone(parseTemplateRef(input))).toBe(true)
  })

  it('formats a reference back to its canonical form', () => {
    const input = 'github:typika/templates/strategy/ts@v1'

    expect(Option.map(parseTemplateRef(input), formatTemplateRef)).toEqual(Option.some(input))
  })
})
