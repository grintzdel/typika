import { makeRuntimeRegistry } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import esbuildWasmUrl from 'esbuild-wasm/esbuild.wasm?url'
import goAssets from 'virtual:typika/go-assets'

import {
  FrameHandshakeSchema,
  type FrameHandshake,
} from '../modules/runtime/core/domain/runtime-frame-protocol.domain-model.ts'
import { serveRuntimeFrame } from '../modules/runtime/core/frame-host/serve-runtime-frame.ts'
import { fetchPublicConfig } from '../modules/shared/core/adapters/app-config.fetch.adapter.ts'

const decodeHandshake = Schema.decodeUnknownOption(FrameHandshakeSchema)

const config = await Effect.runPromise(fetchPublicConfig('./config.json'))
const appOrigin = new URL(config.publicUrl).origin

const registry = makeRuntimeRegistry({
  'browser-js': async () => {
    const { makeBrowserJsRuntime } = await import('@typika/runtime-browser-js')
    return makeBrowserJsRuntime({
      esbuildWasmUrl,
      ...(config.packageUrlTemplate === undefined ? {} : { packageUrlTemplate: config.packageUrlTemplate }),
    })
  },
  go: async () => {
    const { makeGoRuntime } = await import('@typika/runtime-go/browser')
    return makeGoRuntime({ assetsUrl: new URL(goAssets.assetsUrl, location.href).href, manifest: goAssets.manifest })
  },
})

let serving: Fiber.Fiber<never> | undefined

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  const port = event.ports[0]
  if (event.origin !== appOrigin || event.source !== window.parent || port === undefined) return
  if (Option.getOrUndefined(decodeHandshake(event.data))?._tag !== 'Connect') return
  const previous = serving
  serving = Effect.runFork(
    Effect.andThen(
      previous === undefined ? Effect.void : Fiber.interrupt(previous),
      Effect.scoped(serveRuntimeFrame(port, registry))
    )
  )
})

window.parent.postMessage({ _tag: 'RuntimeFrameReady' } satisfies FrameHandshake, appOrigin)
