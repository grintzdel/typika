import * as Effect from 'effect/Effect'

import { checkWorkspace, type CheckWorkspaceOptions } from '../check-workspace/check-workspace.ts'
import { ManifestInvalidError } from '../domain/errors/manifest-invalid.error.ts'
import { ManifestNotFoundError } from '../domain/errors/manifest-not-found.error.ts'
import type { ManifestIssue } from '../domain/manifest-issue.domain-model.ts'
import type { Manifest } from '../domain/manifest.domain-model.ts'
import type { TemplateFiles } from '../domain/template-files.domain-model.ts'
import type { TourStep } from '../domain/tour-step.domain-model.ts'
import { parseManifest } from '../parse-manifest/parse-manifest.ts'

export const MANIFEST_FILE = 'typika.toml'

export type ValidTemplate = {
  readonly manifest: Manifest
  readonly tourSteps: ReadonlyArray<TourStep>
  readonly warnings: ReadonlyArray<ManifestIssue>
}

export const validateTemplate = (
  files: TemplateFiles,
  options: CheckWorkspaceOptions = {}
): Effect.Effect<ValidTemplate, ManifestInvalidError | ManifestNotFoundError> =>
  Effect.gen(function* () {
    const source = files.get(MANIFEST_FILE)
    if (source === undefined) return yield* new ManifestNotFoundError()
    const manifest = yield* parseManifest(typeof source === 'string' ? source : new TextDecoder().decode(source))
    const report = yield* checkWorkspace(manifest, files, options)
    return { manifest, ...report }
  })
