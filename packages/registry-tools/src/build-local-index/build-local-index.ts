import { execFileSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasErrors, inProcessRunners, type TemplateCheck } from '@typika/template-check'
import * as Effect from 'effect/Effect'

import { buildIndex } from '../build-index/build-index.ts'
import { checkRegistry } from '../check-registry/check-registry.ts'
import type { RegistryIndex } from '../domain/registry-index.domain-model.ts'
import { readHealth } from '../read-health/read-health.ts'
import { readRegistry } from '../read-registry/read-registry.ts'
import { makeGitResolver, type LocalCheckouts } from '../resolve-ref/resolve-ref.ts'

export const MONOREPO_CHECKOUTS: LocalCheckouts = {
  'typika/templates': { repo: fileURLToPath(new URL('../../../..', import.meta.url)), prefix: 'templates' },
}

export type LocalIndexBuild = {
  readonly checks: ReadonlyArray<TemplateCheck>
  readonly index: RegistryIndex | undefined
  readonly deprecated: ReadonlySet<string>
}

export const git = (cwd: string, args: ReadonlyArray<string>) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

export const buildLocalIndex = async (
  registryDir: string,
  checkouts: LocalCheckouts = MONOREPO_CHECKOUTS
): Promise<LocalIndexBuild> => {
  const root = resolve(registryDir)
  const report = await Effect.runPromise(
    checkRegistry(await readRegistry(root), makeGitResolver(checkouts), inProcessRunners)
  )
  if (hasErrors(report.checks)) return { checks: report.checks, index: undefined, deprecated: new Set() }
  const health = await readHealth(root)
  return {
    checks: report.checks,
    deprecated: new Set(
      report.templates
        .filter((template) => template.entry.deprecated === true)
        .map((template) => template.manifest.name)
    ),
    index: buildIndex({
      templates: report.templates,
      vocabulary: report.vocabulary,
      generatedAt: new Date().toISOString(),
      registryCommit: git(root, ['rev-parse', '--short=12', 'HEAD']),
      updatedAtOf: (file) =>
        git(root, ['log', '-1', '--format=%cs', '--', relative(root, join(root, file))]) || undefined,
      healthOf: (name) => health.get(name),
    }),
  }
}
