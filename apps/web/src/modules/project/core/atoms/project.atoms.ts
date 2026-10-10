import * as Atom from 'effect/reactivity/Atom'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { openTemplateProgram } from '../programs/open-template/open-template.program.ts'

export const templateProjectAtom = Atom.family((name: string) => appRuntime.atom(openTemplateProgram(name)))
