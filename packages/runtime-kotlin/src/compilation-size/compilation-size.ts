import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'

const BYTES_PER_CHAR = 2

export const compilationSize = (compilation: KotlinCompilation) =>
  BYTES_PER_CHAR *
  (JSON.stringify(compilation.diagnostics).length +
    (compilation._tag === 'Compiled' ? compilation.artifact.code.length + compilation.artifact.sourceMap.length : 0))
