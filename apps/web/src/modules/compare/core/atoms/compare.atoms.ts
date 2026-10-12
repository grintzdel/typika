import * as Atom from 'effect/reactivity/Atom'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { openComparisonProgram, type ComparisonRequest } from '../programs/open-comparison/open-comparison.program.ts'

export const comparisonAtom = Atom.family((request: ComparisonRequest) =>
  appRuntime.atom(openComparisonProgram(request))
)
