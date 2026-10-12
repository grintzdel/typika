import { useAtomValue } from '@effect/atom-react'
import { useHydrated } from '@tanstack/react-router'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'

import { recentProjectsAtom } from '../../core/atoms/project.atoms.ts'
import type { RecentProject } from '../../core/domain/project.domain-model.ts'

const noProjectsAtom: typeof recentProjectsAtom = Atom.make(AsyncResult.success<Array<RecentProject>>([]))

export const useRecentProjects = () => {
  const isHydrated = useHydrated()
  const result = useAtomValue(isHydrated ? recentProjectsAtom : noProjectsAtom)
  return { projects: Option.getOrElse(AsyncResult.value(result), () => []), now: Date.now() }
}
