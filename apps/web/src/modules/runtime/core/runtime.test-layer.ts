import type { RuntimePort } from '@typika/runtime-core'
import * as Layer from 'effect/Layer'

import { RuntimeFramePort } from './ports/runtime-frame.port.ts'

export const makeRuntimeTestLayer = (port: RuntimePort) =>
  Layer.succeed(RuntimeFramePort, { load: () => port.load, boot: port.boot })
