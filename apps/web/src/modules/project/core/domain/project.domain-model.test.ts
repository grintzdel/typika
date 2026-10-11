import { ProjectPathSchema } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'
import { describe, expect, it } from 'vitest'

import { modifiedPathsOf } from './project.domain-model.ts'

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
