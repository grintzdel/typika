import * as Schema from 'effect/Schema'
import { describe, expect, it } from 'vitest'

import { ProjectPathSchema } from './project.domain-model.ts'

const isProjectPath = Schema.is(ProjectPathSchema)

describe('ProjectPathSchema', () => {
  it.each([['typika.toml'], ['src/order.ts'], ['tour/01-intro.md'], ['.gitignore']])('accepts %s', (path) => {
    expect(isProjectPath(path)).toBe(true)
  })

  it.each([
    [''],
    ['/src/order.ts'],
    ['../order.ts'],
    ['src/../order.ts'],
    ['./order.ts'],
    ['src//order.ts'],
    ['src\\order.ts'],
  ])('rejects %j', (path) => {
    expect(isProjectPath(path)).toBe(false)
  })
})
