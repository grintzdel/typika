import { beforeEach, describe, expect, inject, it } from 'vitest'

import {
  compile,
  compileBody,
  constantBomb,
  postCompile,
  readError,
  readyWorkers,
  templateFiles,
  typeBomb,
  uniqueVariant,
  waitUntil,
} from './compile-client.ts'

const { url } = inject('limitedService')

const strategy = () => uniqueVariant(templateFiles('strategy/kotlin'), crypto.randomUUID())

const waitForReadyWorkers = () => waitUntil(readyWorkers(url, 2), 60_000, 'the workers to restart')

const elapsed = async <T>(promise: Promise<T>) => {
  const started = performance.now()
  const value = await promise
  return { value, ms: performance.now() - started, finishedAt: performance.now() }
}

describe('service limits', () => {
  beforeEach(waitForReadyWorkers)

  it('rejects a body over the limit with 413', async () => {
    const padding = { path: 'src/main/kotlin/Padding.kt', content: `// ${'x'.repeat(70 * 1024)}` }

    const response = await postCompile(url, compileBody([...templateFiles('strategy/kotlin'), padding]))

    expect(response.status).toBe(413)
  })

  it('interrupts a compilation over the timeout with 504', async () => {
    const { value: response, ms } = await elapsed(postCompile(url, compileBody(typeBomb(24))))

    expect(response.status).toBe(504)
    expect(await readError(response)).toEqual({ error: 'compilation timed out after 4000 ms' })
    expect(ms).toBeGreaterThanOrEqual(4000)
    expect(ms).toBeLessThan(8000)
  })

  it('keeps compiling other projects while a compilation runs into the timeout', async () => {
    const bomb = elapsed(postCompile(url, compileBody(typeBomb(24))))
    await new Promise((resolve) => setTimeout(resolve, 300))
    const project = elapsed(compile(url, strategy()))

    const [interrupted, compiled] = await Promise.all([bomb, project])

    expect(compiled.value.body.ok).toBe(true)
    expect(compiled.finishedAt).toBeLessThan(interrupted.finishedAt)
    expect(interrupted.value.status).toBe(504)
  })

  it('compiles normally once the interrupted workers have restarted', async () => {
    const { body } = await compile(url, strategy())

    expect(body.ok).toBe(true)
  })

  it('answers 503 with Retry-After when every worker is busy and the queue is full', async () => {
    const busy = [postCompile(url, compileBody(typeBomb(24))), postCompile(url, compileBody(typeBomb(24)))]
    await new Promise((resolve) => setTimeout(resolve, 300))

    const response = await postCompile(url, compileBody(strategy()))

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('5')
    expect((await Promise.all(busy)).map((r) => r.status)).toEqual([504, 504])
  })

  it('answers 503 when a compilation runs the compiler out of memory, then recovers', async () => {
    const response = await postCompile(url, compileBody(constantBomb(26), { mode: 'run' }))

    expect(response.status).toBe(503)
    expect(await readError(response)).toEqual({ error: 'compiler crashed and is restarting' })
    await waitForReadyWorkers()
    expect((await compile(url, strategy())).body.ok).toBe(true)
  })
})
