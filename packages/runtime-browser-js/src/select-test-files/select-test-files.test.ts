import { describe, expect, it } from 'vitest'

import { MANIFEST_TOML, projectFixture, projectPath } from '../__tests__/project.factory.ts'
import { selectTestFiles } from './select-test-files.ts'

const files = {
  'src/main.ts': '',
  'src/money.test.ts': '',
  'tests/quote.test.ts': '',
  'tests/b/express.test.ts': '',
  'tests/fixture.ts': '',
  'exercises/implement-express/tests/express.test.ts': '',
}

describe('selectTestFiles', () => {
  it('uses the default include of the language and always leaves exercises out', () => {
    expect(selectTestFiles(projectFixture(files), {})).toEqual([
      'src/money.test.ts',
      'tests/b/express.test.ts',
      'tests/quote.test.ts',
    ])
  })

  it('applies the include and exclude globs of the manifest', () => {
    const manifest = `${MANIFEST_TOML}\n[tests]\ninclude = ["tests/**/*.test.ts"]\nexclude = ["tests/b/**"]\n`
    expect(selectTestFiles(projectFixture(files, manifest), {})).toEqual(['tests/quote.test.ts'])
  })

  it('keeps only the requested files that exist', () => {
    expect(
      selectTestFiles(projectFixture(files), {
        files: [projectPath('tests/quote.test.ts'), projectPath('tests/missing.test.ts')],
      })
    ).toEqual(['tests/quote.test.ts'])
  })
})
