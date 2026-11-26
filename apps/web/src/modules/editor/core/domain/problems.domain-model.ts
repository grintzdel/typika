import type { Diagnostic } from '@typika/runtime-core'

import type { ProjectDiagnostic } from './language-service.domain-model.ts'

export type Problem = ProjectDiagnostic

export type ProblemCounts = { readonly errors: number; readonly warnings: number }

const offsetOf = (content: string, line: number, column: number) => {
  let start = 0
  for (let current = 1; current < line; current += 1) {
    const next = content.indexOf('\n', start)
    if (next === -1) break
    start = next + 1
  }
  const end = content.indexOf('\n', start)
  return Math.min(start + column - 1, end === -1 ? content.length : end)
}

const keyOf = (problem: Problem) => `${problem.path}:${problem.line}:${problem.column}:${problem.message}`

const byPosition = (a: Problem, b: Problem) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column

export const problemsOf = ({
  analysed,
  build,
  contentOf,
}: {
  readonly analysed: ReadonlyArray<Problem>
  readonly build: ReadonlyArray<Diagnostic>
  readonly contentOf: (path: string) => string
}): ReadonlyArray<Problem> => {
  const built = build.flatMap(({ severity, message, location }): ReadonlyArray<Problem> => {
    if (location === undefined) return []
    const column = location.column ?? 1
    const from = offsetOf(contentOf(location.file), location.line, column)
    return [{ path: location.file, line: location.line, column, from, to: from, severity, message }]
  })
  const known = new Set(analysed.map(keyOf))
  return [...analysed, ...built.filter((problem) => !known.has(keyOf(problem)))].toSorted(byPosition)
}

export const countProblems = (problems: ReadonlyArray<Problem>): ProblemCounts => ({
  errors: problems.filter((problem) => problem.severity === 'error').length,
  warnings: problems.filter((problem) => problem.severity === 'warning').length,
})
