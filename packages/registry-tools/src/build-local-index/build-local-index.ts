import { execFileSync } from 'node:child_process'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasErrors, loadTemplateRunners, type TemplateCheck } from '@typika/template-check'
import * as Effect from 'effect/Effect'

import { buildIndex } from '../build-index/build-index.ts'
import { checkRegistry, type RegisteredTemplate } from '../check-registry/check-registry.ts'
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
  readonly templates: ReadonlyArray<RegisteredTemplate>
  readonly deprecated: ReadonlySet<string>
}

export const git = (cwd: string, args: ReadonlyArray<string>) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

export type LocalIndexOptions = {
  readonly kotlinCompilerUrl?: string
  readonly only?: ReadonlySet<string>
}

export const buildLocalIndex = async (
  registryDir: string,
  checkouts: LocalCheckouts = MONOREPO_CHECKOUTS,
  options: LocalIndexOptions = {}
): Promise<LocalIndexBuild> => {
  const root = resolve(registryDir)
  const { only } = options
  const source = await readRegistry(root)
  const entries =
    only === undefined ? source.entries : source.entries.filter(({ file }) => only.has(basename(file, '.toml')))
  const report = await Effect.runPromise(
    checkRegistry({ ...source, entries }, makeGitResolver(checkouts), await loadTemplateRunners(options))
  )
  if (hasErrors(report.checks)) return { checks: report.checks, index: undefined, templates: [], deprecated: new Set() }
  const health = await readHealth(root)
  return {
    checks: report.checks,
    templates: report.templates,
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
