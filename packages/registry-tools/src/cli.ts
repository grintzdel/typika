import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { argv, cwd, env, exit } from 'node:process'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'

import { formatReport } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { chromium } from 'playwright'

import { INDEX_MAX_GZIP_BYTES } from './build-index/build-index.ts'
import { buildLocalIndex, MONOREPO_CHECKOUTS } from './build-local-index/build-local-index.ts'
import { RegistryIndexSchema } from './domain/registry-index.domain-model.ts'
import { indexJsonSchema } from './index-json-schema/index-json-schema.ts'
import { mirrorTemplates } from './mirror-templates/mirror-templates.ts'
import { makePlaywrightProbe } from './probe-template/probe-template.playwright.ts'
import { readAppRuntimes } from './read-app-runtimes/read-app-runtimes.ts'
import { readHealth, writeHealth } from './read-health/read-health.ts'
import { makeGitResolver, parseCheckout, type LocalCheckouts } from './resolve-ref/resolve-ref.ts'
import { runHealth } from './run-health/run-health.ts'

const { positionals, values } = parseArgs({
  args: argv.slice(2),
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    app: { type: 'string' },
    only: { type: 'string' },
    'run-url': { type: 'string' },
    checkout: { type: 'string', multiple: true },
  },
})
const [command, registryDir = 'registry'] = positionals
const checkouts: LocalCheckouts =
  values.checkout === undefined
    ? MONOREPO_CHECKOUTS
    : values.checkout.reduce<LocalCheckouts>((all, value) => ({ ...all, ...parseCheckout(value, cwd()) }), {})
const kotlinCompilerUrl = env['KOTLIN_COMPILER_URL'] || undefined
const indexOptions = kotlinCompilerUrl === undefined ? {} : { kotlinCompilerUrl }
const KOTLIN_NOT_RUN = 'KOTLIN_COMPILER_URL is not set: the exercises of Kotlin templates were not run.'

const writeJson = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

if (command === 'schema') {
  await writeJson(resolve(values.out ?? join(registryDir, 'schema', 'index.schema.json')), indexJsonSchema())
  exit(0)
}

if (command === 'mirror' && values.out !== undefined) {
  const index = Schema.decodeUnknownSync(RegistryIndexSchema)(JSON.parse(await readFile(resolve(registryDir), 'utf8')))
  const files = await Effect.runPromise(mirrorTemplates(index.templates, makeGitResolver(checkouts)))
  const out = resolve(values.out)
  await Promise.all(
    files.map(async (file) => {
      const path = join(out, file.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, file.content)
    })
  )
  console.log(`mirror: ${index.templates.length} templates, ${files.length} files in ${values.out}.`)
  exit(0)
}

if (command === 'health' && values.app !== undefined) {
  const root = resolve(registryDir)
  const { checks, index, deprecated } = await buildLocalIndex(root, checkouts, indexOptions)
  if (index === undefined) {
    console.log(formatReport(checks))
    exit(1)
  }
  if (kotlinCompilerUrl === undefined) console.log(KOTLIN_NOT_RUN)
  const runtimes = await Effect.runPromise(readAppRuntimes(values.app))
  const only = values.only === undefined ? undefined : new Set(values.only.split(','))
  const previous = await readHealth(root)
  const browser = await chromium.launch()
  const reports = await Effect.runPromise(
    runHealth({
      templates: index.templates.filter((template) => only?.has(template.name) ?? true),
      probe: makePlaywrightProbe(browser, values.app),
      previousOf: (name) => previous.get(name),
      deprecatedOf: (name) => deprecated.has(name),
      checkedAt: new Date().toISOString(),
      runUrl: values['run-url'] ?? null,
      runtimes,
    })
  ).finally(() => browser.close())
  await Promise.all(
    reports.flatMap(({ name, health }) => (health === undefined ? [] : [writeHealth(root, name, health)]))
  )
  for (const { name, health, notes } of reports) {
    console.log(`${name}: ${health?.status ?? 'skipped, the app does not run its runtime'}`)
    for (const note of notes) console.log(`  ${note}`)
  }
  const failing = reports.filter(({ health }) => health?.status === 'broken' || health?.status === 'deprecated')
  exit(failing.length > 0 ? 1 : 0)
}

if (command !== 'build') {
  console.error(
    'Usage: registry-tools build <registry> [--out <index.json>] | health <registry> --app <url> [--only <names>] [--run-url <url>] | mirror <index.json> --out <dir> | schema [--out <index.schema.json>]\nbuild, health and mirror read typika/templates in this monorepo, or in the clones given by --checkout owner/repo=<dir>.'
  )
  exit(2)
}

const { checks, index } = await buildLocalIndex(registryDir, checkouts, indexOptions)
console.log(formatReport(checks))
if (kotlinCompilerUrl === undefined) console.log(KOTLIN_NOT_RUN)
if (index === undefined) exit(1)

const json = JSON.stringify(index)
const compressed = gzipSync(json).byteLength
if (compressed > INDEX_MAX_GZIP_BYTES) {
  console.error(`index.json is ${compressed} bytes compressed, over the ${INDEX_MAX_GZIP_BYTES} bytes limit.`)
  exit(1)
}
if (values.out !== undefined) await writeJson(resolve(values.out), index)
console.log(`index.json: ${index.templates.length} templates, ${compressed} bytes compressed.`)
