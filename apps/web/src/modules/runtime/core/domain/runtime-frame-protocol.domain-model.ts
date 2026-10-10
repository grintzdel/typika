import { RuntimeKind } from '@typika/manifest'
import { DiagnosticSchema, ProjectPathSchema } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

const Id = Schema.Int
const FileContentSchema = Schema.Union([Schema.String, Schema.Uint8Array])
const FilesSchema = Schema.Array(Schema.Tuple([ProjectPathSchema, FileContentSchema]))
const RuntimeKindSchema = Schema.Literals(Object.values(RuntimeKind))

export const FrameRequestSchema = Schema.Union([
  Schema.TaggedStruct('Boot', { id: Id, files: FilesSchema }),
  Schema.TaggedStruct('WriteFile', { id: Id, path: ProjectPathSchema, content: FileContentSchema }),
  Schema.TaggedStruct('DeleteFile', { id: Id, path: ProjectPathSchema }),
  Schema.TaggedStruct('Rename', { id: Id, from: ProjectPathSchema, to: ProjectPathSchema }),
  Schema.TaggedStruct('Sync', { id: Id, files: FilesSchema }),
  Schema.TaggedStruct('Run', { id: Id, command: Schema.String, args: Schema.Array(Schema.String) }),
  Schema.TaggedStruct('Test', {
    id: Id,
    files: Schema.optionalKey(Schema.Array(ProjectPathSchema)),
    namePattern: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct('Interrupt', { id: Id, target: Id }),
  Schema.TaggedStruct('Shutdown', { id: Id }),
])

export type FrameRequest = typeof FrameRequestSchema.Type

export const RuntimeErrorDataSchema = Schema.Union([
  Schema.TaggedStruct('RuntimeUnsupportedError', { kind: RuntimeKindSchema }),
  Schema.TaggedStruct('RuntimeAssetLoadError', { asset: Schema.String, cause: Schema.String }),
  Schema.TaggedStruct('RuntimeBootError', { kind: RuntimeKindSchema, cause: Schema.String }),
  Schema.TaggedStruct('RuntimeFsError', { path: Schema.String, reason: Schema.String }),
  Schema.TaggedStruct('RuntimeCompileError', { diagnostics: Schema.Array(DiagnosticSchema) }),
  Schema.TaggedStruct('RuntimeProcessError', { cause: Schema.String }),
  Schema.TaggedStruct('RuntimeTimeoutError', { limitMs: Schema.Number }),
  Schema.TaggedStruct('KotlinCompilerRateLimitedError', { retryAfterSeconds: Schema.Number }),
  Schema.TaggedStruct('KotlinCompilerUnavailableError', { cause: Schema.String }),
])

export type RuntimeErrorData = typeof RuntimeErrorDataSchema.Type

export const FrameResponseSchema = Schema.Union([
  Schema.TaggedStruct('Succeeded', { id: Id }),
  Schema.TaggedStruct('Emitted', { id: Id, item: Schema.Unknown }),
  Schema.TaggedStruct('Ended', { id: Id }),
  Schema.TaggedStruct('Interrupted', { id: Id }),
  Schema.TaggedStruct('Failed', { id: Id, error: RuntimeErrorDataSchema }),
])

export type FrameResponse = typeof FrameResponseSchema.Type

export const FrameHandshakeSchema = Schema.Union([
  Schema.TaggedStruct('RuntimeFrameReady', {}),
  Schema.TaggedStruct('Connect', {}),
])

export type FrameHandshake = typeof FrameHandshakeSchema.Type
