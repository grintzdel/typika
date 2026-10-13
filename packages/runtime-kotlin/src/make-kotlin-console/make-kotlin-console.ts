import type { KotlinConsole, KotlinConsoleMethod } from '../domain/kotlin-module.domain-model.ts'

const STREAMS: Readonly<Record<KotlinConsoleMethod, 'stdout' | 'stderr'>> = {
  log: 'stdout',
  info: 'stdout',
  debug: 'stdout',
  warn: 'stderr',
  error: 'stderr',
}

export const makeKotlinConsole = (write: (stream: 'stdout' | 'stderr', chunk: string) => void): KotlinConsole => {
  const method =
    (stream: 'stdout' | 'stderr') =>
    (...args: ReadonlyArray<unknown>) =>
      write(stream, `${args.map(String).join(' ')}\n`)
  return {
    log: method(STREAMS.log),
    info: method(STREAMS.info),
    debug: method(STREAMS.debug),
    warn: method(STREAMS.warn),
    error: method(STREAMS.error),
  }
}
