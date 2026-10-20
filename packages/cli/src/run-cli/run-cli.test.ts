import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as Schema from 'effect/Schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { serveLocalRegistry, type LocalRegistry } from '../__tests__/serve-local-registry.ts'
import { runCli } from './run-cli.ts'

const MONOREPO = fileURLToPath(new URL('../../../..', import.meta.url))
const STRATEGY = new Set([
  'strategy-ts',
  'strategy-go',
  'strategy-kotlin',
  'strategy-base-ts',
  'strategy-base-go',
  'strategy-base-kotlin',
])

const CreatedSchema = Schema.Struct({ ref: Schema.String, next: Schema.Array(Schema.String) })

let registry: LocalRegistry
let work: string

beforeAll(async () => {
  registry = await serveLocalRegistry(STRATEGY)
  work = await mkdtemp(join(tmpdir(), 'typika-cli-'))
}, 120_000)

afterAll(async () => {
  await registry.close()
  await rm(work, { recursive: true, force: true })
})

const cli = async (args: ReadonlyArray<string>) => {
  const stdout: Array<string> = []
  const stderr: Array<string> = []
  const code = await runCli([...args, '--registry', registry.indexUrl, '--archive-url', registry.archiveUrl], {
    cwd: work,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  })
  return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') }
}

const filesIn = async (dir: string) =>
  (await readdir(dir, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .toSorted()

const trackedAt = (ref: string, dir: string) =>
  execFileSync('git', ['-C', MONOREPO, 'ls-tree', '-r', '--name-only', ref, '--', `templates/${dir}/`], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((path) => path !== '')
    .map((path) => path.slice(`templates/${dir}/`.length))

const PINNED = /^github:typika\/templates\/([^@]+)@([0-9a-f]+)$/

const codeFilesOf = (ref: string) => {
  const [, dir = '', sha = ''] = PINNED.exec(ref) ?? []
  return trackedAt(sha, dir)
    .filter((path) => path !== 'typika.toml' && !path.startsWith('tour/') && !path.startsWith('exercises/'))
    .toSorted()
}

describe('typika create', () => {
  it.each([
    ['strategy-ts', [], ['npm install', 'npm test']],
    ['strategy-ts', ['--variant', 'go'], ['go test ./...']],
    ['strategy-ts', ['--variant', 'kotlin'], ['gradle test']],
  ] as const)('creates %s %j from its pinned archive, without the Typika files', async (template, options, steps) => {
    const dir = `created-${template}-${options.join('-') || 'default'}`

    const { code, stdout } = await cli(['create', template, dir, ...options, '--json'])

    const result = Schema.decodeUnknownSync(CreatedSchema)(JSON.parse(stdout))
    expect(code).toBe(0)
    expect(result.next).toEqual([`cd ${dir}`, ...steps])
    expect(await filesIn(join(work, dir))).toEqual(codeFilesOf(result.ref))
  })

  it('creates an exercise in its start state with its statement', async () => {
    const { code } = await cli(['create', 'strategy-ts', 'express', '--exercise', 'implement-express'])

    expect(code).toBe(0)
    expect(await readFile(join(work, 'express', 'EXERCISE.md'), 'utf8')).toBe(
      await readFile(join(MONOREPO, 'templates/strategy/ts/exercises/implement-express/README.md'), 'utf8')
    )
    expect(await readFile(join(work, 'express', 'src/checkout/options/express.ts'), 'utf8')).toBe(
      await readFile(
        join(MONOREPO, 'templates/strategy/ts/exercises/implement-express/start/src/checkout/options/express.ts'),
        'utf8'
      )
    )
  })

  it('keeps typika.toml with the template as parent and the tour with --keep-tour', async () => {
    const { code } = await cli(['create', 'strategy-go', 'with-tour', '--keep-tour'])

    expect(code).toBe(0)
    expect(await readFile(join(work, 'with-tour', 'typika.toml'), 'utf8')).toMatch(
      /^parent = "github:typika\/templates\/strategy\/go@[0-9a-f]{12}"$/m
    )
    expect(await filesIn(join(work, 'with-tour', 'tour'))).toContain('01-overview.md')
  })

  it('exits with 3 on a name absent from the registry', async () => {
    const { code, stderr } = await cli(['create', 'missing-ts'])

    expect(code).toBe(3)
    expect(stderr).toBe('Template "missing-ts" was not found.')
  })

  it('exits with 4 on an unknown exercise', async () => {
    expect((await cli(['create', 'strategy-ts', 'unknown', '--exercise', 'missing'])).code).toBe(4)
  })

  it('exits with 6 on a non-empty directory unless --force is passed', async () => {
    await cli(['create', 'strategy-ts', 'taken'])

    expect((await cli(['create', 'strategy-ts', 'taken'])).code).toBe(6)
    expect((await cli(['create', 'strategy-ts', 'taken', '--force'])).code).toBe(0)
  })

  it('exits with 7 when the registry cannot be reached', async () => {
    const code = await runCli(['create', 'strategy-ts', '--registry', 'http://127.0.0.1:9/index.json'], {
      cwd: work,
      stdout: () => {},
      stderr: () => {},
    })

    expect(code).toBe(7)
  })
})

describe('typika validate', () => {
  it('exits with 0 on a valid template', async () => {
    const { code, stdout } = await cli(['validate', join(MONOREPO, 'templates/strategy/ts')])

    expect(stdout).toBe('strategy-ts: 0 errors, 0 warnings.')
    expect(code).toBe(0)
  })

  it('exits with 5 on a deliberately broken template', async () => {
    const broken = join(work, 'broken')
    await cp(join(MONOREPO, 'templates/strategy/ts'), broken, { recursive: true })
    await rm(join(broken, 'LICENSE'))

    const { code, stdout } = await cli(['validate', broken])

    expect(code).toBe(5)
    expect(stdout).toContain('E_LICENSE_FILE_MISSING LICENSE: LICENSE file is missing.')
  })

  it('runs the tests and exercises of a Go template with --run', async () => {
    const { code, stdout } = await cli(['validate', join(MONOREPO, 'templates/strategy/go'), '--run'])

    expect(stdout).toBe('strategy-go: 0 errors, 0 warnings.')
    expect(code).toBe(0)
  }, 120_000)

  it('exits with 5 when the tests of the template fail with --run', async () => {
    const failing = join(work, 'failing-go')
    await cp(join(MONOREPO, 'templates/strategy/go'), failing, { recursive: true })
    const standard = join(failing, 'internal/checkout/standard_shipping_test.go')
    await writeFile(standard, (await readFile(standard, 'utf8')).replace('shop.EUR(490)', 'shop.EUR(491)'))

    const { code, stdout } = await cli(['validate', failing, '--run'])

    expect(code).toBe(5)
    expect(stdout).toContain('E_TESTS_FAIL tests: The tests of the template do not pass (failing in')
  }, 120_000)
})
