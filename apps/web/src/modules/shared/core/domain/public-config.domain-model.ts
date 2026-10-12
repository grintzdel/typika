import * as Schema from 'effect/Schema'

export const PublicConfigSchema = Schema.Struct({
  publicUrl: Schema.String,
  runtimeOrigin: Schema.String,
  packageUrlTemplate: Schema.optionalKey(Schema.String),
  registryIndexUrl: Schema.String,
  templateFileUrlTemplate: Schema.String,
  templateListingUrlTemplate: Schema.String,
})

export type PublicConfig = typeof PublicConfigSchema.Type
