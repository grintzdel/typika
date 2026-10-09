import type { Diagnostic, FileContent } from '@typika/runtime-core'
import type * as esbuild from 'esbuild-wasm'

import type { BundleRequest, BundleResult } from '../domain/worker-protocol.domain-model.ts'
import { resolveImport } from '../resolve-import/resolve-import.ts'
import { vitestShimSource } from '../vitest-shim/vitest-shim.ts'

type Esbuild = Pick<typeof esbuild, 'build'>

const VFS = 'vfs'
const RUNNER = 'typika-runner'

const LOADERS: Readonly<Record<string, esbuild.Loader>> = {
  '.ts': 'ts',
  '.mts': 'ts',
  '.cts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx',
  '.json': 'json',
}

const loaderOf = (path: string): esbuild.Loader => LOADERS[/\.[^./]+$/.exec(path)?.[0] ?? ''] ?? 'text'

const textOf = (content: FileContent) => (typeof content === 'string' ? content : new TextDecoder().decode(content))

const isRecordOfStrings = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && Object.values(value).every((version) => typeof version === 'string')

const readDependencies = (
  files: ReadonlyMap<string, FileContent>
): { readonly dependencies: Record<string, string> } | { readonly error: Diagnostic } => {
  const content = files.get('package.json')
  if (content === undefined) return { dependencies: {} }
  try {
    const parsed: unknown = JSON.parse(textOf(content))
    if (typeof parsed !== 'object' || parsed === null) return { dependencies: {} }
    const { dependencies, devDependencies } = parsed as { dependencies?: unknown; devDependencies?: unknown }
    return {
      dependencies: {
        ...(isRecordOfStrings(devDependencies) ? devDependencies : {}),
        ...(isRecordOfStrings(dependencies) ? dependencies : {}),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      error: {
        severity: 'error',
        message: `Invalid package.json: ${message}`,
        location: { file: 'package.json', line: 1 },
      },
    }
  }
}

const vfsPlugin = (
  files: ReadonlyMap<string, FileContent>,
  dependencies: Readonly<Record<string, string>>,
  packageUrlTemplate: string
): esbuild.Plugin => ({
  name: 'typika-vfs',
  setup: (build) => {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point') return { path: args.path, namespace: VFS }
      const resolution = resolveImport({
        specifier: args.path,
        importer: args.importer,
        exists: (path) => files.has(path),
        dependencies,
        packageUrlTemplate,
      })
      if (resolution._tag === 'File') return { path: resolution.path, namespace: VFS }
      if (resolution._tag === 'Package') return { path: resolution.url, external: true }
      if (resolution._tag === 'Runner') return { path: 'vitest', namespace: RUNNER }
      return { errors: [{ text: resolution.message }] }
    })
    build.onLoad({ filter: /.*/, namespace: VFS }, (args) => {
      const content = files.get(args.path)
      if (content === undefined) return { errors: [{ text: `Cannot find module "${args.path}"` }] }
      return { contents: content, loader: loaderOf(args.path) }
    })
    build.onLoad({ filter: /.*/, namespace: RUNNER }, () => ({ contents: vitestShimSource, loader: 'js' }))
  },
})

const diagnosticOf = (message: esbuild.Message): Diagnostic => {
  const { location } = message
  if (location === null) return { severity: 'error', message: message.text }
  return {
    severity: 'error',
    message: message.text,
    location: { file: location.file.replace(/^vfs:/, ''), line: location.line, column: location.column + 1 },
  }
}

const isBuildFailure = (error: unknown): error is esbuild.BuildFailure =>
  error instanceof Error && Array.isArray((error as Partial<esbuild.BuildFailure>).errors)

const entriesOf = (request: BundleRequest): ReadonlyArray<string> =>
  request._tag === 'Run' ? [request.entry] : request.files

export const bundle = async (
  build: Esbuild,
  files: ReadonlyMap<string, FileContent>,
  request: BundleRequest,
  packageUrlTemplate: string
): Promise<BundleResult> => {
  const read = readDependencies(files)
  if ('error' in read) return { _tag: 'Failed', diagnostics: [read.error] }

  const entries = entriesOf(request)
  const tsconfig = files.get('tsconfig.json')
  try {
    const result = await build.build({
      entryPoints: entries.map((path, index) => ({ in: path, out: `entry-${index}` })),
      outdir: 'out',
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      logLevel: 'silent',
      ...(tsconfig === undefined ? {} : { tsconfigRaw: textOf(tsconfig) }),
      plugins: [vfsPlugin(files, read.dependencies, packageUrlTemplate)],
    })
    const modules = entries.map((path, index) => {
      const output = result.outputFiles.find((file) => file.path.endsWith(`/entry-${index}.js`))
      return { path, code: output?.text ?? '' }
    })
    return { _tag: 'Bundled', modules }
  } catch (error) {
    if (!isBuildFailure(error)) throw error
    return { _tag: 'Failed', diagnostics: error.errors.map(diagnosticOf) }
  }
}
