import { ExerciseKind, Language, Level, Paradigm, RuntimeKind, UseCase } from '@typika/manifest'
import * as Schema from 'effect/Schema'

import { RegistryCategory } from './constants/registry-category.constant.ts'

export const INDEX_SCHEMA_VERSION = 1

const literals = <V extends string>(values: Readonly<Record<string, V>>) => Schema.Literals(Object.values(values))

export const IndexTopicSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  category: Schema.String,
  family: Schema.optionalKey(Schema.String),
})

export const IndexTemplateSchema = Schema.Struct({
  name: Schema.String,
  ref: Schema.String,
  category: literals(RegistryCategory),
  maintainers: Schema.Array(Schema.String),
  addedAt: Schema.String,
  updatedAt: Schema.String,
  manifest: Schema.Struct({
    title: Schema.String,
    summary: Schema.String,
    license: Schema.String,
    authors: Schema.Array(Schema.String),
    role: Schema.Literals(['template', 'base']),
    facets: Schema.Struct({
      language: literals(Language),
      framework: Schema.Array(Schema.String),
      library: Schema.Array(Schema.String),
      paradigm: Schema.Array(literals(Paradigm)),
      topic: Schema.Array(Schema.String),
      level: literals(Level),
      useCase: Schema.Array(literals(UseCase)),
    }),
    runtime: Schema.Struct({ kind: literals(RuntimeKind) }),
    base: Schema.NullOr(Schema.String),
    variants: Schema.Struct({
      typescript: Schema.optionalKey(Schema.String),
      javascript: Schema.optionalKey(Schema.String),
      go: Schema.optionalKey(Schema.String),
      kotlin: Schema.optionalKey(Schema.String),
    }),
    tour: Schema.Struct({ steps: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String })) }),
    exercises: Schema.Array(Schema.Struct({ name: Schema.String, kind: literals(ExerciseKind), title: Schema.String })),
  }),
  parent: Schema.NullOr(Schema.String),
  health: Schema.Null,
  search: Schema.Struct({ text: Schema.String }),
})

export type IndexTemplate = typeof IndexTemplateSchema.Type

export const RegistryIndexSchema = Schema.Struct({
  schema: Schema.Literal(INDEX_SCHEMA_VERSION),
  generatedAt: Schema.String,
  registryCommit: Schema.String,
  vocabulary: Schema.Struct({
    topics: Schema.Array(IndexTopicSchema),
    languages: Schema.Array(literals(Language)),
  }),
  templates: Schema.Array(IndexTemplateSchema),
})

export type RegistryIndex = typeof RegistryIndexSchema.Type
