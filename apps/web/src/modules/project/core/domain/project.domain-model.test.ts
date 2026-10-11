import { ProjectPathSchema } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'
import { describe, expect, it } from 'vitest'

import { modifiedPathsOf, originOfKey, projectKeyOf, sameOrigin } from './project.domain-model.ts'

const path = Schema.decodeUnknownSync(ProjectPathSchema)
const files = (entries: Readonly<Record<string, string>>) =>
  new Map(Object.entries(entries).map(([name, content]) => [path(name), content]))

describe('modifiedPathsOf', () => {
  it('lists the files whose content differs from the template, sorted', () => {
    const template = files({ 'src/b.ts': 'b', 'src/a.ts': 'a', 'README.md': '#' })

    expect(modifiedPathsOf(template, files({ 'src/b.ts': 'B', 'src/a.ts': 'A', 'README.md': '#' }))).toEqual([
      'src/a.ts',
      'src/b.ts',
    ])
  })

  it('lists the files added or removed since the template', () => {
    const template = files({ 'src/a.ts': 'a', 'src/old.ts': 'old' })

    expect(modifiedPathsOf(template, files({ 'src/a.ts': 'a', 'src/new.ts': 'new' }))).toEqual([
      'src/new.ts',
      'src/old.ts',
    ])
  })

  it('is empty when the project matches the template', () => {
    expect(modifiedPathsOf(files({ 'src/a.ts': 'a' }), files({ 'src/a.ts': 'a' }))).toEqual([])
  })
})

describe('project keys', () => {
  it('names the project of a template or of one of its exercises', () => {
    expect(projectKeyOf('strategy-ts', undefined)).toBe('strategy-ts')
    expect(projectKeyOf('strategy-ts', 'implement-express')).toBe('strategy-ts#implement-express')
  })

  it('reads the origin back from the key', () => {
    expect(originOfKey('strategy-ts')).toEqual({ kind: 'template', name: 'strategy-ts' })
    expect(originOfKey('strategy-ts#implement-express')).toEqual({
      kind: 'exercise',
      name: 'strategy-ts',
      exercise: 'implement-express',
    })
  })

  it('tells the template project from its exercise projects', () => {
    const template = originOfKey('strategy-ts')
    const exercise = originOfKey('strategy-ts#implement-express')

    expect(sameOrigin(template, originOfKey('strategy-ts'))).toBe(true)
    expect(sameOrigin(template, exercise)).toBe(false)
    expect(sameOrigin(exercise, template)).toBe(false)
    expect(sameOrigin(exercise, originOfKey('strategy-ts#other'))).toBe(false)
  })
})
