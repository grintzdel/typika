import { describe, expect, it } from 'vitest'

import { makeStackMapper } from './map-stack.ts'

const MODULE_URL = 'blob:http://localhost/5f0e-program'

const sourceMap = JSON.stringify({
  version: 3,
  sources: ['src/test/kotlin/MoneyTest.kt', 'src/kotlin/util/Preconditions.kt', 'src/main/kotlin/Money.kt'],
  names: [],
  mappings: 'AAAA;AACI;ACAA;ACAA',
})

const mapStack = makeStackMapper({
  sourceMap,
  moduleUrl: MODULE_URL,
  projectFiles: ['src/test/kotlin/MoneyTest.kt', 'src/main/kotlin/Money.kt'],
})

describe('makeStackMapper', () => {
  it('maps V8 frames of the module to the project files, in order', () => {
    const stack = [
      'IllegalStateException: no money',
      `    at captureStack (${MODULE_URL}:3:1)`,
      `    at Money.add (${MODULE_URL}:4:1)`,
      `    at test (${MODULE_URL}:2:1)`,
      '    at runTest (http://localhost/harness.js:10:3)',
    ].join('\n')

    expect(mapStack(stack)).toEqual([
      { file: 'src/main/kotlin/Money.kt', line: 2, column: 5 },
      { file: 'src/test/kotlin/MoneyTest.kt', line: 2, column: 5 },
    ])
  })

  it('maps JavaScriptCore frames too', () => {
    const stack = `add@${MODULE_URL}:4:1\ntest@${MODULE_URL}:2:1\nrunTest@http://localhost/harness.js:10:3`

    expect(mapStack(stack).map((location) => location.file)).toEqual([
      'src/main/kotlin/Money.kt',
      'src/test/kotlin/MoneyTest.kt',
    ])
  })

  it('ignores a stack with no frame in the module', () => {
    expect(mapStack('Error: boom\n    at main (http://localhost/app.js:1:1)')).toEqual([])
  })
})
