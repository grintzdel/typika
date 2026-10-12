import { createHash } from 'node:crypto'

import { parseTemplateRef, type TemplateRef } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { RefUnresolvableError } from '../domain/errors/ref-unresolvable.error.ts'
import type { ResolveRef } from '../resolve-ref/resolve-ref.ts'

export type MirrorFile = { readonly path: string; readonly content: string | Uint8Array }

type ListedFile = { readonly name: string; readonly hash: string; readonly size: number }

const pinnedRepoOf = ({ owner, repo, ref }: TemplateRef & { readonly ref: string }) => `gh/${owner}/${repo}@${ref}`

const bytesOf = (content: string | Uint8Array) =>
  typeof content === 'string' ? new TextEncoder().encode(content) : content

const listed = (name: string, content: string | Uint8Array): ListedFile => {
  const bytes = bytesOf(content)
  return { name, hash: createHash('sha256').update(bytes).digest('base64'), size: bytes.byteLength }
}

export const mirrorTemplates = (templates: ReadonlyArray<{ readonly ref: string }>, resolve: ResolveRef) =>
  Effect.gen(function* () {
    const files: Array<MirrorFile> = []
    const listings = new Map<
      string,
      { readonly owner: string; readonly repo: string; readonly ref: string; readonly files: Array<ListedFile> }
    >()
    for (const template of templates) {
      const parsed = Option.getOrUndefined(parseTemplateRef(template.ref))
      if (parsed?.ref === undefined)
        return yield* new RefUnresolvableError({ reason: `${template.ref} is not a pinned ref` })
      const pinned = { ...parsed, ref: parsed.ref }
      const repoDir = pinnedRepoOf(pinned)
      const listing = listings.get(repoDir) ?? { owner: pinned.owner, repo: pinned.repo, ref: pinned.ref, files: [] }
      listings.set(repoDir, listing)
      for (const [file, content] of yield* resolve(pinned)) {
        const path = [pinned.path, file].filter((segment) => segment !== undefined).join('/')
        files.push({ path: `${repoDir}/${path}`, content })
        listing.files.push(listed(`/${path}`, content))
      }
    }
    for (const [repoDir, { owner, repo, ref, files: listedFiles }] of listings)
      files.push({
        path: `listing/${repoDir}.json`,
        content: JSON.stringify({
          type: 'gh',
          name: `${owner}/${repo}`,
          version: ref,
          default: null,
          files: listedFiles.toSorted((a, b) => (a.name < b.name ? -1 : 1)),
        }),
      })
    return files
  })
