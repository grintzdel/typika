import type { RuntimeKind } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import { NO_DOWNLOADS, recordDownload, totalDownload } from '../../domain/runtime-download.domain-model.ts'
import { RuntimeFramePort } from '../../ports/runtime-frame.port.ts'

export const loadRuntimeProgram = (kind: RuntimeKind) =>
  Stream.unwrap(Effect.map(RuntimeFramePort, (frame) => frame.load(kind))).pipe(
    Stream.scan(() => NO_DOWNLOADS, recordDownload),
    Stream.map(totalDownload),
    Stream.catch(() => Stream.empty)
  )
