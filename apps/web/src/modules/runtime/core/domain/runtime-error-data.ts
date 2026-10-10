import {
  KotlinCompilerRateLimitedError,
  KotlinCompilerUnavailableError,
  RuntimeAssetLoadError,
  RuntimeBootError,
  RuntimeCompileError,
  RuntimeFsError,
  RuntimeProcessError,
  RuntimeTimeoutError,
  RuntimeUnsupportedError,
} from '@typika/runtime-core'

import type { RuntimeErrorData } from './runtime-frame-protocol.domain-model.ts'

export type RuntimeError =
  | RuntimeUnsupportedError
  | RuntimeAssetLoadError
  | RuntimeBootError
  | RuntimeFsError
  | RuntimeCompileError
  | RuntimeProcessError
  | RuntimeTimeoutError
  | KotlinCompilerRateLimitedError
  | KotlinCompilerUnavailableError

export const describeCause = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message
  if (typeof cause === 'string') return cause
  if (typeof cause === 'object' && cause !== null && '_tag' in cause && typeof cause._tag === 'string')
    return cause._tag
  return String(cause)
}

export const toRuntimeErrorData = (error: RuntimeError): RuntimeErrorData => {
  switch (error._tag) {
    case 'RuntimeUnsupportedError':
      return { _tag: error._tag, kind: error.kind }
    case 'RuntimeAssetLoadError':
      return { _tag: error._tag, asset: error.asset, cause: describeCause(error.cause) }
    case 'RuntimeBootError':
      return { _tag: error._tag, kind: error.kind, cause: describeCause(error.cause) }
    case 'RuntimeFsError':
      return { _tag: error._tag, path: error.path, reason: error.reason }
    case 'RuntimeCompileError':
      return { _tag: error._tag, diagnostics: error.diagnostics }
    case 'RuntimeProcessError':
      return { _tag: error._tag, cause: describeCause(error.cause) }
    case 'RuntimeTimeoutError':
      return { _tag: error._tag, limitMs: error.limitMs }
    case 'KotlinCompilerRateLimitedError':
      return { _tag: error._tag, retryAfterSeconds: error.retryAfterSeconds }
    default:
      return { _tag: error._tag, cause: describeCause(error.cause) }
  }
}

export const fromRuntimeErrorData = (data: RuntimeErrorData): RuntimeError => {
  switch (data._tag) {
    case 'RuntimeUnsupportedError':
      return new RuntimeUnsupportedError({ kind: data.kind })
    case 'RuntimeAssetLoadError':
      return new RuntimeAssetLoadError({ asset: data.asset, cause: data.cause })
    case 'RuntimeBootError':
      return new RuntimeBootError({ kind: data.kind, cause: data.cause })
    case 'RuntimeFsError':
      return new RuntimeFsError({ path: data.path, reason: data.reason })
    case 'RuntimeCompileError':
      return new RuntimeCompileError({ diagnostics: data.diagnostics })
    case 'RuntimeProcessError':
      return new RuntimeProcessError({ cause: data.cause })
    case 'RuntimeTimeoutError':
      return new RuntimeTimeoutError({ limitMs: data.limitMs })
    case 'KotlinCompilerRateLimitedError':
      return new KotlinCompilerRateLimitedError({ retryAfterSeconds: data.retryAfterSeconds })
    default:
      return new KotlinCompilerUnavailableError({ cause: data.cause })
  }
}
