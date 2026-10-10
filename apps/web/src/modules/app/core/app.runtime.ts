import * as Atom from 'effect/reactivity/Atom'

import { AppLayer } from './app.layer.ts'

export const appRuntime = Atom.runtime(AppLayer)
