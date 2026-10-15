import type { TestEvent } from '@typika/runtime-core'
import { beforeAll, describe, expect, it } from 'vitest'

import type { GoToolchain } from '../domain/go-assets.domain-model.ts'
import { loadGoToolchainFromDisk } from '../node/go-assets.ts'
import { makeGoProject } from './go-project.ts'

const files = new Map([
  ['go.mod', 'module example.com/hello\n\ngo 1.24\n'],
  [
    'cmd/hello/main.go',
    'package main\n\nimport (\n\t"fmt"\n\t"os"\n\n\t"example.com/hello/greet"\n)\n\nfunc main() {\n\tfmt.Println(greet.Hello(os.Args[1]))\n\tfmt.Fprintln(os.Stderr, "done")\n\tos.Exit(3)\n}\n',
  ],
  ['greet/greet.go', 'package greet\n\nfunc Hello(name string) string { return "Hello, " + name }\n'],
  [
    'greet/greet_test.go',
    'package greet\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {}\n\nfunc TestGoodbye(t *testing.T) { t.Fail() }\n',
  ],
  ['farewell/farewell_test.go', 'package farewell\n\nimport "testing"\n\nfunc TestFarewell(t *testing.T) {}\n'],
])

const testNames = (events: ReadonlyArray<TestEvent>) =>
  events.flatMap((event) =>
    event._tag === 'TestPassed' || event._tag === 'TestFailed' ? [`${event._tag} ${event.name}`] : []
  )

describe('makeGoProject', () => {
  let toolchain: GoToolchain

  beforeAll(async () => {
    toolchain = await loadGoToolchainFromDisk()
  })

  it('runs a main package with its arguments, and reports its output and exit code', async () => {
    const project = makeGoProject(toolchain)
    project.sync(files)
    const output: Array<string> = []

    const result = await project.run({
      entry: 'cmd/hello/main.go',
      args: ['Ada'],
      onOutput: (stream, chunk) => output.push(`${stream}:${chunk}`),
    })

    expect(result).toEqual({ _tag: 'Exited', exitCode: 3 })
    expect(output).toEqual(['stdout:Hello, Ada\n', 'stderr:done\n'])
  })

  it('leaves no timer behind when a program exits after a file read while a goroutine sleeps', async () => {
    const project = makeGoProject(toolchain)
    project.sync(
      new Map([
        ['go.mod', 'module example.com/sleeper\n\ngo 1.24\n'],
        [
          'main.go',
          'package main\n\nimport (\n\t"os"\n\t"time"\n)\n\nfunc main() {\n\tgo time.Sleep(200 * time.Millisecond)\n\tif _, err := os.ReadFile("go.mod"); err != nil {\n\t\tpanic(err)\n\t}\n}\n',
        ],
      ])
    )
    const uncaught: Array<unknown> = []
    const record = (error: unknown) => uncaught.push(error)
    process.on('uncaughtException', record)

    try {
      expect(await project.run({ entry: 'main.go', onOutput: () => undefined })).toEqual({
        _tag: 'Exited',
        exitCode: 0,
      })
      await new Promise((resolve) => setTimeout(resolve, 400))
    } finally {
      process.off('uncaughtException', record)
    }

    expect(uncaught).toEqual([])
  })

  it('refuses to run a package that is not main', async () => {
    const project = makeGoProject(toolchain)
    project.sync(files)

    expect(await project.run({ entry: 'greet', onOutput: () => undefined })).toEqual({
      _tag: 'BuildFailed',
      diagnostics: [{ severity: 'error', message: 'no main package in greet' }],
    })
  })

  it('tests every package that has tests, or only those of the given files', async () => {
    const project = makeGoProject(toolchain)
    project.sync(files)
    const all: Array<TestEvent> = []
    const selected: Array<TestEvent> = []

    await project.test({ runId: 'all' }, (event) => all.push(event))
    await project.test({ runId: 'selected', files: ['farewell/farewell_test.go'] }, (event) => selected.push(event))

    expect(testNames(all)).toEqual(['TestPassed TestFarewell', 'TestPassed TestHello', 'TestFailed TestGoodbye'])
    expect(all.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'failed', passed: 2, failed: 1 })
    expect(testNames(selected)).toEqual(['TestPassed TestFarewell'])
  })

  it('runs only the tests whose name contains the pattern', async () => {
    const project = makeGoProject(toolchain)
    project.sync(files)
    const events: Array<TestEvent> = []

    await project.test({ runId: 'run', files: ['greet/greet_test.go'], namePattern: 'Hello' }, (event) =>
      events.push(event)
    )

    expect(testNames(events)).toEqual(['TestPassed TestHello'])
  })

  it('sees the files synced since the last run', async () => {
    const project = makeGoProject(toolchain)
    project.sync(files)
    await project.test({ runId: 'before' }, () => undefined)
    project.sync(
      new Map([
        ...files,
        ['greet/greet_test.go', 'package greet\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {}\n'],
      ])
    )
    const events: Array<TestEvent> = []

    await project.test({ runId: 'after' }, (event) => events.push(event))

    expect(events.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'passed', passed: 2 })
  })

  it('reports a project that does not plan as an errored run with its diagnostics', async () => {
    const project = makeGoProject(toolchain)
    project.sync(new Map([['main.go', 'package main\n']]))
    const events: Array<TestEvent> = []

    await project.test({ runId: 'run' }, (event) => events.push(event))

    expect(events.map((event) => event._tag)).toEqual(['RunStarted', 'Diagnostics', 'RunFinished'])
    expect(events.at(-1)).toMatchObject({ status: 'errored' })
  })
})
