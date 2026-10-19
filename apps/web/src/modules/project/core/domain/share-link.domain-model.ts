import { ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { ShareLinkInvalidError } from './errors/share-link-invalid.error.ts'
import type { ProjectFiles } from './project.domain-model.ts'

export const SHARE_VERSION = 1
export const MAX_SHARE_URL_LENGTH = 8_000
const SHARE_PATH = '/s#'

export const SharePayloadSchema = Schema.Struct({
  n: Schema.String,
  o: Schema.optionalKey(Schema.String),
  r: Schema.String,
  x: Schema.optionalKey(Schema.String),
  f: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  d: Schema.optionalKey(Schema.Record(Schema.String, Schema.NullOr(Schema.String))),
})
export type SharePayload = Schema.Schema.Type<typeof SharePayloadSchema>

export type ShareDelta = Readonly<Record<string, string | null>>

export type ShareLink =
  | { readonly _tag: 'Ready'; readonly url: string }
  | { readonly _tag: 'TooLong'; readonly length: number; readonly max: number }

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(SharePayloadSchema))
const decodePath = Schema.decodeUnknownOption(ProjectPathSchema)

export const shareDeltaOf = (template: ReadonlyMap<string, string>, current: ReadonlyMap<string, string>): ShareDelta =>
  Object.fromEntries(
    [...new Set([...template.keys(), ...current.keys()])]
      .toSorted()
      .filter((path) => template.get(path) !== current.get(path))
      .map((path) => [path, current.get(path) ?? null])
  )

const projectEntries = (entries: ReadonlyArray<readonly [string, string | null]>) =>
  entries.flatMap(([path, content]) =>
    Option.match(decodePath(path), { onNone: () => [], onSome: (valid) => [[valid, content] as const] })
  )

export const applyShareDelta = (template: ProjectFiles, delta: ShareDelta): ProjectFiles => {
  const files = new Map(template)
  for (const [path, content] of projectEntries(Object.entries(delta))) {
    if (content === null) files.delete(path)
    else files.set(path, content)
  }
  return files
}

export const filesOfShare = (files: Readonly<Record<string, string>>): ProjectFiles =>
  new Map(
    projectEntries(Object.entries(files)).flatMap(([path, content]) => (content === null ? [] : [[path, content]]))
  )

const toBase64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.codePointAt(0) ?? 0)

const transformed = async (bytes: Uint8Array<ArrayBuffer>, transform: CompressionStream | DecompressionStream) => {
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start: (controller) => {
      controller.enqueue(bytes)
      controller.close()
    },
  })
  return new Uint8Array(await new Response(source.pipeThrough(transform)).arrayBuffer())
}

export const encodeSharePayload = (payload: SharePayload): Effect.Effect<string> =>
  Effect.promise(async () => {
    const json = new TextEncoder().encode(JSON.stringify(payload))
    return `${SHARE_VERSION}.${toBase64Url(await transformed(json, new CompressionStream('deflate-raw')))}`
  })

export const decodeSharePayload = (text: string): Effect.Effect<SharePayload, ShareLinkInvalidError> =>
  Effect.gen(function* () {
    const separator = text.indexOf('.')
    const version = Number(text.slice(0, separator))
    if (separator < 1 || !Number.isInteger(version)) return yield* new ShareLinkInvalidError({ reason: 'invalid' })
    if (version > SHARE_VERSION) return yield* new ShareLinkInvalidError({ reason: 'newer' })
    const json = yield* Effect.tryPromise({
      try: async () =>
        new TextDecoder('utf-8', { fatal: true }).decode(
          await transformed(fromBase64Url(text.slice(separator + 1)), new DecompressionStream('deflate-raw'))
        ),
      catch: () => new ShareLinkInvalidError({ reason: 'invalid' }),
    })
    const payload = decodeJson(json)
    if (Option.isNone(payload) || (payload.value.f === undefined && payload.value.d === undefined))
      return yield* new ShareLinkInvalidError({ reason: 'invalid' })
    return payload.value
  })

export const shareLinkOf = (origin: string, encoded: string): ShareLink => {
  const url = `${origin}${SHARE_PATH}${encoded}`
  return url.length > MAX_SHARE_URL_LENGTH
    ? { _tag: 'TooLong', length: url.length, max: MAX_SHARE_URL_LENGTH }
    : { _tag: 'Ready', url }
}

export const shareProjectIdOf = (encoded: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encoded)))
    const hex = Array.from(digest.subarray(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  })
