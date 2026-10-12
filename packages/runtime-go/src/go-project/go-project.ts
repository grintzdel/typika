import { RunStatus, type Diagnostic, type TestEvent } from '@typika/runtime-core'

import { makeTest2JsonConverter } from '../convert-test2json/convert-test2json.ts'
import type { GoToolchain } from '../domain/go-assets.domain-model.ts'
import type { GoModule, GoPackage } from '../domain/go-package.domain-model.ts'
import { makeGoBuilder, PROJECT_ROOT, type BuildUnit } from '../go-builder/go-builder.ts'
import { makeTestMain, xtestImportPath } from '../make-test-main/make-test-main.ts'
import { makeTest2JsonMapper, type TestTally } from '../map-test2json-events/map-test2json-events.ts'
import type { OutputStream } from '../memory-fs/memory-fs.ts'
import { planGoBuild, type ProjectFiles } from '../plan-go-build/plan-go-build.ts'

export type GoTestOptions = {
  readonly runId: string
  readonly files?: ReadonlyArray<string>
  readonly namePattern?: string
}

export type GoRunOptions = {
  readonly entry: string
  readonly args?: ReadonlyArray<string>
  readonly onOutput: (stream: OutputStream, chunk: string) => void
}

export type GoRunResult =
  | { readonly _tag: 'Exited'; readonly exitCode: number }
  | { readonly _tag: 'BuildFailed'; readonly diagnostics: ReadonlyArray<Diagnostic> }

const TEST_MAIN_ROOT = '/tmp/testmain'

const inProject = (path: string) => `${PROJECT_ROOT}/${path}`

const libraryUnits = (module: GoModule) =>
  new Map<string, BuildUnit>(
    [...module.packages.values()]
      .filter((pkg) => pkg.goFiles.length > 0 && pkg.name !== 'main')
      .map((pkg) => [
        pkg.importPath,
        { importPath: pkg.importPath, files: pkg.goFiles.map(inProject), imports: pkg.imports },
      ])
  )

const testedFiles = (pkg: GoPackage) => [...pkg.testGoFiles, ...pkg.xtestGoFiles]

const isSelected = (pkg: GoPackage, files: ReadonlyArray<string> | undefined) =>
  testedFiles(pkg).length > 0 && (files === undefined || files.some((file) => testedFiles(pkg).includes(file)))

const dirOfFile = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))

export const makeGoProject = (toolchain: GoToolchain) => {
  const builder = makeGoBuilder(toolchain)
  const std = new Set(toolchain.std.keys())
  let files: ProjectFiles = new Map()

  const testUnits = (module: GoModule, pkg: GoPackage) => {
    const units = libraryUnits(module)
    units.set(pkg.importPath, {
      importPath: pkg.importPath,
      files: [...pkg.goFiles, ...pkg.testGoFiles].map(inProject),
      imports: [...new Set([...pkg.imports, ...pkg.testImports])],
    })
    const hasXtest = pkg.xtestGoFiles.length > 0
    if (hasXtest) {
      units.set(xtestImportPath(pkg), {
        importPath: xtestImportPath(pkg),
        files: pkg.xtestGoFiles.map(inProject),
        imports: pkg.xtestImports,
      })
    }
    const testMain = `${TEST_MAIN_ROOT}/${pkg.dir || '_root'}/_testmain.go`
    builder.writeFile(testMain, makeTestMain(pkg))
    units.set('main', {
      importPath: 'main',
      files: [testMain],
      imports: [pkg.importPath, ...(hasXtest ? [xtestImportPath(pkg)] : [])],
    })
    return units
  }

  const testPackage = async (
    module: GoModule,
    pkg: GoPackage,
    options: GoTestOptions,
    emit: (event: TestEvent) => void,
    tally: TestTally
  ): Promise<'tested' | 'crashed' | ReadonlyArray<Diagnostic>> => {
    const built = await builder.build(testUnits(module, pkg), 'main', module.language)
    if (built._tag === 'BuildFailed') return built.diagnostics
    const owners = new Map([...pkg.tests, ...pkg.xtests].map((test) => [test.name, test.file]))
    const fallbackFile = testedFiles(pkg)[0] ?? ''
    const mapper = makeTest2JsonMapper({
      runId: options.runId,
      dir: pkg.dir,
      fileOf: (test) => owners.get(test) ?? fallbackFile,
      emit,
      tally,
    })
    const converter = makeTest2JsonConverter(mapper.handle)
    const decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() }
    const failedBefore = tally.failed
    const startedAt = performance.now()
    const { exitCode } = await builder.exec(
      built.value,
      ['-test.v=test2json', ...(options.namePattern === undefined ? [] : [`-test.run=${options.namePattern}`])],
      pkg.dir,
      (stream, chunk) => converter.write(decoders[stream].decode(chunk, { stream: true }))
    )
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(3)
    converter.write(`${exitCode === 0 ? 'ok  ' : 'FAIL'}\t${pkg.importPath}\t${elapsed}s\n`)
    converter.exited(exitCode)
    converter.close()
    mapper.close()
    return exitCode !== 0 && tally.failed === failedBefore ? 'crashed' : 'tested'
  }

  return {
    sync: (next: ProjectFiles) => {
      files = next
      builder.sync(next)
    },
    test: async (options: GoTestOptions, emit: (event: TestEvent) => void): Promise<void> => {
      const startedAt = Date.now()
      const tally: TestTally = { passed: 0, failed: 0, skipped: 0 }
      emit({ _tag: 'RunStarted', runId: options.runId, startedAt })
      const finish = (status: RunStatus) =>
        emit({ _tag: 'RunFinished', runId: options.runId, status, ...tally, durationMs: Date.now() - startedAt })
      const failBuild = (diagnostics: ReadonlyArray<Diagnostic>) => {
        emit({ _tag: 'Diagnostics', runId: options.runId, diagnostics })
        finish(RunStatus.ERRORED)
      }

      const plan = planGoBuild(files, std)
      if (plan._tag === 'Invalid') return failBuild(plan.diagnostics)
      let crashed = false
      const targets = [...plan.module.packages.values()]
        .filter((pkg) => isSelected(pkg, options.files))
        .toSorted((a, b) => a.importPath.localeCompare(b.importPath))
      for (const pkg of targets) {
        const outcome = await testPackage(plan.module, pkg, options, emit, tally)
        if (typeof outcome !== 'string') return failBuild(outcome)
        crashed ||= outcome === 'crashed'
      }
      finish(crashed ? RunStatus.ERRORED : tally.failed > 0 ? RunStatus.FAILED : RunStatus.PASSED)
    },
    run: async ({ entry, args = [], onOutput }: GoRunOptions): Promise<GoRunResult> => {
      const plan = planGoBuild(files, std)
      if (plan._tag === 'Invalid') return { _tag: 'BuildFailed', diagnostics: plan.diagnostics }
      const dir = entry.endsWith('.go') ? dirOfFile(entry) : entry
      const pkg = [...plan.module.packages.values()].find((candidate) => candidate.dir === dir)
      if (pkg === undefined || pkg.name !== 'main' || pkg.goFiles.length === 0) {
        return {
          _tag: 'BuildFailed',
          diagnostics: [{ severity: 'error', message: `no main package in ${dir || '.'}` }],
        }
      }
      const units = libraryUnits(plan.module)
      units.set('main', { importPath: 'main', files: pkg.goFiles.map(inProject), imports: pkg.imports })
      const built = await builder.build(units, 'main', plan.module.language)
      if (built._tag === 'BuildFailed') return built
      const decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() }
      const { exitCode } = await builder.exec(built.value, args, pkg.dir, (stream, chunk) =>
        onOutput(stream, decoders[stream].decode(chunk, { stream: true }))
      )
      return { _tag: 'Exited', exitCode }
    },
  }
}

export type GoProject = ReturnType<typeof makeGoProject>
