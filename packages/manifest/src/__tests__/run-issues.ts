import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'

import { ManifestInvalidError } from '../domain/errors/manifest-invalid.error.ts'
import type { ManifestIssue } from '../domain/manifest-issue.domain-model.ts'

export const issuesOf = async <A, E>(program: Effect.Effect<A, E>): Promise<ReadonlyArray<ManifestIssue>> => {
  const exit = await Effect.runPromiseExit(program)
  if (Exit.isSuccess(exit)) return []
  const error = Option.getOrUndefined(Exit.findErrorOption(exit))
  if (error instanceof ManifestInvalidError) return error.issues
  throw new Error('expected a ManifestInvalidError', { cause: exit.cause })
}

export const codesOf = (issues: ReadonlyArray<ManifestIssue>) => issues.map((issue) => `${issue.code} ${issue.path}`)

export const valueOf = async <A, E>(program: Effect.Effect<A, E>): Promise<A> => {
  const exit = await Effect.runPromiseExit(program)
  if (Exit.isSuccess(exit)) return exit.value
  throw new Error('expected success', { cause: exit.cause })
}
