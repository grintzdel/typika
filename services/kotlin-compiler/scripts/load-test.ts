import { execFileSync, spawn } from 'node:child_process'
import { parseArgs } from 'node:util'

import { compileBody, postCompile, templateFiles, typeBomb, uniqueVariant } from '../test/compile-client.ts'

const { values } = parseArgs({
  options: {
    app: { type: 'string', default: 'http://localhost' },
    container: { type: 'string', default: 'typika-kotlin-compiler-1' },
    scenario: { type: 'string', default: 'rate' },
    requests: { type: 'string', default: '60' },
  },
})

const relay = `${values.app.replace(/\/+$/, '')}/api/kotlin`
const container = values.container
const failures: Array<string> = []

const check = (ok: boolean, message: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) failures.push(message)
}

const inspect = (format: string) =>
  execFileSync('docker', ['inspect', '--format', format, container], { encoding: 'utf8' }).trim()

const UNITS: Record<string, number> = { B: 1, KiB: 2 ** 10, MiB: 2 ** 20, GiB: 2 ** 30 }

const toBytes = (text: string) => {
  const match = /^([\d.]+)\s*(B|KiB|MiB|GiB)$/.exec(text.trim())
  return match === null ? Number.NaN : Number(match[1]) * (UNITS[match[2] ?? 'B'] ?? 1)
}

const watchMemory = () => {
  const memory = { peak: 0, limit: Number.NaN }
  const stats = spawn('docker', ['stats', '--format', '{{.MemUsage}}', container])
  stats.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    for (const [, used = '', limit = ''] of chunk.matchAll(/([\d.]+\s*[KMG]?i?B)\s*\/\s*([\d.]+\s*[KMG]?i?B)/g)) {
      memory.peak = Math.max(memory.peak, toBytes(used))
      memory.limit = toBytes(limit)
    }
  })
  return { memory, stop: () => stats.kill() }
}

const strategy = () => compileBody(uniqueVariant(templateFiles('strategy/kotlin'), crypto.randomUUID()))

const timed = async (body: string) => {
  const started = performance.now()
  const response = await postCompile(relay, body)
  await response.arrayBuffer()
  return {
    status: response.status,
    retryAfter: response.headers.get('retry-after'),
    ms: performance.now() - started,
  }
}

const tally = (statuses: ReadonlyArray<number>) =>
  Object.fromEntries(
    [...new Set(statuses)]
      .toSorted((a, b) => a - b)
      .map((status) => [status, statuses.filter((s) => s === status).length])
  )

const percentile = (durations: ReadonlyArray<number>, p: number) => {
  const sorted = durations.toSorted((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100))] ?? 0
}

const rateScenario = async () => {
  const count = Number(values.requests)
  const body = strategy()
  const results = await Promise.all(Array.from({ length: count }, () => timed(body)))
  const statuses = results.map(({ status }) => status)
  console.log(`statuses: ${JSON.stringify(tally(statuses))}`)
  check(statuses.includes(200), 'the compilations within the burst succeed')
  check(
    statuses.every((status) => status === 200 || status === 429),
    'every answer is 200 or 429'
  )
  const limited = results.filter(({ status }) => status === 429)
  check(limited.length > 0, 'a burst from one client is rate limited')
  check(
    limited.every(({ retryAfter }) => retryAfter !== null && Number(retryAfter) > 0),
    'every 429 carries a Retry-After'
  )
}

const saturateScenario = async () => {
  const restartsBefore = inspect('{{.RestartCount}}')
  const { memory, stop } = watchMemory()

  const bombs = [timed(compileBody(typeBomb(24))), timed(compileBody(typeBomb(24)))]
  await new Promise((resolve) => setTimeout(resolve, 300))
  const started = performance.now()
  const compilations = await Promise.all(Array.from({ length: Number(values.requests) }, () => timed(strategy())))
  const seconds = (performance.now() - started) / 1000
  const bombed = await Promise.all(bombs)
  const after = await timed(strategy())
  stop()
  const { peak, limit } = memory

  const statuses = compilations.map(({ status }) => status)
  const succeeded = compilations.filter(({ status }) => status === 200)
  console.log(
    `statuses: ${JSON.stringify(tally(statuses))}, bombs: ${JSON.stringify(bombed.map(({ status }) => status))}`
  )
  console.log(
    `throughput ${(succeeded.length / seconds).toFixed(2)} compil./s, p50 ${percentile(
      succeeded.map(({ ms }) => ms),
      50
    ).toFixed(0)} ms, p95 ${percentile(
      succeeded.map(({ ms }) => ms),
      95
    ).toFixed(0)} ms`
  )
  console.log(`peak memory ${(peak / 2 ** 20).toFixed(0)} MiB of ${(limit / 2 ** 20).toFixed(0)} MiB`)
  check(
    statuses.every((status) => status === 200 || status === 503),
    'every compilation answers 200 or 503'
  )
  check(statuses.includes(503), 'a full queue answers 503')
  check(
    compilations.filter(({ status }) => status === 503).every(({ retryAfter }) => retryAfter !== null),
    'every 503 carries a Retry-After'
  )
  check(
    bombed.every(({ status }) => status === 504),
    'the compilations over the timeout answer 504'
  )
  check(after.status === 200, 'the service compiles again after the load')
  check(peak < limit, 'the container stays under its memory limit')
  check(inspect('{{.State.OOMKilled}}') === 'false', 'the container was not killed for memory')
  check(inspect('{{.RestartCount}}') === restartsBefore, 'the container did not restart')
}

const scenarios: Record<string, () => Promise<void>> = {
  rate: rateScenario,
  saturate: saturateScenario,
}
const run = scenarios[values.scenario]
if (run === undefined) throw new Error(`unknown scenario ${values.scenario}: use rate or saturate`)
await run()
if (failures.length > 0) process.exit(1)
