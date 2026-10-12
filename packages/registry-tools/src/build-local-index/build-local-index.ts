import { execFileSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'

import { hasErrors, runTestsInProcess, type TemplateCheck } from '@typika/template-check'
import * as Effect from 'effect/Effect'

import { buildIndex } from '../build-index/build-index.ts'
import { checkRegistry } from '../check-registry/check-registry.ts'
import type { RegistryIndex } from '../domain/registry-index.domain-model.ts'
import { readRegistry } from '../read-registry/read-registry.ts'
import { makeGitResolver } from '../resolve-ref/resolve-ref.ts'

export const LOCAL_CHECKOUTS = { 'typika/templates': 'templates' }

export type LocalIndexBuild = {
  readonly checks: ReadonlyArray<TemplateCheck>
  readonly index: RegistryIndex | undefined
}

export const git = (cwd: string, args: ReadonlyArray<string>) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

export const buildLocalIndex = async (registryDir: string): Promise<LocalIndexBuild> => {
  const root = resolve(registryDir)
  const repoRoot = git(root, ['rev-parse', '--show-toplevel'])
  const report = await Effect.runPromise(
    checkRegistry(await readRegistry(root), makeGitResolver(repoRoot, LOCAL_CHECKOUTS), runTestsInProcess)
  )
  if (hasErrors(report.checks)) return { checks: report.checks, index: undefined }
  return {
    checks: report.checks,
    index: buildIndex({
      templates: report.templates,
      vocabulary: report.vocabulary,
      generatedAt: new Date().toISOString(),
      registryCommit: git(root, ['rev-parse', '--short=12', 'HEAD']),
      updatedAtOf: (file) =>
        git(root, ['log', '-1', '--format=%cs', '--', relative(root, join(root, file))]) || undefined,
    }),
  }
}
