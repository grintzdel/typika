import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { argv, exit } from 'node:process'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'

import { formatReport, hasErrors, runTestsInProcess } from '@typika/template-check'
import * as Effect from 'effect/Effect'

import { buildIndex, INDEX_MAX_GZIP_BYTES } from './build-index/build-index.ts'
import { checkRegistry } from './check-registry/check-registry.ts'
import { indexJsonSchema } from './index-json-schema/index-json-schema.ts'
import { readRegistry } from './read-registry/read-registry.ts'
import { makeGitResolver } from './resolve-ref/resolve-ref.ts'

const LOCAL_CHECKOUTS = { 'typika/templates': 'templates' }

const { positionals, values } = parseArgs({
  args: argv.slice(2),
  allowPositionals: true,
  options: { out: { type: 'string' } },
})
const [command, registryDir = 'registry'] = positionals

const git = (cwd: string, args: ReadonlyArray<string>) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

const writeJson = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

if (command === 'schema') {
  await writeJson(resolve(values.out ?? join(registryDir, 'schema', 'index.schema.json')), indexJsonSchema())
  exit(0)
}

if (command !== 'build') {
  console.error('Usage: registry-tools build <registry> [--out <index.json>] | schema [--out <index.schema.json>]')
  exit(2)
}

const root = resolve(registryDir)
const repoRoot = git(root, ['rev-parse', '--show-toplevel'])
const report = await Effect.runPromise(
  checkRegistry(await readRegistry(root), makeGitResolver(repoRoot, LOCAL_CHECKOUTS), runTestsInProcess)
)
console.log(formatReport(report.checks))
if (hasErrors(report.checks)) exit(1)

const index = buildIndex({
  templates: report.templates,
  vocabulary: report.vocabulary,
  generatedAt: new Date().toISOString(),
  registryCommit: git(root, ['rev-parse', '--short=12', 'HEAD']),
  updatedAtOf: (file) => git(root, ['log', '-1', '--format=%cs', '--', relative(root, join(root, file))]) || undefined,
})
const json = JSON.stringify(index)
const compressed = gzipSync(json).byteLength
if (compressed > INDEX_MAX_GZIP_BYTES) {
  console.error(`index.json is ${compressed} bytes compressed, over the ${INDEX_MAX_GZIP_BYTES} bytes limit.`)
  exit(1)
}
if (values.out !== undefined) await writeJson(resolve(values.out), index)
console.log(`index.json: ${index.templates.length} templates, ${compressed} bytes compressed.`)
