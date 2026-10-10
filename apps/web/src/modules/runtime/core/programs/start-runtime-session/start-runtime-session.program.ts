import type { ProjectSnapshot } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import { RuntimeFramePort } from '../../ports/runtime-frame.port.ts'

export const startRuntimeSessionProgram = (snapshot: ProjectSnapshot) =>
  Effect.flatMap(RuntimeFramePort, (frame) => frame.boot(snapshot))
