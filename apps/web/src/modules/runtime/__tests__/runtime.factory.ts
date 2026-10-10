import { parseManifest } from '@typika/manifest'
import {
  ProjectPathSchema,
  RuntimeCompileError,
  type FileContent,
  type ProjectPath,
  type ProjectSnapshot,
  type RuntimePort,
  type RuntimeSession,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'

export const projectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const MANIFEST_TOML = `schema = 1
name = "sample-ts"
title = "Sample"
summary = "A sample project."
license = "MIT-0"
authors = ["github:maoudin"]
role = "base"

[facets]
language = "typescript"
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "browser-js"
entry = "src/main.ts"
`

export const projectFixture = (
  files: Readonly<Record<string, FileContent>> = { 'src/main.ts': 'hello' },
  toml = MANIFEST_TOML
): ProjectSnapshot => ({
  files: new Map(
    Object.entries({ 'typika.toml': toml, ...files }).map(([path, content]) => [projectPath(path), content])
  ),
  manifest: Effect.runSync(parseManifest(toml)),
})

const textOf = (content: FileContent | undefined) =>
  typeof content === 'string' ? content : new TextDecoder().decode(content)

export const makeFakeRuntime = () => {
  const journal: Array<string> = []

  const makeSession = (snapshot: ProjectSnapshot): RuntimeSession => {
    const files = new Map<ProjectPath, FileContent>(snapshot.files)
    return {
      fs: {
        writeFile: (path, content) => Effect.sync(() => void files.set(path, content)),
        deleteFile: (path) => Effect.sync(() => void files.delete(path)),
        rename: (from, to) =>
          Effect.sync(() => {
            const content = files.get(from)
            files.delete(from)
            if (content !== undefined) files.set(to, content)
          }),
        sync: (next) =>
          Effect.sync(() => {
            files.clear()
            for (const [path, content] of next.files) files.set(path, content)
          }),
      },
      run: ({ command }) => {
        if (command === 'hang')
          return Stream.never.pipe(Stream.ensuring(Effect.sync(() => journal.push('run stopped'))))
        if (command === 'preempted') return Stream.failCause(Cause.interrupt())
        if (command === 'broken')
          return Stream.fail(
            new RuntimeCompileError({ diagnostics: [{ severity: 'error', message: 'Unexpected end of file' }] })
          )
        return Stream.make(
          { _tag: 'Stdout' as const, chunk: textOf(files.get(projectPath(command))) },
          { _tag: 'Exit' as const, code: 0 }
        )
      },
      test: () =>
        Stream.make(
          { _tag: 'RunStarted' as const, runId: 'run-1', startedAt: 0 },
          {
            _tag: 'TestPassed' as const,
            runId: 'run-1',
            testId: 't1',
            name: 'adds',
            file: 'tests/a.test.ts',
            durationMs: 1,
          },
          {
            _tag: 'RunFinished' as const,
            runId: 'run-1',
            status: 'passed' as const,
            passed: 1,
            failed: 0,
            skipped: 0,
            durationMs: 1,
          }
        ),
      preview: Effect.succeed(Option.none()),
    }
  }

  const port: RuntimePort = {
    kind: 'browser-js',
    load: Stream.empty,
    boot: (snapshot) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          journal.push('booted')
          return makeSession(snapshot)
        }),
        () => Effect.sync(() => journal.push('closed'))
      ),
  }

  return { port, journal }
}
