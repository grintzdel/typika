import { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import { runtimeSessionAtom } from '../../../runtime/core/atoms/runtime.atoms.ts'
import { connectLanguageServerProgram } from '../programs/connect-language-server/connect-language-server.program.ts'
import { startLanguageServiceProgram } from '../programs/start-language-service/start-language-service.program.ts'

export const languageServiceAtom = Atom.family((name: string) =>
  appRuntime.atom((get) =>
    Effect.gen(function* () {
      const project = yield* get.result(templateProjectAtom(name))
      const { kind } = project.manifest.runtime
      if (kind === RuntimeKind.BROWSER_JS) return yield* startLanguageServiceProgram(project)
      if (kind !== RuntimeKind.GO) return undefined
      const { languageServer } = yield* get.result(runtimeSessionAtom(name))
      return languageServer === undefined ? undefined : yield* connectLanguageServerProgram(languageServer, project)
    })
  )
)
