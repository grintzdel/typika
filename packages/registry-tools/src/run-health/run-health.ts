import type { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'

import { computeHealth } from '../compute-health/compute-health.ts'
import { CheckResult } from '../domain/constants/health-status.constant.ts'
import type { IndexTemplate } from '../domain/registry-index.domain-model.ts'
import type { HealthChecks, TemplateHealth } from '../domain/template-health.domain-model.ts'

export type ProbeResult = {
  readonly checks: Omit<HealthChecks, 'deps'>
  readonly notes: ReadonlyArray<string>
}

export type ProbeTemplate = (template: IndexTemplate) => Effect.Effect<ProbeResult>

export type HealthReport = {
  readonly name: string
  readonly health: TemplateHealth | undefined
  readonly notes: ReadonlyArray<string>
}

export type HealthRunInput = {
  readonly templates: ReadonlyArray<IndexTemplate>
  readonly probe: ProbeTemplate
  readonly previousOf: (name: string) => TemplateHealth | undefined
  readonly deprecatedOf: (name: string) => boolean
  readonly checkedAt: string
  readonly runUrl: string | null
  readonly runtimes: ReadonlySet<RuntimeKind>
}

const hasFailed = (result: ProbeResult) => Object.values(result.checks).includes(CheckResult.FAIL)

export const runHealth = ({
  templates,
  probe,
  previousOf,
  deprecatedOf,
  checkedAt,
  runUrl,
  runtimes,
}: HealthRunInput) =>
  Effect.forEach(templates, (template) =>
    Effect.gen(function* () {
      if (!runtimes.has(template.manifest.runtime.kind))
        return { name: template.name, health: undefined, notes: [] } satisfies HealthReport
      const first = yield* probe(template)
      const result = hasFailed(first) ? yield* probe(template) : first
      return {
        name: template.name,
        health: computeHealth({
          checks: { ...result.checks, deps: CheckResult.SKIP },
          previous: previousOf(template.name),
          checkedAt,
          runUrl,
          deprecated: deprecatedOf(template.name),
        }),
        notes: result.notes,
      } satisfies HealthReport
    })
  )
