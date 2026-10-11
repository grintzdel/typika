import type { Manifest } from '@typika/manifest'
import { describe, expect, it } from 'vitest'

import { manifestOf } from '../__tests__/manifest.factory.ts'
import { checkRefs } from './check-refs.ts'

const SELF = 'github:typika/templates/strategy/ts'
const BASE = 'github:typika/templates/strategy-base/ts'
const GO = 'github:typika/templates/strategy/go'

const template = manifestOf({ extra: `\n[base]\ntemplate = "${BASE}"\n\n[variants]\ngo = "${GO}"\n` })

const registry =
  (entries: Readonly<Record<string, Manifest>>) =>
  (ref: string): Manifest | undefined =>
    entries[ref.replace(/@.*$/, '')]

const codesOf = (issues: ReadonlyArray<{ readonly code: string }>) => issues.map((issue) => issue.code)

describe('checkRefs', () => {
  const base = manifestOf({ name: 'strategy-base-ts', role: 'base' })
  const go = manifestOf({
    name: 'strategy-go',
    language: 'go',
    kind: 'go',
    extra: `\n[variants]\ntypescript = "${SELF}"\n`,
  })

  it('accepts a base and a symmetric variant that resolve', () => {
    expect(checkRefs(template, SELF, registry({ [BASE]: base, [GO]: go }))).toEqual([])
  })

  it('reports refs that resolve to nothing', () => {
    const issues = checkRefs(template, SELF, registry({}))

    expect(codesOf(issues)).toEqual(['E_REF_UNRESOLVABLE', 'E_REF_UNRESOLVABLE'])
    expect(issues.map((issue) => issue.path)).toEqual(['base.template', 'variants.go'])
  })

  it('reports a base in another language or runtime, or without the base role', () => {
    const goBase = manifestOf({ name: 'strategy-base-go', language: 'go', kind: 'go' })

    expect(codesOf(checkRefs(template, SELF, registry({ [BASE]: goBase, [GO]: go })))).toEqual([
      'W_BASE_NOT_BASE_ROLE',
      'E_BASE_MISMATCH',
    ])
  })

  it('reports a variant in the wrong language, one-sided, or on another topic', () => {
    const kotlin = manifestOf({
      name: 'strategy-kotlin',
      language: 'kotlin',
      kind: 'kotlin',
      topic: 'principle/open-closed',
    })

    expect(codesOf(checkRefs(template, SELF, registry({ [BASE]: base, [GO]: kotlin })))).toEqual([
      'E_VARIANT_LANGUAGE_MISMATCH',
      'W_VARIANT_NOT_SYMMETRIC',
      'W_VARIANT_TOPIC_DIVERGES',
    ])
  })
})
