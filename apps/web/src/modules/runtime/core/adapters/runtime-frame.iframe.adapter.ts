import { RuntimeLimit } from '@typika/runtime-core'
import {
  makeIndexedDbCompileCache,
  makeKotlinCompilerClient,
  makeMemoryCompileCache,
  makePrecompiledCompileCache,
  type KotlinCompilerClient,
} from '@typika/runtime-kotlin'
import type * as Context from 'effect/Context'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'

import { isEmbedPath } from '../../../embed/core/domain/embed.domain-model.ts'
import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { RuntimeFrameUnavailableError } from '../domain/errors/runtime-frame-unavailable.error.ts'
import { FrameHandshakeSchema, type FrameHandshake } from '../domain/runtime-frame-protocol.domain-model.ts'
import { RuntimeFramePort } from '../ports/runtime-frame.port.ts'
import { makeRuntimeFrameClient, type RuntimeFrameClientOptions } from './runtime-frame-client.ts'

const FRAME_PATH = '/runtime/frame.html'
const READY_TIMEOUT = Duration.seconds(20)

const decodeHandshake = Schema.decodeUnknownOption(FrameHandshakeSchema)

const openFrame = (runtimeOrigin: string) =>
  Effect.callback<MessagePort, RuntimeFrameUnavailableError>((resume) => {
    const iframe = document.createElement('iframe')
    iframe.src = `${runtimeOrigin}${FRAME_PATH}`
    iframe.title = 'Typika runtime'
    iframe.hidden = true
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
    iframe.setAttribute('allow', 'cross-origin-isolated')

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== runtimeOrigin || event.source !== iframe.contentWindow) return
      if (Option.getOrUndefined(decodeHandshake(event.data))?._tag !== 'RuntimeFrameReady') return
      window.removeEventListener('message', onMessage)
      const channel = new MessageChannel()
      iframe.contentWindow?.postMessage({ _tag: 'Connect' } satisfies FrameHandshake, runtimeOrigin, [channel.port2])
      resume(Effect.succeed(channel.port1))
    }

    window.addEventListener('message', onMessage)
    document.body.append(iframe)
    return Effect.sync(() => {
      window.removeEventListener('message', onMessage)
      iframe.remove()
    })
  }).pipe(
    Effect.timeoutOrElse({
      duration: READY_TIMEOUT,
      orElse: () =>
        Effect.fail(new RuntimeFrameUnavailableError({ cause: `No answer from ${runtimeOrigin}${FRAME_PATH}` })),
    })
  )

export const makeRuntimeFrameIframe = (
  runtimeOrigin: string,
  options: RuntimeFrameClientOptions = {}
): Context.Service.Shape<typeof RuntimeFramePort> => {
  let client: Promise<Context.Service.Shape<typeof RuntimeFramePort>> | undefined

  const connect = Effect.tryPromise({
    try: () => {
      if (client !== undefined) return client
      const connecting = Effect.runPromise(openFrame(runtimeOrigin)).then((port) =>
        makeRuntimeFrameClient(port, options)
      )
      client = connecting
      connecting.catch(() => {
        if (client === connecting) client = undefined
      })
      return connecting
    },
    catch: (cause) => new RuntimeFrameUnavailableError({ cause }),
  })

  return {
    load: (kind) => Stream.unwrap(Effect.map(connect, (frame) => frame.load(kind))),
    boot: (snapshot) => Effect.flatMap(connect, (frame) => frame.boot(snapshot)),
  }
}

const KOTLIN_ARTIFACTS_PATH = 'artifacts/kotlin/'

const kotlinCompilerOf = (url: string, registryIndexUrl: string): KotlinCompilerClient =>
  makeKotlinCompilerClient({
    url,
    cache: makePrecompiledCompileCache({
      artifactsUrl: new URL(KOTLIN_ARTIFACTS_PATH, new URL(registryIndexUrl, window.location.href)).href,
      cache: isEmbedPath(window.location.pathname)
        ? makeMemoryCompileCache(RuntimeLimit.COMPILE_CACHE_BYTES)
        : makeIndexedDbCompileCache({ maxBytes: RuntimeLimit.COMPILE_CACHE_BYTES }),
    }),
  })

export const RuntimeFrameIframeLayer = Layer.effect(
  RuntimeFramePort,
  Effect.map(AppConfig, (config) =>
    makeRuntimeFrameIframe(
      config.runtimeOrigin,
      config.kotlinCompilerUrl === undefined
        ? {}
        : { kotlinCompiler: kotlinCompilerOf(config.kotlinCompilerUrl, config.registryIndexUrl) }
    )
  )
)
