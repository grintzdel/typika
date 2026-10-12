import * as Schema from 'effect/Schema'

import { CheckResult, HealthStatus } from './constants/health-status.constant.ts'

const CheckResultSchema = Schema.Literals(Object.values(CheckResult))

export const HealthChecksSchema = Schema.Struct({
  boot: CheckResultSchema,
  tests: CheckResultSchema,
  exercises: CheckResultSchema,
  deps: CheckResultSchema,
})

export type HealthChecks = typeof HealthChecksSchema.Type

export const TemplateHealthSchema = Schema.Struct({
  status: Schema.Literals(Object.values(HealthStatus)),
  checkedAt: Schema.String,
  brokenSince: Schema.NullOr(Schema.String),
  checks: HealthChecksSchema,
  runUrl: Schema.NullOr(Schema.String),
})

export type TemplateHealth = typeof TemplateHealthSchema.Type
