export type { CompileCache } from './domain/compile-cache.port.ts'
export {
  kotlinCompileRequest,
  KotlinCompilationSchema,
  KotlinSourceFileSchema,
  type KotlinArtifact,
  type KotlinCompilation,
  type KotlinCompileRequest,
  type KotlinSourceFile,
} from './domain/compile-protocol.domain-model.ts'
export { KotlinCompileMode } from './domain/constants/kotlin-compile-mode.constant.ts'
export { KotlinProtocol } from './domain/constants/kotlin-protocol.constant.ts'
export type { KotlinExecutor } from './domain/kotlin-executor.port.ts'
export { compileCacheKey } from './compile-cache-key/compile-cache-key.ts'
export {
  makeKotlinCompilerClient,
  type KotlinCompilerClient,
  type KotlinCompilerClientOptions,
  type KotlinCompilerError,
} from './kotlin-compiler-client/kotlin-compiler-client.ts'
export {
  makeKotlinProject,
  type KotlinProject,
  type KotlinProjectRunOptions,
  type KotlinProjectTestOptions,
} from './kotlin-project/kotlin-project.ts'
export { DEFAULT_TEST_GLOBS, kotlinSources } from './kotlin-sources/kotlin-sources.ts'
export { makeMemoryCompileCache } from './memory-compile-cache/memory-compile-cache.ts'
export {
  makePrecompiledCompileCache,
  type PrecompiledCompileCacheOptions,
} from './precompiled-compile-cache/precompiled-compile-cache.ts'
export {
  makeIndexedDbCompileCache,
  type IndexedDbCompileCacheOptions,
} from './indexed-db-compile-cache/indexed-db-compile-cache.ts'
