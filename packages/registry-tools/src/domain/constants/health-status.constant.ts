export const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  BROKEN: 'broken',
  DEPRECATED: 'deprecated',
} as const

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus]

export const CheckResult = {
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  SKIP: 'skip',
} as const

export type CheckResult = (typeof CheckResult)[keyof typeof CheckResult]
