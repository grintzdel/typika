import { RuntimeLimit, type Diagnostic, type ProcessOutput, type RuntimeExecutionError } from '@typika/runtime-core'

import { describeCause } from './runtime-error-data.ts'

export type ConsoleEntry = {
  readonly stream: 'stdout' | 'stderr' | 'diagnostic'
  readonly text: string
}

export type ConsoleOutcome =
  | { readonly _tag: 'Running' }
  | { readonly _tag: 'Exited'; readonly code: number }
  | { readonly _tag: 'Interrupted' }
  | { readonly _tag: 'CompileFailed' }
  | { readonly _tag: 'TimedOut'; readonly limitMs: number }
  | { readonly _tag: 'Crashed'; readonly message: string }

export type ConsoleState = {
  readonly entries: ReadonlyArray<ConsoleEntry>
  readonly diagnostics: ReadonlyArray<Diagnostic>
  readonly size: number
  readonly truncated: boolean
  readonly outcome: ConsoleOutcome
}

export type ConsoleEvent =
  | { readonly _tag: 'Output'; readonly output: ProcessOutput }
  | { readonly _tag: 'Failed'; readonly error: RuntimeExecutionError }
  | { readonly _tag: 'Interrupted' }

export const EMPTY_CONSOLE: ConsoleState = {
  entries: [],
  diagnostics: [],
  size: 0,
  truncated: false,
  outcome: { _tag: 'Running' },
}

export const formatDiagnostic = (diagnostic: Diagnostic) => {
  const location = diagnostic.location
  if (location === undefined) return diagnostic.message
  const position = location.column === undefined ? `${location.line}` : `${location.line}:${location.column}`
  return `${location.file}:${position} ${diagnostic.message}`
}

const append = (state: ConsoleState, added: ReadonlyArray<ConsoleEntry>, limit: number): ConsoleState => {
  const entries = [...state.entries, ...added]
  let size = state.size + added.reduce((total, entry) => total + entry.text.length, 0)
  let dropped = 0
  while (size > limit && dropped < entries.length - 1) {
    size -= entries[dropped]?.text.length ?? 0
    dropped++
  }
  return { ...state, entries: entries.slice(dropped), size, truncated: state.truncated || dropped > 0 }
}

const outcomeOf = (error: RuntimeExecutionError): ConsoleOutcome => {
  switch (error._tag) {
    case 'RuntimeCompileError':
      return { _tag: 'CompileFailed' }
    case 'RuntimeTimeoutError':
      return { _tag: 'TimedOut', limitMs: error.limitMs }
    case 'RuntimeProcessError':
    case 'KotlinCompilerUnavailableError':
      return { _tag: 'Crashed', message: describeCause(error.cause) }
    default:
      return { _tag: 'Crashed', message: error._tag }
  }
}

export const reduceConsole = (
  state: ConsoleState,
  event: ConsoleEvent,
  limit: number = RuntimeLimit.CONSOLE_OUTPUT_BYTES
): ConsoleState => {
  if (event._tag === 'Interrupted') return { ...state, outcome: { _tag: 'Interrupted' } }
  if (event._tag === 'Failed') {
    const diagnostics = event.error._tag === 'RuntimeCompileError' ? event.error.diagnostics : []
    const entries = diagnostics.map((diagnostic) => ({
      stream: 'diagnostic' as const,
      text: formatDiagnostic(diagnostic),
    }))
    return { ...append(state, entries, limit), diagnostics, outcome: outcomeOf(event.error) }
  }
  switch (event.output._tag) {
    case 'Stdout':
      return append(state, [{ stream: 'stdout', text: event.output.chunk }], limit)
    case 'Stderr':
      return append(state, [{ stream: 'stderr', text: event.output.chunk }], limit)
    default:
      return { ...state, outcome: { _tag: 'Exited', code: event.output.code } }
  }
}
