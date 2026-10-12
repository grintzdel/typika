import { parseTemplateRef, type TemplateFiles, type TemplateRef } from '@typika/manifest'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { ProjectFilesUnavailableError } from '../domain/errors/project-files-unavailable.error.ts'
import { TemplateFilesPort } from '../ports/template-files.port.ts'

export type TemplateFileUrls = {
  readonly fileUrlTemplate: string
  readonly listingUrlTemplate: string
}

type PinnedRef = TemplateRef & { readonly ref: string }

const ListingSchema = Schema.Struct({ files: Schema.Array(Schema.Struct({ name: Schema.String })) })

const CONCURRENT_FILES = 8

export const fillUrlTemplate = (template: string, { owner, repo, ref }: PinnedRef, path = '') =>
  template
    .replaceAll('{owner}', encodeURIComponent(owner))
    .replaceAll('{repo}', encodeURIComponent(repo))
    .replaceAll('{ref}', encodeURIComponent(ref))
    .replaceAll('{path}', path.split('/').map(encodeURIComponent).join('/'))

const contentOf = (bytes: Uint8Array): string | Uint8Array => {
  if (bytes.includes(0)) return bytes
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return bytes
  }
}

export const makeTemplateFilesFetch = (
  urls: TemplateFileUrls,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof TemplateFilesPort> => {
  const cache = new Map<string, TemplateFiles>()

  const download = (ref: string, url: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetchFn(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return new Uint8Array(await response.arrayBuffer())
      },
      catch: (cause) => new ProjectFilesUnavailableError({ ref, reason: `Cannot load ${url}: ${String(cause)}` }),
    })

  const fetchFiles = (ref: string) =>
    Effect.gen(function* () {
      const parsed = Option.getOrUndefined(parseTemplateRef(ref))
      if (parsed?.ref === undefined)
        return yield* new ProjectFilesUnavailableError({ ref, reason: 'ref is not pinned' })
      const pinned = { ...parsed, ref: parsed.ref }
      const listingBytes = yield* download(ref, fillUrlTemplate(urls.listingUrlTemplate, pinned))
      const listing = yield* Effect.try({
        try: () => Schema.decodeUnknownSync(ListingSchema)(JSON.parse(new TextDecoder().decode(listingBytes))),
        catch: (cause) => new ProjectFilesUnavailableError({ ref, reason: `Invalid listing: ${String(cause)}` }),
      })
      const prefix = pinned.path === undefined ? '/' : `/${pinned.path}/`
      const paths = listing.files.map((file) => file.name).filter((name) => name.startsWith(prefix))
      if (paths.length === 0) return yield* new ProjectFilesUnavailableError({ ref, reason: 'no file at this ref' })
      const contents = yield* Effect.forEach(
        paths,
        (path) => download(ref, fillUrlTemplate(urls.fileUrlTemplate, pinned, path.slice(1))),
        { concurrency: CONCURRENT_FILES }
      )
      const files: TemplateFiles = new Map(
        paths.map((path, index) => [path.slice(prefix.length), contentOf(contents[index] ?? new Uint8Array())])
      )
      cache.set(ref, files)
      return files
    })

  return {
    load: (ref) =>
      Effect.suspend(() => {
        const cached = cache.get(ref)
        return cached === undefined ? fetchFiles(ref) : Effect.succeed(cached)
      }),
  }
}

export const TemplateFilesFetchLayer = Layer.effect(
  TemplateFilesPort,
  Effect.map(AppConfig, (config) =>
    makeTemplateFilesFetch({
      fileUrlTemplate: config.templateFileUrlTemplate,
      listingUrlTemplate: config.templateListingUrlTemplate,
    })
  )
)
