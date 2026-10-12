import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { exerciseStates, validateTemplate, type TemplateFiles } from '@typika/manifest'
import { checkTestEventSequence, type Diagnostic, type TestEvent } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Test2JsonEvent } from '../src/convert-test2json/convert-test2json.ts'
import type { GoToolchain } from '../src/domain/go-assets.domain-model.ts'
import { makeGoProject } from '../src/go-project/go-project.ts'
import { makeTest2JsonMapper } from '../src/map-test2json-events/map-test2json-events.ts'
import { loadGoToolchainFromDisk } from '../src/node/go-assets.ts'
import { planGoBuild } from '../src/plan-go-build/plan-go-build.ts'

type NativeEvent = Test2JsonEvent & { readonly Package?: string; readonly ImportPath?: string }

const isNativeEvent = (value: unknown): value is NativeEvent =>
  typeof value === 'object' && value !== null && 'Action' in value && typeof value.Action === 'string'

const FIXTURES = join(import.meta.dirname, 'fixtures')
const TEMPLATES = join(import.meta.dirname, '../../../templates')
const SCHEDULING_LINE = /^\s*=== (PAUSE|CONT|NAME)/

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  )

const readTree = (root: string): Map<string, string> =>
  new Map(walk(root).map((path) => [relative(root, path), readFileSync(path, 'utf8')]))

const textFiles = (files: TemplateFiles) =>
  new Map(
    [...files].map(([path, content]) => [
      path,
      typeof content === 'string' ? content : new TextDecoder().decode(content),
    ])
  )

const inTempModule = <A>(files: ReadonlyMap<string, string>, use: (dir: string) => A): A => {
  const dir = mkdtempSync(join(tmpdir(), 'typika-go-conformance-'))
  try {
    for (const [path, content] of files) {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), content)
    }
    return use(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const goTestNatively = (files: ReadonlyMap<string, string>): ReadonlyArray<NativeEvent> =>
  inTempModule(files, (dir) => {
    const { stdout } = spawnSync('go', ['test', '-json', '-count=1', '-vet=off', './...'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, GOTOOLCHAIN: 'local', GOWORK: 'off', GOFLAGS: '' },
    })
    return stdout
      .split('\n')
      .filter((line) => line.startsWith('{'))
      .map((line): unknown => JSON.parse(line))
      .filter(isNativeEvent)
  })

const testEventsOf = (
  toolchain: GoToolchain,
  files: ReadonlyMap<string, string>,
  native: ReadonlyArray<NativeEvent>
) => {
  const plan = planGoBuild(files, new Set(toolchain.std.keys()))
  if (plan._tag === 'Invalid') throw new Error('The fixture does not plan.')
  const events: Array<TestEvent> = []
  const tally = { passed: 0, failed: 0, skipped: 0 }
  const packages = [...plan.module.packages.values()]
    .filter((pkg) => pkg.testGoFiles.length + pkg.xtestGoFiles.length > 0)
    .toSorted((a, b) => a.importPath.localeCompare(b.importPath))
  for (const pkg of packages) {
    const owners = new Map([...pkg.tests, ...pkg.xtests].map((test) => [test.name, test.file]))
    const mapper = makeTest2JsonMapper({
      runId: 'native',
      dir: pkg.dir,
      fileOf: (test) => owners.get(test) ?? '',
      emit: (event) => events.push(event),
      tally,
    })
    for (const event of native) if (event.Package === pkg.importPath) mapper.handle(event)
    mapper.close()
  }
  return events
}

const goTestInTypika = async (toolchain: GoToolchain, files: ReadonlyMap<string, string>) => {
  const project = makeGoProject(toolchain)
  project.sync(files)
  const events: Array<TestEvent> = []
  await project.test({ runId: 'typika' }, (event) => events.push(event))
  return events
}

const normalizeOutput = (chunk: string) =>
  chunk.replaceAll(/\(\d+\.\d+s\)/g, '(Xs)').replaceAll(/\t\d+\.\d+s\n$/g, '\tXs\n')

const results = (events: ReadonlyArray<TestEvent>, { firstLineOnly = false } = {}) =>
  events
    .flatMap((event) => {
      if (event._tag === 'TestPassed' || event._tag === 'TestSkipped')
        return [`${event._tag} ${event.file} ${event.testId}`]
      if (event._tag !== 'TestFailed') return []
      const message = firstLineOnly ? event.failure.message.split('\n')[0] : event.failure.message
      return [`TestFailed ${event.file} ${event.testId} ${JSON.stringify({ ...event.failure, message })}`]
    })
    .toSorted()

const suites = (events: ReadonlyArray<TestEvent>) =>
  events
    .flatMap((event) => (event._tag === 'SuiteStarted' ? [`${event.file} ${event.suiteId} ${event.name}`] : []))
    .toSorted()

const outputsByTest = (events: ReadonlyArray<TestEvent>) => {
  const outputs = new Map<string, string>()
  for (const event of events) {
    if (event._tag !== 'Output') continue
    const lines = normalizeOutput(event.chunk)
      .split(/(?<=\n)/)
      .filter((line) => !SCHEDULING_LINE.test(line))
    const key = event.testId ?? 'package'
    outputs.set(key, `${outputs.get(key) ?? ''}${lines.join('')}`)
  }
  return Object.fromEntries([...outputs].toSorted(([a], [b]) => a.localeCompare(b)))
}

const nativeDiagnostics = (native: ReadonlyArray<NativeEvent>): ReadonlyArray<Diagnostic> =>
  native
    .filter((event) => event.Action === 'build-output')
    .flatMap((event) => {
      const match = /^(?:\.\/)?(.+?\.go):(\d+):(\d+): (.*)\n$/.exec(event.Output ?? '')
      return match === null
        ? []
        : [
            {
              severity: 'error' as const,
              message: match[4] ?? '',
              location: { file: match[1] ?? '', line: Number(match[2]), column: Number(match[3]) },
            },
          ]
    })

describe('the Go runtime against `go test`', () => {
  let toolchain: GoToolchain

  beforeAll(async () => {
    toolchain = await loadGoToolchainFromDisk()
  })

  const expectSameRun = async (files: ReadonlyMap<string, string>, options: { firstLineOnly?: boolean } = {}) => {
    const native = testEventsOf(toolchain, files, goTestNatively(files))
    const typika = await goTestInTypika(toolchain, files)

    expect(checkTestEventSequence(typika)).toEqual([])
    expect(results(typika, options)).toEqual(results(native, options))
    expect(suites(typika)).toEqual(suites(native))
    if (options.firstLineOnly !== true) expect(outputsByTest(typika)).toEqual(outputsByTest(native))
    return typika
  }

  it.each(['subtests', 'external-tests', 'goroutines'])('runs the %s fixture like go test', async (fixture) => {
    await expectSameRun(readTree(join(FIXTURES, fixture)))
  })

  it('fails a test that panics like go test, and reports the run as failed', async () => {
    const events = await expectSameRun(readTree(join(FIXTURES, 'panic')), { firstLineOnly: true })

    expect(events.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'failed', passed: 1, failed: 1 })
  })

  it('reports a TestMain that exits before the tests as an errored run', async () => {
    const events = await expectSameRun(readTree(join(FIXTURES, 'test-main')))

    expect(events.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'errored', passed: 0, failed: 0 })
  })

  it('reports the compile errors go test reports, at the same place', async () => {
    const files = readTree(join(FIXTURES, 'compile-error'))
    const typika = await goTestInTypika(toolchain, files)

    expect(typika.find((event) => event._tag === 'Diagnostics')).toEqual({
      _tag: 'Diagnostics',
      runId: 'typika',
      diagnostics: nativeDiagnostics(goTestNatively(files)),
    })
    expect(typika.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'errored' })
  })

  describe('on strategy-go', () => {
    const template = textFiles(readTree(join(TEMPLATES, 'strategy/go')))
    const base = textFiles(readTree(join(TEMPLATES, 'strategy-base/go')))

    it.each([
      ['the template', template],
      ['its base', base],
    ])('runs %s like go test', async (_state, files) => {
      await expectSameRun(files)
    })

    it('runs its main package like go run', async () => {
      const native = inTempModule(template, (dir) =>
        spawnSync('go', ['run', './cmd/shop'], { cwd: dir, encoding: 'utf8' })
      )
      const project = makeGoProject(toolchain)
      project.sync(template)
      let stdout = ''

      const result = await project.run({ entry: 'cmd/shop/main.go', onOutput: (_stream, chunk) => (stdout += chunk) })

      expect(result).toEqual({ _tag: 'Exited', exitCode: native.status })
      expect(stdout).toBe(native.stdout)
    })

    it('runs the starting state and the solution of each exercise like go test', async () => {
      const { manifest } = await Effect.runPromise(validateTemplate(template))
      for (const exercise of manifest.exercises) {
        const states = await Effect.runPromise(exerciseStates({ template, base, exercise }))
        await expectSameRun(textFiles(states.start))
        await expectSameRun(textFiles(states.solution))
      }
    })
  })
})
