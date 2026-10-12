import { describe, expect, it } from 'vitest'

import { matchesBuildContext } from './match-build-context.ts'

describe('matchesBuildContext', () => {
  it.each([
    ['quote.go', true],
    ['quote_test.go', true],
    ['quote_js.go', true],
    ['quote_wasm.go', true],
    ['quote_js_wasm.go', true],
    ['quote_linux.go', false],
    ['quote_amd64.go', false],
    ['quote_windows_test.go', false],
    ['quote_linux_wasm.go', false],
    ['shipping_rules.go', true],
  ])('reads the GOOS and GOARCH of %s', (fileName, expected) => {
    expect(matchesBuildContext(fileName, undefined)).toBe(expected)
  })

  it.each([
    ['js', true],
    ['!js', false],
    ['linux || (js && wasm)', true],
    ['ignore', false],
    ['go1.21 && !go1.99', true],
    ['gc && !cgo', true],
  ])('evaluates //go:build %s', (constraint, expected) => {
    expect(matchesBuildContext('a.go', constraint)).toBe(expected)
  })
})
