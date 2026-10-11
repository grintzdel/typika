import * as esbuild from 'esbuild-wasm'
import { describe, expect, it } from 'vitest'

import { projectFixture } from '../__tests__/project.factory.ts'
import { testInProcess } from './test-in-process.ts'

const SOURCE = 'export const add = (a: number, b: number): number => a + b\n'

const runWithValue = (value: number) =>
  testInProcess(
    esbuild,
    projectFixture({
      'src/value.ts': `export const value = ${value}\n`,
      'tests/value.test.ts':
        "import { expect, it } from 'vitest'\nimport { value } from '../src/value.ts'\nit('is one', () => expect(value).toBe(1))\n",
    })
  )

describe('testInProcess', () => {
  it('runs the selected tests of a project in this process', async () => {
    const result = await testInProcess(
      esbuild,
      projectFixture({
        'src/add.ts': SOURCE,
        'tests/add.test.ts':
          "import { expect, it } from 'vitest'\nimport { add } from '../src/add.ts'\nit('adds', () => expect(add(1, 2)).toBe(3))\nit('fails', () => expect(add(1, 2)).toBe(4))\n",
        'exercises/fix/start/tests/other.test.ts': "import { it } from 'vitest'\nit('is ignored', () => {})\n",
      })
    )

    expect(result._tag === 'Tested' && result.tests).toEqual([
      { file: 'tests/add.test.ts', name: 'adds', status: 'passed' },
      { file: 'tests/add.test.ts', name: 'fails', status: 'failed' },
    ])
  })

  it('reports a project that does not build', async () => {
    const result = await testInProcess(
      esbuild,
      projectFixture({ 'tests/broken.test.ts': "import { it } from 'vitest'\nit('x', () => {\n" })
    )

    expect(result._tag).toBe('BuildFailed')
  })

  it('isolates two runs of the same paths', async () => {
    const [first, second] = [await runWithValue(1), await runWithValue(2)]

    expect(first._tag === 'Tested' && first.tests[0]?.status).toBe('passed')
    expect(second._tag === 'Tested' && second.tests[0]?.status).toBe('failed')
  })
})
