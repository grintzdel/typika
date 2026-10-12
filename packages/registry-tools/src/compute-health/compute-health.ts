import { CheckResult, HealthStatus } from '../domain/constants/health-status.constant.ts'
import type { HealthChecks, TemplateHealth } from '../domain/template-health.domain-model.ts'

export const DEPRECATED_AFTER_DAYS = 90

const DAY_MS = 86_400_000

export type HealthInput = {
  readonly checks: HealthChecks
  readonly previous: TemplateHealth | undefined
  readonly checkedAt: string
  readonly runUrl?: string | null
  readonly deprecated?: boolean
}

export const computeHealth = ({
  checks,
  previous,
  checkedAt,
  runUrl = null,
  deprecated = false,
}: HealthInput): TemplateHealth => {
  const results = Object.values(checks)
  const failed = results.includes(CheckResult.FAIL)
  const brokenSince = failed ? (previous?.brokenSince ?? checkedAt) : null
  const brokenForTooLong =
    brokenSince !== null && Date.parse(checkedAt) - Date.parse(brokenSince) >= DEPRECATED_AFTER_DAYS * DAY_MS
  const status =
    deprecated || brokenForTooLong
      ? HealthStatus.DEPRECATED
      : failed
        ? HealthStatus.BROKEN
        : results.includes(CheckResult.WARN)
          ? HealthStatus.DEGRADED
          : HealthStatus.HEALTHY
  return { status, checkedAt, brokenSince, checks, runUrl }
}
