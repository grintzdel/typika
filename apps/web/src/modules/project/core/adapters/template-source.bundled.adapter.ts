import { MANIFEST_FILE, parseManifest, parseTemplateRef } from '@typika/manifest'
import * as Arr from 'effect/Array'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import { ProjectTemplateNotFoundError } from '../domain/errors/project-template-not-found.error.ts'
import { TemplateSourcePort } from '../ports/template-source.port.ts'

const MANIFEST_SUFFIX = `/${MANIFEST_FILE}`
const OFFICIAL_OWNER = 'typika'
const OFFICIAL_REPO = 'templates'

const nameOf = (toml: string) =>
  parseManifest(toml).pipe(
    Effect.map((manifest) => manifest.name),
    Effect.option
  )

export const makeTemplateSourceBundled = (
  sources: Readonly<Record<string, string>>
): Context.Service.Shape<typeof TemplateSourcePort> => {
  const roots = Object.keys(sources)
    .filter((path) => path.endsWith(MANIFEST_SUFFIX))
    .map((path) => path.slice(0, -MANIFEST_FILE.length))

  const filesUnder = (root: string) =>
    new Map(
      Object.entries(sources)
        .filter(([path]) => path.startsWith(root))
        .map(([path, content]) => [path.slice(root.length), content])
    )

  const officialRoot = (ref: string) =>
    Option.flatMap(parseTemplateRef(ref), ({ owner, repo, path }) =>
      owner === OFFICIAL_OWNER && repo === OFFICIAL_REPO && path !== undefined
        ? Option.fromNullishOr(roots.find((root) => root.endsWith(`/${OFFICIAL_REPO}/${path}/`)))
        : Option.none()
    )

  return {
    load: (name) =>
      Effect.gen(function* () {
        for (const root of roots) {
          const found = yield* nameOf(sources[`${root}${MANIFEST_FILE}`] ?? '')
          if (Option.contains(found, name)) return filesUnder(root)
        }
        return yield* new ProjectTemplateNotFoundError({ name })
      }),
    names: Effect.forEach(roots, (root) => nameOf(sources[`${root}${MANIFEST_FILE}`] ?? '')).pipe(
      Effect.map((names) => Arr.getSomes(names).toSorted())
    ),
    resolveRef: (ref) =>
      Effect.gen(function* () {
        const root = officialRoot(ref)
        const name = Option.isSome(root) ? yield* nameOf(sources[`${root.value}${MANIFEST_FILE}`] ?? '') : Option.none()
        if (Option.isNone(name)) return yield* new ProjectTemplateNotFoundError({ name: ref })
        return name.value
      }),
  }
}

export const TemplateSourceBundledLayer = Layer.succeed(
  TemplateSourcePort,
  makeTemplateSourceBundled(
    import.meta.glob<string>('../../../../../../../templates/**/*', { query: '?raw', import: 'default', eager: true })
  )
)
