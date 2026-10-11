import { AUTHOR } from '@typika/manifest'
import * as Schema from 'effect/Schema'

import { RegistryCategory } from './constants/registry-category.constant.ts'

export const RegistryEntrySchema = Schema.Struct({
  ref: Schema.String,
  maintainers: Schema.NonEmptyArray(Schema.String.check(Schema.isPattern(AUTHOR, { expected: '"github:<login>"' }))),
  category: Schema.Literals(Object.values(RegistryCategory)),
  added: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/, { expected: 'a date such as 2026-10-08' })),
  parent: Schema.optionalKey(Schema.String),
})

export type RegistryEntry = typeof RegistryEntrySchema.Type
