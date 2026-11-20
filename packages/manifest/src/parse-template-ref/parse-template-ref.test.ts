import * as Option from 'effect/Option'
import { describe, expect, it } from 'vitest'

import { formatTemplateRef, parseTemplateRef } from './parse-template-ref.ts'

describe('parseTemplateRef', () => {
  it.each([
    ['github:typika-app/templates', { owner: 'typika-app', repo: 'templates' }],
    ['github:typika-app/templates/strategy/ts', { owner: 'typika-app', repo: 'templates', path: 'strategy/ts' }],
    ['github:typika-app/templates@v1.2.0', { owner: 'typika-app', repo: 'templates', ref: 'v1.2.0' }],
    ['github:some-one/my.repo_2/a/b@3f2c1e0', { owner: 'some-one', repo: 'my.repo_2', path: 'a/b', ref: '3f2c1e0' }],
  ])('parses %s', (input, expected) => {
    expect(Option.getOrUndefined(parseTemplateRef(input))).toEqual(expected)
  })

  it.each([
    ['typika-app/templates'],
    ['gitlab:typika-app/templates'],
    ['github:typika'],
    ['github:-typika-app/templates'],
    ['github:typika-app/templates/'],
    ['github:typika-app/templates/../other'],
    ['github:typika-app/templates/a//b'],
    ['github:typika-app/templates@'],
    ['github:typika-app/templates@main@v1'],
    ['github:typika-app/templates@has space'],
  ])('rejects %s', (input) => {
    expect(Option.isNone(parseTemplateRef(input))).toBe(true)
  })

  it('formats a reference back to its canonical form', () => {
    const input = 'github:typika-app/templates/strategy/ts@v1'

    expect(Option.map(parseTemplateRef(input), formatTemplateRef)).toEqual(Option.some(input))
  })
})
