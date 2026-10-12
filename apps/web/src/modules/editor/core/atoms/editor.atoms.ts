import { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import { startLanguageServiceProgram } from '../programs/start-language-service/start-language-service.program.ts'

export const languageServiceAtom = Atom.family((name: string) =>
  appRuntime.atom((get) =>
    Effect.flatMap(get.result(templateProjectAtom(name)), (project) =>
      project.manifest.runtime.kind === RuntimeKind.BROWSER_JS
        ? startLanguageServiceProgram(project)
        : Effect.succeed(undefined)
    )
  )
)
