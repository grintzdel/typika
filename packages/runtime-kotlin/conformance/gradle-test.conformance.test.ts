import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative } from 'node:path'

import { providedKotlinCompilerUrl } from '@typika/kotlin-compiler/provided'
import { exerciseStates, validateTemplate, type TemplateFiles } from '@typika/manifest'
import {
  checkTestEventSequence,
  makeTestId,
  type Diagnostic,
  type ProcessOutput,
  type TestEvent,
} from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { KotlinCompileMode } from '../src/domain/constants/kotlin-compile-mode.constant.ts'
import { makeKotlinCompilerClient } from '../src/kotlin-compiler-client/kotlin-compiler-client.ts'
import { makeKotlinProject } from '../src/kotlin-project/kotlin-project.ts'
import { findKotlinClasses, kotlinSources } from '../src/kotlin-sources/kotlin-sources.ts'
import { inProcessKotlinExecutor } from '../src/node/in-process-kotlin-executor.ts'

type Files = ReadonlyMap<string, string>

type Outcome = {
  readonly status: 'passed' | 'failed' | 'skipped'
  readonly message?: string
  readonly location?: string
}

const FIXTURES = join(import.meta.dirname, 'fixtures')
const TEMPLATES = join(import.meta.dirname, '../../../templates')
const BUILD_DIRS = new Set(['build', '.gradle', '.kotlin', 'gradle'])
const ASSERTION_TYPES = new Set(['org.opentest4j.AssertionFailedError', 'java.lang.AssertionError'])

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return BUILD_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name))
    return entry.name.startsWith('gradlew') ? [] : [join(dir, entry.name)]
  })

const readTree = (root: string): Map<string, string> =>
  new Map(walk(root).map((path) => [relative(root, path), readFileSync(path, 'utf8')]))

const textFiles = (files: TemplateFiles): Map<string, string> =>
  new Map(
    [...files].map(([path, content]) => [
      path,
      typeof content === 'string' ? content : new TextDecoder().decode(content),
    ])
  )

const inTempProject = <A>(files: Files, use: (dir: string) => A): A => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'typika-kotlin-conformance-')))
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

const gradle = (dir: string, task: string) =>
  spawnSync('gradle', [task, '--quiet', '--console=plain'], { cwd: dir, encoding: 'utf8' })

const decodeXml = (text: string) =>
  text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&#10;', '\n')
    .replaceAll('&amp;', '&')

const withPrefix = (prefix: string | undefined, text: string) => (prefix === undefined ? text : `${prefix}. ${text}`)

// kotlin-test-junit5 hands these assertions to JUnit 5, which words them differently from kotlin.test's own asserter.
const toKotlinTestMessage = (junit: string) => {
  const notNull = /^(?:(.*) ==> )?expected: not <null>$/s.exec(junit)
  if (notNull !== null) {
    return withPrefix(notNull[1] === 'actual value is null' ? undefined : notNull[1], 'Expected value to be not null.')
  }
  const isNull = /^actual value is not null ==> expected: <null> but was: <(.*)>$/s.exec(junit)
  if (isNull !== null) return `Expected value to be null, but was: <${isNull[1]}>.`
  const notEqual = /^(?:(.*) ==> )?expected: not equal but was: <(.*)>$/s.exec(junit)
  if (notEqual !== null) return withPrefix(notEqual[1], `Illegal value: <${notEqual[2]}>.`)
  const equal = /^(?:(.*) ==> )?expected: <(.*)> but was: <(.*)>$/s.exec(junit)
  if (equal !== null) return withPrefix(equal[1], `Expected <${equal[2]}>, actual <${equal[3]}>.`)
  return junit
}

const nativeMessage = (type: string, message: string) => {
  const text = message.startsWith(`${type}: `) ? message.slice(type.length + 2) : message === type ? '' : message
  if (ASSERTION_TYPES.has(type)) return toKotlinTestMessage(text)
  const simpleName = type.slice(type.lastIndexOf('.') + 1)
  return text === '' ? simpleName : `${simpleName}: ${text}`
}

const nativeLocation = (stack: string, className: string, file: string) => {
  const frame = new RegExp(
    String.raw`^\s*at ${className.replaceAll('.', String.raw`\.`)}\.[^(]*\(([^:)]+):(\d+)\)`,
    'm'
  ).exec(stack)
  if (frame === null) return undefined
  expect(frame[1]).toBe(basename(file))
  return `${file}:${frame[2]}`
}

const gradleTest = (files: Files): ReadonlyMap<string, Outcome> =>
  inTempProject(files, (dir) => {
    gradle(dir, 'test')
    const classes = findKotlinClasses(kotlinSources(files, KotlinCompileMode.TEST, ['src/test/**']))
    const results = join(dir, 'build/test-results/test')
    const outcomes = new Map<string, Outcome>()
    for (const report of existsSync(results) ? readdirSync(results).filter((name) => name.endsWith('.xml')) : []) {
      const xml = readFileSync(join(results, report), 'utf8')
      for (const testcase of xml.matchAll(
        /<testcase name="([^"]*)" classname="([^"]*)"[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g
      )) {
        const name = decodeXml(testcase[1] ?? '').replace(/\(\)$/, '')
        const className = decodeXml(testcase[2] ?? '')
        const body = testcase[3] ?? ''
        const file = classes.get(className) ?? ''
        const dot = className.lastIndexOf('.')
        const suites = dot === -1 ? [className] : [className.slice(0, dot), className.slice(dot + 1)]
        const failure = /<failure message="([^"]*)" type="([^"]*)">([\s\S]*?)<\/failure>/.exec(body)
        const location = failure === null ? undefined : nativeLocation(decodeXml(failure[3] ?? ''), className, file)
        outcomes.set(
          makeTestId(file, suites, name),
          failure !== null
            ? {
                status: 'failed',
                message: nativeMessage(failure[2] ?? '', decodeXml(failure[1] ?? '')),
                ...(location === undefined ? {} : { location }),
              }
            : { status: body.includes('<skipped') ? 'skipped' : 'passed' }
        )
      }
    }
    return outcomes
  })

const gradleDiagnostics = (files: Files): ReadonlyArray<Diagnostic> =>
  inTempProject(files, (dir) =>
    gradle(dir, 'test')
      .stderr.split('\n')
      .flatMap((line) => {
        const match = /^e: file:\/\/(.+?):(\d+):(\d+) (.*)$/.exec(line)
        if (match === null) return []
        return [
          {
            severity: 'error' as const,
            message: match[4] ?? '',
            location: { file: relative(dir, match[1] ?? ''), line: Number(match[2]), column: Number(match[3]) },
          },
        ]
      })
  )

const project = () =>
  makeKotlinProject(makeKotlinCompilerClient({ url: providedKotlinCompilerUrl() }), inProcessKotlinExecutor)

const typikaTest = async (files: Files) => {
  const events: Array<TestEvent> = []
  await Effect.runPromise(Effect.scoped(project().test(files, { runId: 'typika' }, (event) => events.push(event))))
  return events
}

const outcomesOf = (events: ReadonlyArray<TestEvent>): ReadonlyMap<string, Outcome> =>
  new Map(
    events.flatMap((event): ReadonlyArray<readonly [string, Outcome]> => {
      if (event._tag === 'TestPassed') return [[event.testId, { status: 'passed' }]]
      if (event._tag === 'TestSkipped') return [[event.testId, { status: 'skipped' }]]
      if (event._tag !== 'TestFailed') return []
      const { message, location } = event.failure
      return [
        [
          event.testId,
          {
            status: 'failed',
            message,
            ...(location === undefined ? {} : { location: `${location.file}:${location.line}` }),
          },
        ],
      ]
    })
  )

const sorted = (outcomes: ReadonlyMap<string, Outcome>) =>
  Object.fromEntries([...outcomes].toSorted(([a], [b]) => a.localeCompare(b)))

const expectSameRun = async (files: Files) => {
  const typika = await typikaTest(files)

  expect(checkTestEventSequence(typika)).toEqual([])
  expect(sorted(outcomesOf(typika))).toEqual(sorted(gradleTest(files)))
  return typika
}

describe('the Kotlin runtime against `gradle test`', () => {
  it('reports passed, failed and ignored tests like gradle test, with the same messages and lines', async () => {
    const events = await expectSameRun(readTree(join(FIXTURES, 'outcomes')))

    expect(events.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'failed', passed: 2, failed: 5, skipped: 2 })
  })

  it('words each assertion failure like kotlin.test on the JVM', async () => {
    await expectSameRun(readTree(join(FIXTURES, 'assertions')))
  })

  it('reports the compile errors gradle reports, at the same place', async () => {
    const files = readTree(join(FIXTURES, 'compile-error'))
    const typika = await typikaTest(files)

    expect(typika.find((event) => event._tag === 'Diagnostics')).toEqual({
      _tag: 'Diagnostics',
      runId: 'typika',
      diagnostics: gradleDiagnostics(files),
    })
    expect(typika.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'errored' })
  })

  it('prints what gradle run prints', async () => {
    const files = readTree(join(FIXTURES, 'outcomes'))
    const outputs: Array<ProcessOutput> = []

    await Effect.runPromise(Effect.scoped(project().run(files, {}, (output) => outputs.push(output))))

    const native = inTempProject(files, (dir) => gradle(dir, 'run'))
    expect(outputs.at(-1)).toEqual({ _tag: 'Exit', code: native.status })
    expect(outputs.flatMap((output) => (output._tag === 'Stdout' ? [output.chunk] : [])).join('')).toBe(native.stdout)
  })

  describe('on strategy-kotlin', () => {
    const template = textFiles(
      new Map([...readTree(join(TEMPLATES, 'strategy/kotlin'))].filter(([path]) => !path.startsWith('exercises/')))
    )
    const base = textFiles(readTree(join(TEMPLATES, 'strategy-base/kotlin')))

    it.each([
      ['the template', template],
      ['its base', base],
    ])('runs %s like gradle test', async (_state, files) => {
      await expectSameRun(files)
    })

    it('runs its main like gradle run', async () => {
      const outputs: Array<ProcessOutput> = []

      await Effect.runPromise(Effect.scoped(project().run(template, {}, (output) => outputs.push(output))))

      const native = inTempProject(template, (dir) => gradle(dir, 'run'))
      expect(outputs.flatMap((output) => (output._tag === 'Stdout' ? [output.chunk] : [])).join('')).toBe(native.stdout)
    })

    it('runs the starting state and the solution of each exercise like gradle test', async () => {
      const withExercises = readTree(join(TEMPLATES, 'strategy/kotlin'))
      const { manifest } = await Effect.runPromise(validateTemplate(withExercises))
      for (const exercise of manifest.exercises) {
        const states = await Effect.runPromise(exerciseStates({ template: withExercises, base, exercise }))
        await expectSameRun(textFiles(states.start))
        await expectSameRun(textFiles(states.solution))
      }
    })
  })
})
