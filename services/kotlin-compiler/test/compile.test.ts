import { execFileSync } from 'node:child_process'

import { describe, expect, inject, it } from 'vitest'

import {
  compile,
  compileBody,
  parseSourceMap,
  postCompile,
  readError,
  readHealth,
  templateFiles,
  uniqueVariant,
} from './compile-client.ts'
import { ALLOWED_ORIGIN } from './containers.global-setup.ts'

const { url, container } = inject('defaultService')

const exercises = 'strategy/kotlin/exercises'

const strategyStates = {
  'strategy-kotlin': templateFiles('strategy/kotlin'),
  'add-pickup-point-option start': templateFiles('strategy-base/kotlin', `${exercises}/add-pickup-point-option/start`),
  'add-pickup-point-option solution': templateFiles(
    'strategy/kotlin',
    `${exercises}/add-pickup-point-option/start`,
    `${exercises}/add-pickup-point-option/solution`
  ),
  'implement-express start': templateFiles('strategy/kotlin', `${exercises}/implement-express/start`),
  'implement-express solution': templateFiles(
    'strategy/kotlin',
    `${exercises}/implement-express/start`,
    `${exercises}/implement-express/solution`
  ),
}

describe('POST /compile', () => {
  it.each(Object.entries(strategyStates))('compiles %s with its tests into an ES module', async (_, files) => {
    const { status, body } = await compile(url, files)

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(body.artifact?.kind).toBe('js')
    expect(body.artifact?.code).toContain("suite('checkout'")
    expect(body.artifact?.code).not.toContain('sourceMappingURL')
    const sourceMap = parseSourceMap(body.artifact?.sourceMap ?? '{}')
    expect(sourceMap.sources).toContain('src/test/kotlin/checkout/StandardShippingTest.kt')
  })

  it('compiles a program that calls main in run mode', async () => {
    const sources = templateFiles('strategy/kotlin').filter((file) => file.path.startsWith('src/main/'))

    const { body } = await compile(url, sources, { mode: 'run' })

    expect(body.ok).toBe(true)
    expect(body.artifact?.code).not.toContain("suite('checkout'")
    expect(body.artifact?.code).toMatch(/\nmainWrapper\(\);\s*$/)
  })

  it('answers a compilation error with diagnostics located in the project', async () => {
    const files = [{ path: 'src/main/kotlin/Main.kt', content: 'fun main() {\n    val total: Int = "zero"\n}\n' }]

    const { status, body } = await compile(url, files, { mode: 'run' })

    expect(status).toBe(200)
    expect(body.ok).toBe(false)
    expect(body.artifact).toBeUndefined()
    expect(body.diagnostics).toEqual([
      {
        severity: 'error',
        message: "Initializer type mismatch: expected 'Int', actual 'String'.",
        location: { file: 'src/main/kotlin/Main.kt', line: 2, column: 20 },
      },
    ])
  })

  it('refuses a JVM-only API at compilation', async () => {
    const files = [{ path: 'src/main/kotlin/Main.kt', content: 'fun main() {\n    java.io.File("/etc/passwd")\n}\n' }]

    const { body } = await compile(url, files, { mode: 'run' })

    expect(body.ok).toBe(false)
    expect(body.diagnostics[0]?.message).toContain("Unresolved reference 'java'")
  })

  it('answers the same request from its cache without logging the sources', async () => {
    const marker = `cache-marker-${Date.now()}`
    const files = uniqueVariant(templateFiles('strategy/kotlin'), marker)

    const first = await compile(url, files)
    const second = await compile(url, files)

    expect(second.body).toEqual(first.body)
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8' })
    expect(logs).toMatch(/compile status=200 .* cache=hit/)
    expect(logs).not.toContain(marker)
    expect(logs).not.toContain('ShippingOption')
  })

  it.each([
    ['an unknown protocol', { protocol: 2 }, 'unsupported protocol 2'],
    ['another target', { target: 'wasm' }, 'unsupported target wasm'],
    ['another Kotlin version', { kotlinVersion: '2.3' }, 'unsupported kotlinVersion 2.3, this service compiles 2.4'],
    ['an unknown mode', { mode: 'repl' }, 'unsupported mode repl'],
    ['no files', { files: [] }, 'no files'],
    ['a path outside the project', { files: [{ path: '../Main.kt', content: '' }] }, 'invalid path ../Main.kt'],
    ['an absolute path', { files: [{ path: '/tmp/Main.kt', content: '' }] }, 'invalid path /tmp/Main.kt'],
    [
      'a file that is not Kotlin',
      { files: [{ path: 'build.gradle.kts', content: '' }] },
      'invalid path build.gradle.kts',
    ],
  ])('rejects %s with 400', async (_, overrides, error) => {
    const response = await postCompile(url, compileBody(templateFiles('strategy/kotlin'), overrides))

    expect(response.status).toBe(400)
    expect(await readError(response)).toEqual({ error })
  })

  it('rejects a body that is not a compile request with 400', async () => {
    const response = await postCompile(url, '{"files": 3')

    expect(response.status).toBe(400)
  })

  it('only accepts POST', async () => {
    const response = await fetch(`${url}/compile`)

    expect(response.status).toBe(405)
  })
})

describe('CORS', () => {
  it('allows the configured origin', async () => {
    const response = await postCompile(url, compileBody(templateFiles('strategy/kotlin')), { origin: ALLOWED_ORIGIN })

    expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN)
  })

  it('does not allow another origin', async () => {
    const response = await postCompile(url, compileBody(templateFiles('strategy/kotlin')), {
      origin: 'https://elsewhere.test',
    })

    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers the preflight of the configured origin', async () => {
    const response = await fetch(`${url}/compile`, {
      method: 'OPTIONS',
      headers: { origin: ALLOWED_ORIGIN, 'access-control-request-method': 'POST' },
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-methods')).toBe('POST')
  })
})

describe('GET /health', () => {
  it('reports the Kotlin version and the ready workers', async () => {
    const response = await fetch(`${url}/health`)

    expect(await readHealth(response)).toEqual({ ok: true, kotlinVersion: '2.4.21', readyWorkers: 2 })
  })
})
