import { describe, expect, it } from 'vitest'

import { isRepositoryName, repositoryNameOf } from './repository-push.domain-model.ts'

describe('isRepositoryName', () => {
  it.each(['strategy-ts', 'my.repo_2', 'A'])('accepts %s', (name) => {
    expect(isRepositoryName(name)).toBe(true)
  })

  it.each(['', 'with space', 'owner/repo', 'é', '.', '..', 'a'.repeat(101)])('refuses "%s"', (name) => {
    expect(isRepositoryName(name)).toBe(false)
  })
})

describe('repositoryNameOf', () => {
  it.each([
    ['strategy-ts', 'strategy-ts'],
    ['strategy-ts (copie)', 'strategy-ts-copie'],
    ['  Mon projet ! ', 'Mon-projet'],
    ['???', 'typika-project'],
  ])('proposes a valid name for "%s"', (projectName, expected) => {
    expect(repositoryNameOf(projectName)).toBe(expected)
    expect(isRepositoryName(repositoryNameOf(projectName))).toBe(true)
  })
})
