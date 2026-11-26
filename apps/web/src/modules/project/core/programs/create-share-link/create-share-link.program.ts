import * as Effect from 'effect/Effect'

import type { TemplateProject } from '../../domain/project.domain-model.ts'
import { encodeSharePayload, shareDeltaOf, shareLinkOf } from '../../domain/share-link.domain-model.ts'

export const createShareLinkProgram = ({
  project,
  files,
  origin,
}: {
  readonly project: TemplateProject
  readonly files: ReadonlyMap<string, string>
  readonly origin: string
}) =>
  Effect.map(
    encodeSharePayload(
      project.origin.kind === 'personal'
        ? { n: project.name, r: project.manifest.runtime.kind, f: Object.fromEntries(files) }
        : {
            n: project.name,
            o: project.ref,
            r: project.manifest.runtime.kind,
            ...(project.exercise === undefined ? {} : { x: project.exercise.name }),
            d: shareDeltaOf(project.templateFiles, files),
          }
    ),
    (encoded) => shareLinkOf(origin, encoded)
  )
