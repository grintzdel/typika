export { buildIndex, INDEX_MAX_GZIP_BYTES, type BuildIndexInput } from './build-index/build-index.ts'
export { checkRegistry, type RegisteredTemplate, type RegistryReport } from './check-registry/check-registry.ts'
export { RegistryCategory } from './domain/constants/registry-category.constant.ts'
export { RefUnresolvableError } from './domain/errors/ref-unresolvable.error.ts'
export { RegistryEntrySchema, type RegistryEntry } from './domain/registry-entry.domain-model.ts'
export {
  INDEX_SCHEMA_VERSION,
  IndexTemplateSchema,
  RegistryIndexSchema,
  type IndexTemplate,
  type RegistryIndex,
} from './domain/registry-index.domain-model.ts'
export { VocabularySchema, type Vocabulary } from './domain/vocabulary.domain-model.ts'
export { indexJsonSchema } from './index-json-schema/index-json-schema.ts'
export { readRegistry, VOCABULARY_FILE, type RegistrySource } from './read-registry/read-registry.ts'
export {
  keyOf,
  keyOfRef,
  makeGitResolver,
  type LocalCheckouts,
  type PinnedRef,
  type ResolveRef,
} from './resolve-ref/resolve-ref.ts'
