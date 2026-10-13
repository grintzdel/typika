import { DiagnosticSchema } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

import type { KotlinCompileMode } from './constants/kotlin-compile-mode.constant.ts'

export const KotlinSourceFileSchema = Schema.Struct({ path: Schema.String, content: Schema.String })

export type KotlinSourceFile = typeof KotlinSourceFileSchema.Type

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

export const KotlinCompilationSchema = Schema.Union([
  Schema.TaggedStruct('Compiled', { artifact: KotlinArtifactSchema, diagnostics: Schema.Array(DiagnosticSchema) }),
  Schema.TaggedStruct('Failed', { diagnostics: Schema.Array(DiagnosticSchema) }),
])

export type KotlinCompilation = typeof KotlinCompilationSchema.Type
