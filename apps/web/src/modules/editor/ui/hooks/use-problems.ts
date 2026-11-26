import type { Diagnostic } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import { useEffect, useState } from 'react'

import { countProblems, problemsOf, type Problem } from '../../core/domain/problems.domain-model.ts'
import type { LanguageServiceSession } from '../../core/ports/language-service.port.ts'

export type ProblemSources = {
  readonly session: LanguageServiceSession | undefined
  readonly revision: unknown
  readonly build: ReadonlyArray<Diagnostic>
  readonly contentOf: (path: string) => string
}

export const useProblems = ({ session, revision, build, contentOf }: ProblemSources) => {
  const [analysed, setAnalysed] = useState<{ readonly session: unknown; readonly problems: ReadonlyArray<Problem> }>({
    session: undefined,
    problems: [],
  })

  useEffect(() => {
    if (session === undefined) return
    let isCurrent = true
    void Effect.runPromise(Effect.orElseSucceed(session.projectDiagnostics(), () => [])).then((problems) => {
      if (isCurrent) setAnalysed({ session, problems })
    })
    return () => {
      isCurrent = false
    }
  }, [session, revision])

  const isChecked = session === undefined || analysed.session === session
  const problems = problemsOf({
    analysed: analysed.session === session ? analysed.problems : [],
    build,
    contentOf,
  })
  return { problems, counts: countProblems(problems), isChecked }
}
