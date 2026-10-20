import { gunzipSync } from 'node:zlib'

import { parseTemplateRef, type TemplateFiles } from '@typika/manifest'
import { RegistryIndexSchema, type RegistryIndex } from '@typika/registry-tools/index-schema'
import { contentOf } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { IndexInvalidError } from '../domain/errors/index-invalid.error.ts'
import { NetworkError } from '../domain/errors/network.error.ts'
import { TemplateNotFoundError } from '../domain/errors/template-not-found.error.ts'
import { readTar } from '../read-tar/read-tar.ts'

export const DEFAULT_INDEX_URL = 'https://typika.dev/registry/index.json'
export const DEFAULT_ARCHIVE_URL_TEMPLATE = 'https://codeload.github.com/{owner}/{repo}/tar.gz/{ref}'

export type TemplateSource = {
  readonly index: Effect.Effect<RegistryIndex, NetworkError | IndexInvalidError>
  readonly files: (ref: string) => Effect.Effect<TemplateFiles, TemplateNotFoundError | NetworkError>
}

export type TemplateSourceOptions = {
  readonly indexUrl: string
  readonly archiveUrlTemplate: string
  readonly fetch?: typeof globalThis.fetch
}

const reasonOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

export const archiveUrlOf = (template: string, owner: string, repo: string, ref: string): string =>
  template
    .replaceAll('{owner}', encodeURIComponent(owner))
    .replaceAll('{repo}', encodeURIComponent(repo))
    .replaceAll('{ref}', encodeURIComponent(ref))

const filesUnder = (archive: Uint8Array, path: string | undefined): TemplateFiles => {
  const prefix = path === undefined ? '' : `${path}/`
  return new Map(
    readTar(archive)
      .map(({ path: entry, content }) => [entry.slice(entry.indexOf('/') + 1), content] as const)
      .filter(([file]) => file.startsWith(prefix) && file.length > prefix.length)
      .map(([file, content]) => [file.slice(prefix.length), contentOf(content)] as const)
  )
}

export const makeTemplateSource = ({
  indexUrl,
  archiveUrlTemplate,
  fetch = globalThis.fetch,
}: TemplateSourceOptions): TemplateSource => {
  const download = (url: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(url)
        return { status: response.status, ok: response.ok, body: new Uint8Array(await response.arrayBuffer()) }
      },
      catch: (cause) => new NetworkError({ url, reason: reasonOf(cause) }),
    })
  const archives = new Map<string, Effect.Effect<Uint8Array | undefined, NetworkError>>()
  const archiveAt = (url: string) => {
    const cached =
      archives.get(url) ??
      Effect.runSync(
        Effect.cached(
          Effect.flatMap(download(url), ({ status, ok, body }) => {
            if (status === 404) return Effect.succeed(undefined)
            if (!ok) return Effect.fail(new NetworkError({ url, reason: `HTTP ${status}` }))
            return Effect.try({
              try: () => new Uint8Array(gunzipSync(body)),
              catch: (cause) => new NetworkError({ url, reason: `unreadable archive: ${reasonOf(cause)}` }),
            })
          })
        )
      )
    archives.set(url, cached)
    return cached
  }
  return {
    index: Effect.runSync(
      Effect.cached(
        Effect.gen(function* () {
          const { status, ok, body } = yield* download(indexUrl)
          if (!ok) return yield* new NetworkError({ url: indexUrl, reason: `HTTP ${status}` })
          return yield* Effect.try({
            try: () => JSON.parse(new TextDecoder().decode(body)) as unknown,
            catch: () => new IndexInvalidError({ url: indexUrl }),
          }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(RegistryIndexSchema)),
            Effect.mapError((error) =>
              error._tag === 'IndexInvalidError' ? error : new IndexInvalidError({ url: indexUrl })
            )
          )
        })
      )
    ),
    files: (ref) =>
      Effect.gen(function* () {
        const parsed = Option.getOrUndefined(parseTemplateRef(ref))
        if (parsed === undefined) return yield* new TemplateNotFoundError({ template: ref })
        const archive = yield* archiveAt(
          archiveUrlOf(archiveUrlTemplate, parsed.owner, parsed.repo, parsed.ref ?? 'HEAD')
        )
        const files = archive === undefined ? new Map() : filesUnder(archive, parsed.path)
        if (files.size === 0) return yield* new TemplateNotFoundError({ template: ref })
        return files
      }),
  }
}
