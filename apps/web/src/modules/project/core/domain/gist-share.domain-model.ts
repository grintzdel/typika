import { ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { GistUnavailableError } from './errors/gist-unavailable.error.ts'
import type { ProjectFiles } from './project.domain-model.ts'

export const GIST_SHARE_FILE = 'typika.share.json'
export const GIST_SHARE_VERSION = 1
const PATH_SEPARATOR = '__'

export const GistShareSchema = Schema.Struct({
  v: Schema.Number,
  n: Schema.String,
  o: Schema.optionalKey(Schema.String),
  r: Schema.String,
  x: Schema.optionalKey(Schema.String),
  files: Schema.Record(Schema.String, Schema.String),
  blank: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
})
export type GistShare = Schema.Schema.Type<typeof GistShareSchema>

export type GistSharedProject = {
  readonly name: string
  readonly ref: string | undefined
  readonly exercise: string | undefined
  readonly files: ProjectFiles
}

export type GistLink = { readonly id: string; readonly url: string; readonly htmlUrl: string }

const decodeShare = Schema.decodeUnknownOption(Schema.fromJsonString(GistShareSchema))
const decodePath = Schema.decodeUnknownOption(ProjectPathSchema)

export const gistPathOf = (gistId: string): string => `/g/${gistId}`

export const gistDescriptionOf = (name: string): string => `${name} — Typika`

const gistFileNameOf = (path: string, taken: ReadonlySet<string>) => {
  const flat = path.replaceAll('/', PATH_SEPARATOR)
  let name = flat
  for (let suffix = 2; taken.has(name) || name === GIST_SHARE_FILE; suffix++) name = `${flat}~${suffix}`
  return name
}

export const gistFilesOf = ({
  name,
  ref,
  runtime,
  exercise,
  files,
}: {
  readonly name: string
  readonly ref: string | undefined
  readonly runtime: string
  readonly exercise: string | undefined
  readonly files: ReadonlyMap<string, string>
}): ReadonlyMap<string, string> => {
  const names = new Map<string, string>()
  const blank: Record<string, string> = {}
  const taken = new Set<string>()
  for (const [path, content] of [...files].toSorted(([a], [b]) => (a < b ? -1 : 1))) {
    // The gist API refuses a file without visible content.
    if (content.trim() === '') {
      blank[path] = content
      continue
    }
    const fileName = gistFileNameOf(path, taken)
    taken.add(fileName)
    names.set(fileName, path)
  }
  const share: GistShare = {
    v: GIST_SHARE_VERSION,
    n: name,
    ...(ref === undefined ? {} : { o: ref }),
    r: runtime,
    ...(exercise === undefined ? {} : { x: exercise }),
    files: Object.fromEntries(names),
    ...(Object.keys(blank).length === 0 ? {} : { blank }),
  }
  return new Map([
    ...[...names].map(([fileName, path]) => [fileName, files.get(path) ?? ''] as const),
    [GIST_SHARE_FILE, `${JSON.stringify(share, null, 2)}\n`],
  ])
}

export const projectOfGistFiles = (
  gistFiles: ReadonlyMap<string, string>
): Effect.Effect<GistSharedProject, GistUnavailableError> =>
  Effect.gen(function* () {
    const share = decodeShare(gistFiles.get(GIST_SHARE_FILE))
    if (Option.isNone(share)) return yield* new GistUnavailableError({ reason: 'invalid' })
    if (share.value.v > GIST_SHARE_VERSION) return yield* new GistUnavailableError({ reason: 'newer' })
    const entries = [
      ...Object.entries(share.value.files).map(([fileName, path]) => [path, gistFiles.get(fileName)] as const),
      ...Object.entries(share.value.blank ?? {}),
    ]
    if (entries.some(([, content]) => content === undefined))
      return yield* new GistUnavailableError({ reason: 'invalid' })
    return {
      name: share.value.n,
      ref: share.value.o,
      exercise: share.value.x,
      files: new Map(
        entries.flatMap(([path, content]) =>
          Option.match(decodePath(path), {
            onNone: () => [],
            onSome: (valid) => [[valid, content ?? ''] as const],
          })
        )
      ),
    }
  })
