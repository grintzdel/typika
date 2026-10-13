import type { ProcessOutput } from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import type { LoadKotlinModule } from '../domain/kotlin-module.domain-model.ts'
import { runKotlinProgram } from './run-kotlin-program.ts'

class IllegalStateException extends Error {}

const run = async (load: LoadKotlinModule) => {
  const outputs: Array<ProcessOutput> = []
  await runKotlinProgram({
    load,
    mapStack: (stack) => (stack.includes('main') ? [{ file: 'src/main/kotlin/Main.kt', line: 4, column: 5 }] : []),
    emit: (output) => outputs.push(output),
  })
  return outputs
}

describe('runKotlinProgram', () => {
  it('captures what main prints, then exits with 0', async () => {
    const outputs = await run(async ({ console }) => {
      console.log('Ada (regular)')
      console.error('careful')
    })

    expect(outputs).toEqual([
      { _tag: 'Stdout', chunk: 'Ada (regular)\n' },
      { _tag: 'Stderr', chunk: 'careful\n' },
      { _tag: 'Exit', code: 0 },
    ])
  })

  it('prints an uncaught exception like the JVM, then exits with 1', async () => {
    const outputs = await run(async () => {
      const error = new IllegalStateException('no orders')
      error.stack = 'at main'
      throw error
    })

    expect(outputs).toEqual([
      {
        _tag: 'Stderr',
        chunk: 'Exception in thread "main" IllegalStateException: no orders\n    at src/main/kotlin/Main.kt:4:5\n',
      },
      { _tag: 'Exit', code: 1 },
    ])
  })
})
