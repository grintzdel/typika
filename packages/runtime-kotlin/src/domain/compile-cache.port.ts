import type { KotlinCompilation } from './compile-protocol.domain-model.ts'

export type CompileCache = {
  readonly get: (key: string) => Promise<KotlinCompilation | undefined>
  readonly set: (key: string, compilation: KotlinCompilation) => Promise<void>
}
