import * as Layer from 'effect/Layer'

import { SharedLayer } from '../../shared/core/shared.layer.ts'
import { RuntimeFrameIframeLayer } from './adapters/runtime-frame.iframe.adapter.ts'

export const RuntimeLayer = RuntimeFrameIframeLayer.pipe(Layer.provide(SharedLayer))
