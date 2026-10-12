import { MANIFEST_FILE, parseManifest, parseTemplateRef } from '@typika/manifest'
import * as Arr from 'effect/Array'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import { ProjectFilesUnavailableError } from '../domain/errors/project-files-unavailable.error.ts'
import { entryOfManifest } from '../domain/template-entry.domain-model.ts'
import { TemplateFilesPort } from '../ports/template-files.port.ts'
import { TemplateIndexPort } from '../ports/template-index.port.ts'

const MANIFEST_SUFFIX = `/${MANIFEST_FILE}`
const OFFICIAL_OWNER = 'typika'
const OFFICIAL_REPO = 'templates'
const ROOT_PREFIX = `/${OFFICIAL_REPO}/`

const refOf = (root: string) =>
  `github:${OFFICIAL_OWNER}/${OFFICIAL_REPO}/${root.slice(root.lastIndexOf(ROOT_PREFIX) + ROOT_PREFIX.length, -1)}`

export type BundledTemplateSource = {
  readonly index: Context.Service.Shape<typeof TemplateIndexPort>
  readonly files: Context.Service.Shape<typeof TemplateFilesPort>
}

export const makeTemplateSourceBundled = (sources: Readonly<Record<string, string>>): BundledTemplateSource => {
  const roots = Object.keys(sources)
    .filter((path) => path.endsWith(MANIFEST_SUFFIX) && path.includes(ROOT_PREFIX))
    .map((path) => path.slice(0, -MANIFEST_FILE.length))

  const filesUnder = (root: string) =>
    new Map(
      Object.entries(sources)
        .filter(([path]) => path.startsWith(root))
        .map(([path, content]) => [path.slice(root.length), content])
    )

  const rootOf = (ref: string) =>
    Option.flatMap(parseTemplateRef(ref), ({ owner, repo, path }) =>
      owner === OFFICIAL_OWNER && repo === OFFICIAL_REPO && path !== undefined
        ? Option.fromNullishOr(roots.find((root) => root.endsWith(`${ROOT_PREFIX}${path}/`)))
        : Option.none()
    )

  return {
    index: {
      entries: Effect.forEach(roots, (root) =>
        parseManifest(sources[`${root}${MANIFEST_FILE}`] ?? '').pipe(
          Effect.map((manifest) => entryOfManifest(manifest, refOf(root))),
          Effect.option
        )
      ).pipe(Effect.map((entries) => Arr.getSomes(entries).toSorted((a, b) => a.name.localeCompare(b.name)))),
    },
    files: {
      load: (ref) =>
        Option.match(rootOf(ref), {
          onNone: () => Effect.fail(new ProjectFilesUnavailableError({ ref, reason: 'not embedded' })),
          onSome: (root) => Effect.succeed(filesUnder(root)),
        }),
    },
  }
}

export const makeTemplateSourceBundledLayer = (source: BundledTemplateSource) =>
  Layer.mergeAll(Layer.succeed(TemplateIndexPort, source.index), Layer.succeed(TemplateFilesPort, source.files))

export const TemplateSourceBundledLayer = makeTemplateSourceBundledLayer(
  makeTemplateSourceBundled(
    import.meta.glob<string>('../../../../../../../templates/**/*', { query: '?raw', import: 'default', eager: true })
  )
)
