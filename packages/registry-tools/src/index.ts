export { buildIndex, INDEX_MAX_GZIP_BYTES, type BuildIndexInput } from './build-index/build-index.ts'
export { buildLocalIndex, type LocalIndexBuild, type LocalIndexOptions } from './build-local-index/build-local-index.ts'
export { formatReport } from '@typika/template-check'
export { computeHealth, DEPRECATED_AFTER_DAYS, type HealthInput } from './compute-health/compute-health.ts'
export { checkRegistry, type RegisteredTemplate, type RegistryReport } from './check-registry/check-registry.ts'
export { CheckResult, HealthStatus } from './domain/constants/health-status.constant.ts'
export { RegistryCategory } from './domain/constants/registry-category.constant.ts'
export { AppConfigUnreadableError } from './domain/errors/app-config-unreadable.error.ts'
export { RefUnresolvableError } from './domain/errors/ref-unresolvable.error.ts'
export { RegistryEntrySchema, type RegistryEntry } from './domain/registry-entry.domain-model.ts'
export {
  INDEX_SCHEMA_VERSION,
  IndexTemplateSchema,
  RegistryIndexSchema,
  type IndexTemplate,
  type RegistryIndex,
} from './domain/registry-index.domain-model.ts'
export {
  HealthChecksSchema,
  TemplateHealthSchema,
  type HealthChecks,
  type TemplateHealth,
} from './domain/template-health.domain-model.ts'
export { VocabularySchema, type Vocabulary } from './domain/vocabulary.domain-model.ts'
export { indexJsonSchema } from './index-json-schema/index-json-schema.ts'
export { readAppRuntimes } from './read-app-runtimes/read-app-runtimes.ts'
export { mirrorTemplates, type MirrorFile } from './mirror-templates/mirror-templates.ts'
export { HEALTH_DIR, readHealth, writeHealth } from './read-health/read-health.ts'
export { readRegistry, VOCABULARY_FILE, type RegistrySource } from './read-registry/read-registry.ts'
export {
  keyOf,
  keyOfRef,
  makeGitResolver,
  parseCheckout,
  type LocalCheckout,
  type LocalCheckouts,
  type PinnedRef,
  type ResolveRef,
} from './resolve-ref/resolve-ref.ts'
export {
  runHealth,
  type HealthReport,
  type HealthRunInput,
  type ProbeResult,
  type ProbeTemplate,
} from './run-health/run-health.ts'
