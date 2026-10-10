import * as Schema from 'effect/Schema'

export const PublicConfigSchema = Schema.Struct({
  publicUrl: Schema.String,
  runtimeOrigin: Schema.String,
  packageUrlTemplate: Schema.optionalKey(Schema.String),
})

export type PublicConfig = typeof PublicConfigSchema.Type
