import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as Schema from 'effect/Schema'

export type SourceFile = { path: string; content: string }

const CompileResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  artifact: Schema.optionalKey(
    Schema.Struct({ kind: Schema.Literal('js'), code: Schema.String, sourceMap: Schema.String })
  ),
  diagnostics: Schema.Array(
    Schema.Struct({
      severity: Schema.Literals(['error', 'warning']),
      message: Schema.String,
      location: Schema.optionalKey(
        Schema.Struct({ file: Schema.String, line: Schema.Number, column: Schema.optionalKey(Schema.Number) })
      ),
    })
  ),
})

const HealthSchema = Schema.Struct({ ok: Schema.Boolean, kotlinVersion: Schema.String, readyWorkers: Schema.Number })

const ErrorSchema = Schema.Struct({ error: Schema.String })

const SourceMapSchema = Schema.Struct({ sources: Schema.Array(Schema.String) })

const decodeCompileResponse = Schema.decodeUnknownSync(CompileResponseSchema)
const decodeHealth = Schema.decodeUnknownSync(HealthSchema)
const decodeError = Schema.decodeUnknownSync(ErrorSchema)

export const readCompileResponse = async (response: Response) =>
  decodeCompileResponse((await response.json()) as unknown)
export const readHealth = async (response: Response) => decodeHealth((await response.json()) as unknown)
export const readError = async (response: Response) => decodeError((await response.json()) as unknown)
export const parseSourceMap = (sourceMap: string) => Schema.decodeUnknownSync(SourceMapSchema)(JSON.parse(sourceMap))

export const waitUntil = async (condition: () => Promise<boolean>, timeoutMs: number, what: string): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  const attempt = async (): Promise<void> => {
    if (await condition().catch(() => false)) return
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 250))
    return attempt()
  }
  return attempt()
}

export const readyWorkers = (url: string, count: number) => async () =>
  (await readHealth(await fetch(`${url}/health`))).readyWorkers === count

const templates = fileURLToPath(new URL('../../../templates/', import.meta.url))

const kotlinFiles = (root: string): Array<SourceFile> => {
  const files: Array<SourceFile> = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (path.endsWith('.kt')) files.push({ path: relative(root, path), content: readFileSync(path, 'utf8') })
    }
  }
  walk(join(root, 'src'))
  return files
}

export const templateFiles = (template: string, ...overlays: Array<string>): Array<SourceFile> => {
  const byPath = new Map<string, SourceFile>()
  for (const dir of [template, ...overlays]) {
    for (const file of kotlinFiles(join(templates, dir))) byPath.set(file.path, file)
  }
  return [...byPath.values()]
}

export const compileBody = (files: Array<SourceFile>, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ protocol: 1, target: 'js', kotlinVersion: '2.4', mode: 'test', files, ...overrides })

export const postCompile = (url: string, body: string, headers: Record<string, string> = {}) =>
  fetch(`${url}/compile`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body })

export const compile = async (url: string, files: Array<SourceFile>, overrides: Record<string, unknown> = {}) => {
  const response = await postCompile(url, compileBody(files, overrides))
  return { status: response.status, body: await readCompileResponse(response) }
}

export const typeBomb = (depth: number): Array<SourceFile> => [
  {
    path: 'src/main/kotlin/Bomb.kt',
    content: [
      'fun <T> p(t: T) = Pair(t, t)',
      `fun main() { val x = ${'p('.repeat(depth)}1${')'.repeat(depth)}`,
      '  val y: Int = x }',
    ].join('\n'),
  },
]

export const constantBomb = (doublings: number): Array<SourceFile> => [
  {
    path: 'src/main/kotlin/Bomb.kt',
    content: [
      'const val a0 = "0123456789abcdef"',
      ...Array.from({ length: doublings }, (_, i) => `const val a${i + 1} = a${i} + a${i}`),
      `fun main() { println(a${doublings}.length) }`,
    ].join('\n'),
  },
]

export const uniqueVariant = (files: Array<SourceFile>, marker: string): Array<SourceFile> =>
  files.map((file, index) => (index === 0 ? { ...file, content: `${file.content}\n// ${marker}\n` } : file))
