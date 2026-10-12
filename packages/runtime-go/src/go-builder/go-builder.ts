import type { Diagnostic } from '@typika/runtime-core'

import { GoRelease } from '../domain/constants/go-release.constant.ts'
import type { GoToolchain } from '../domain/go-assets.domain-model.ts'
import { makeMemoryFs, type OutputStream } from '../memory-fs/memory-fs.ts'
import type { ProjectFiles } from '../plan-go-build/plan-go-build.ts'
import { runGoWasm } from '../run-go-wasm/run-go-wasm.ts'

export const PROJECT_ROOT = '/work'

export type BuildUnit = {
  readonly importPath: string
  readonly files: ReadonlyArray<string>
  readonly imports: ReadonlyArray<string>
}

export type BuildResult<A> =
  | { readonly _tag: 'Built'; readonly value: A }
  | { readonly _tag: 'BuildFailed'; readonly diagnostics: ReadonlyArray<Diagnostic> }

const STD_ROOT = '/goroot/pkg'
const CACHE_ROOT = '/cache'
const TMP_ROOT = '/tmp/build'
const TOOL_ENV = { GOOS: GoRelease.GOOS, GOARCH: GoRelease.GOARCH, GOROOT: '/goroot' }
const DIAGNOSTIC_LINE = /^(.+?):(\d+):(?:(\d+):)? (.*)$/

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const concat = (parts: ReadonlyArray<Uint8Array>) => {
  const joined = new Uint8Array(parts.reduce((size, part) => size + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.byteLength
  }
  return joined
}

const hexOf = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const projectPathOf = (path: string) =>
  path.startsWith(`${PROJECT_ROOT}/`) ? path.slice(PROJECT_ROOT.length + 1) : undefined

export const parseToolDiagnostics = (output: string): ReadonlyArray<Diagnostic> => {
  const diagnostics: Array<Diagnostic> = []
  for (const line of output.split('\n')) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const previous = diagnostics.at(-1)
    if (line.startsWith('\t') && previous !== undefined) {
      diagnostics[diagnostics.length - 1] = { ...previous, message: `${previous.message}\n${line.trim()}` }
      continue
    }
    const match = DIAGNOSTIC_LINE.exec(line)
    const file = match?.[1] === undefined ? undefined : projectPathOf(match[1])
    if (match === null || file === undefined) {
      diagnostics.push({ severity: 'error', message: line.replace(/^\/[^:]*:\d+:(\d+:)? /, '') })
      continue
    }
    diagnostics.push({
      severity: 'error',
      message: match[4] ?? '',
      location: { file, line: Number(match[2]), ...(match[3] === undefined ? {} : { column: Number(match[3]) }) },
    })
  }
  return diagnostics
}

export const makeGoBuilder = (toolchain: GoToolchain) => {
  const fs = makeMemoryFs()
  const stdArchives = new Map<string, string>()
  for (const [importPath, archive] of toolchain.std) {
    const path = `${STD_ROOT}/${importPath}.a`
    fs.writeFile(path, archive)
    stdArchives.set(importPath, path)
  }
  fs.mkdirAll(TMP_ROOT)
  fs.mkdirAll(CACHE_ROOT)
  let invocation = 0

  const importConfig = (archives: ReadonlyMap<string, string>) =>
    [...stdArchives, ...archives].map(([importPath, path]) => `packagefile ${importPath}=${path}`).join('\n')

  const runTool = async (module: WebAssembly.Module, args: ReadonlyArray<string>) => {
    invocation += 1
    const responseFile = `${TMP_ROOT}/args-${invocation}`
    fs.writeFile(responseFile, encoder.encode(args.join('\n')))
    const chunks: Array<Uint8Array> = []
    const { exitCode } = await runGoWasm(fs, {
      module,
      args: [`@${responseFile}`],
      env: TOOL_ENV,
      onOutput: (_stream, chunk) => chunks.push(chunk),
    })
    const output = decoder.decode(concat(chunks))
    return { exitCode, output }
  }

  const unitKey = async (unit: BuildUnit, language: string, dependencyKeys: ReadonlyArray<string>) => {
    const parts: Array<Uint8Array> = [
      encoder.encode([GoRelease.VERSION, language, unit.importPath, ...dependencyKeys].join('\n')),
    ]
    for (const file of unit.files) parts.push(encoder.encode(`\n${file}\n`), fs.readFile(file) ?? new Uint8Array())
    return hexOf(await crypto.subtle.digest('SHA-256', concat(parts)))
  }

  const compileUnits = async (
    units: ReadonlyMap<string, BuildUnit>,
    root: string,
    language: string
  ): Promise<BuildResult<ReadonlyMap<string, string>>> => {
    const keys = new Map<string, string>()
    const archives = new Map<string, string>()
    let failure: ReadonlyArray<Diagnostic> | undefined

    const visit = async (importPath: string): Promise<void> => {
      const unit = units.get(importPath)
      if (unit === undefined || keys.has(importPath) || failure !== undefined) return
      for (const dependency of unit.imports) await visit(dependency)
      if (failure !== undefined) return
      const dependencyKeys = unit.imports.flatMap((dependency) => {
        const key = keys.get(dependency)
        return key === undefined ? [] : [`${dependency}=${key}`]
      })
      const key = await unitKey(unit, language, dependencyKeys)
      const archive = `${CACHE_ROOT}/${key}.a`
      if (!fs.exists(archive)) {
        const config = `${TMP_ROOT}/importcfg-${key}`
        fs.writeFile(config, encoder.encode(importConfig(archives)))
        const { exitCode, output } = await runTool(toolchain.compile, [
          '-o',
          archive,
          '-p',
          importPath,
          `-lang=${language}`,
          '-complete',
          '-buildid=typika',
          `-goversion=${GoRelease.VERSION}`,
          '-c=1',
          '-nolocalimports',
          '-dwarf=false',
          `-trimpath=${PROJECT_ROOT}=>`,
          '-importcfg',
          config,
          '-pack',
          ...unit.files,
        ])
        if (exitCode !== 0) {
          fs.removeTree(archive)
          failure = parseToolDiagnostics(output)
          return
        }
      }
      keys.set(importPath, key)
      archives.set(importPath, archive)
    }

    await visit(root)
    return failure === undefined ? { _tag: 'Built', value: archives } : { _tag: 'BuildFailed', diagnostics: failure }
  }

  return {
    sync: (files: ProjectFiles) => {
      fs.removeTree(PROJECT_ROOT)
      fs.mkdirAll(PROJECT_ROOT)
      for (const [path, content] of files) {
        fs.writeFile(`${PROJECT_ROOT}/${path}`, typeof content === 'string' ? encoder.encode(content) : content)
      }
    },
    writeFile: (path: string, content: string) => fs.writeFile(path, encoder.encode(content)),
    build: async (
      units: ReadonlyMap<string, BuildUnit>,
      root: string,
      language: string
    ): Promise<BuildResult<WebAssembly.Module>> => {
      const compiled = await compileUnits(units, root, language)
      if (compiled._tag === 'BuildFailed') return compiled
      const rootArchive = compiled.value.get(root) ?? ''
      const config = `${TMP_ROOT}/importcfg-link`
      const binary = `${TMP_ROOT}/a.out.wasm`
      fs.writeFile(config, encoder.encode(importConfig(compiled.value)))
      const { exitCode, output } = await runTool(toolchain.link, [
        '-o',
        binary,
        '-importcfg',
        config,
        '-buildmode=exe',
        '-buildid=typika',
        '-w',
        rootArchive,
      ])
      if (exitCode !== 0) return { _tag: 'BuildFailed', diagnostics: parseToolDiagnostics(output) }
      return { _tag: 'Built', value: await WebAssembly.compile(fs.readFile(binary) ?? new Uint8Array()) }
    },
    exec: (
      module: WebAssembly.Module,
      args: ReadonlyArray<string>,
      dir: string,
      onOutput: (stream: OutputStream, chunk: Uint8Array) => void
    ) => runGoWasm(fs, { module, args, cwd: dir === '' ? PROJECT_ROOT : `${PROJECT_ROOT}/${dir}`, onOutput }),
  }
}

export type GoBuilder = ReturnType<typeof makeGoBuilder>
