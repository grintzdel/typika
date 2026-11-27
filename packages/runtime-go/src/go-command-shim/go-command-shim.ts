import { GO_LIST_FIELDS } from '../domain/constants/go-list-field.constant.ts'
import { GoRelease } from '../domain/constants/go-release.constant.ts'
import type { GoCommandResult, GoListPackage, StdPackages } from '../domain/go-list.domain-model.ts'
import type { ProjectFiles } from '../plan-go-build/plan-go-build.ts'
import { listGoPackages } from './list-go-packages.ts'

export type GoCommandContext = {
  readonly goroot: string
  readonly root: string
  readonly env: Readonly<Record<string, string>>
  readonly std: StdPackages
  readonly files: () => ProjectFiles
  readonly readFile: (path: string) => string | undefined
}

export type GoCommand = (args: ReadonlyArray<string>, dir: string, env: ReadonlyArray<string>) => GoCommandResult

type ListFlags = {
  readonly json: ReadonlySet<string> | undefined
  readonly template: string | undefined
  readonly compiled: boolean
  readonly test: boolean
  readonly deps: boolean
  readonly overlay: string | undefined
  readonly patterns: ReadonlyArray<string>
}

const IGNORED_LIST_FLAGS = new Set(['e', 'export', 'find', 'pgo', 'mod', 'modfile', 'buildvcs', 'trimpath'])

const ok = (stdout: string, stderr = ''): GoCommandResult => ({ stdout, stderr, code: 0 })
const fail = (stderr: string): GoCommandResult => ({ stdout: '', stderr: `${stderr}\n`, code: 1 })

const decoder = new TextDecoder()

const releaseTags = () => {
  const minor = Number(GoRelease.LANGUAGE.replace(/^go1\./, ''))
  return `[${Array.from({ length: minor }, (_, index) => `go1.${index + 1}`).join(' ')}]\n`
}

const isTrue = (value: string | undefined) => value === undefined || value === 'true'

const parseListFlags = (args: ReadonlyArray<string>): ListFlags | string => {
  let json: ReadonlySet<string> | undefined
  let template: string | undefined
  let overlay: string | undefined
  let compiled = false
  let test = false
  let deps = false
  let index = 0
  while (index < args.length) {
    const arg = args[index] ?? ''
    if (arg === '--') {
      index += 1
      break
    }
    if (!arg.startsWith('-')) break
    const [name = '', value] = arg.replace(/^--?/, '').split(/=(.*)/s)
    index += 1
    if (name === 'json') json = new Set(value === undefined || value === '' ? GO_LIST_FIELDS : value.split(','))
    else if (name === 'f') {
      template = value ?? args[index]
      if (value === undefined) index += 1
    } else if (name === 'compiled') compiled = isTrue(value)
    else if (name === 'test') test = isTrue(value)
    else if (name === 'deps') deps = isTrue(value)
    else if (name === 'overlay') overlay = value
    else if (name === 'tags' && (value ?? '') === '') continue
    else if (!IGNORED_LIST_FLAGS.has(name)) return `go list: flag -${name} is not available in the browser`
  }
  return { json, template, compiled, test, deps, overlay, patterns: args.slice(index) }
}

const serialize = (pkg: GoListPackage, fields: ReadonlySet<string>, compiled: boolean) =>
  `${JSON.stringify(
    Object.fromEntries(
      GO_LIST_FIELDS.filter(
        (field) => pkg[field] !== undefined && fields.has(field) && (compiled || field !== 'CompiledGoFiles')
      ).map((field) => [field, pkg[field]])
    ),
    null,
    '\t'
  )}\n`

export const makeGoCommand = (context: GoCommandContext): GoCommand => {
  const { goroot, root } = context

  const projectFiles = (overlayPath: string | undefined) => {
    const files = new Map(
      [...context.files()].map(([path, content]) => [
        path,
        typeof content === 'string' ? content : decoder.decode(content),
      ])
    )
    const overlay: unknown = overlayPath === undefined ? undefined : JSON.parse(context.readFile(overlayPath) ?? '{}')
    const replace =
      typeof overlay === 'object' && overlay !== null && 'Replace' in overlay && typeof overlay.Replace === 'object'
        ? Object.entries(overlay.Replace ?? {})
        : []
    for (const [path, source] of replace) {
      if (!path.startsWith(`${root}/`) || typeof source !== 'string') continue
      const relative = path.slice(root.length + 1)
      const content = source === '' ? undefined : context.readFile(source)
      if (content === undefined) files.delete(relative)
      else files.set(relative, content)
    }
    return files
  }

  const goEnv = (args: ReadonlyArray<string>, env: ReadonlyArray<string>) => {
    const flags = args.filter((arg) => arg.startsWith('-'))
    const unsupported = flags.find((flag) => flag !== '-json')
    if (unsupported !== undefined) return fail(`go env ${unsupported} is not available in the browser`)
    const values: Record<string, string> = {
      CGO_ENABLED: '0',
      GO111MODULE: '',
      GOARCH: GoRelease.GOARCH,
      GOFLAGS: '',
      GOMOD: `${root}/go.mod`,
      GOOS: GoRelease.GOOS,
      GOPRIVATE: '',
      GOROOT: goroot,
      GOTOOLCHAIN: 'local',
      GOVERSION: GoRelease.VERSION,
      GOWORK: '',
      ...context.env,
      ...Object.fromEntries(
        env.map((entry) => {
          const [key = '', value = ''] = entry.split(/=(.*)/s)
          return [key, value] as const
        })
      ),
    }
    const keys = args.filter((arg) => !arg.startsWith('-'))
    const selected = (keys.length === 0 ? Object.keys(values) : keys).toSorted()
    return flags.includes('-json')
      ? ok(`${JSON.stringify(Object.fromEntries(selected.map((key) => [key, values[key] ?? ''])), null, '\t')}\n`)
      : ok(selected.map((key) => `${values[key] ?? ''}\n`).join(''))
  }

  const goList = (args: ReadonlyArray<string>, dir: string) => {
    const flags = parseListFlags(args)
    if (typeof flags === 'string') return fail(flags)
    if (flags.template === '{{context.ReleaseTags}}') return ok(releaseTags())
    if (flags.template === '{{context.GOARCH}} {{context.Compiler}}') return ok(`${GoRelease.GOARCH} gc\n`)
    if (flags.template !== undefined) return fail(`go list -f ${flags.template} is not available in the browser`)
    const result = listGoPackages({
      goroot,
      root,
      dir,
      files: projectFiles(flags.overlay),
      std: context.std,
      patterns: flags.patterns,
      test: flags.test,
      deps: flags.deps,
    })
    if (result._tag === 'Failed') return fail(result.message)
    const stderr = result.warnings.map((warning) => `${warning}\n`).join('')
    const { json } = flags
    return json === undefined
      ? ok(result.packages.map((pkg) => `${pkg.ImportPath}\n`).join(''), stderr)
      : ok(result.packages.map((pkg) => serialize(pkg, json, flags.compiled)).join(''), stderr)
  }

  return (args, dir, env) => {
    const [command, ...rest] = args
    if (command === 'env') return goEnv(rest, env)
    if (command === 'version') return ok(`go version ${GoRelease.VERSION} ${GoRelease.GOOS}/${GoRelease.GOARCH}\n`)
    if (command === 'list') return goList(rest, dir)
    if (command === 'mod' && rest[0] === 'tidy') return ok('')
    return fail(
      `go ${[command, command === 'mod' ? rest[0] : undefined].filter(Boolean).join(' ')} is not available in the browser`
    )
  }
}
