import { DiagnosticSchema, type Diagnostic } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

import type { KotlinCompileMode } from './constants/kotlin-compile-mode.constant.ts'

export type KotlinSourceFile = { readonly path: string; readonly content: string }

export type KotlinCompileRequest = {
  readonly protocol: number
  readonly target: string
  readonly kotlinVersion: string
  readonly mode: KotlinCompileMode
  readonly files: ReadonlyArray<KotlinSourceFile>
}

export const KotlinArtifactSchema = Schema.Struct({
  kind: Schema.Literal('js'),
  code: Schema.String,
  sourceMap: Schema.String,
})

export type KotlinArtifact = typeof KotlinArtifactSchema.Type

export const CompileResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  artifact: Schema.optionalKey(KotlinArtifactSchema),
  diagnostics: Schema.Array(DiagnosticSchema),
})

export const CompileErrorBodySchema = Schema.Struct({ error: Schema.String })

export type KotlinCompilation =
  | {
      readonly _tag: 'Compiled'
      readonly artifact: KotlinArtifact
      readonly diagnostics: ReadonlyArray<Diagnostic>
    }
  | { readonly _tag: 'Failed'; readonly diagnostics: ReadonlyArray<Diagnostic> }
