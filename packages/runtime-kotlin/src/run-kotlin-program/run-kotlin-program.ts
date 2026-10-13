import type { ProcessOutput } from '@typika/runtime-core'

import { formatUncaught } from '../describe-kotlin-error/describe-kotlin-error.ts'
import type { LoadKotlinModule } from '../domain/kotlin-module.domain-model.ts'
import { makeKotlinConsole } from '../make-kotlin-console/make-kotlin-console.ts'
import type { MapStack } from '../map-stack/map-stack.ts'

export type RunKotlinProgramOptions = {
  readonly load: LoadKotlinModule
  readonly mapStack: MapStack
  readonly emit: (output: ProcessOutput) => void
}

const ignore = () => undefined

export const runKotlinProgram = async ({ load, mapStack, emit }: RunKotlinProgramOptions): Promise<void> => {
  try {
    await load({
      describe: ignore,
      xdescribe: ignore,
      it: ignore,
      xit: ignore,
      console: makeKotlinConsole((stream, chunk) => emit({ _tag: stream === 'stdout' ? 'Stdout' : 'Stderr', chunk })),
    })
  } catch (error) {
    emit({ _tag: 'Stderr', chunk: formatUncaught(error, mapStack) })
    emit({ _tag: 'Exit', code: 1 })
    return
  }
  emit({ _tag: 'Exit', code: 0 })
}
