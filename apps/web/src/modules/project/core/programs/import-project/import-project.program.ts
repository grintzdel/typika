import { formatTemplateRef } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import type { GitHubApiError } from '../../../../github/core/domain/errors/github-api.error.ts'
import { GitHubContentsPort } from '../../../../github/core/ports/github-contents.port.ts'
import { GitHubSessionPort } from '../../../../github/core/ports/github-session.port.ts'
import { ProjectSourceInvalidError } from '../../domain/errors/project-source-invalid.error.ts'
import { ProjectSourceUnavailableError } from '../../domain/errors/project-source-unavailable.error.ts'
import {
  filesOfArchive,
  filesOfManifest,
  projectFilesOfImport,
  templateRefOfInput,
} from '../../domain/project-import.domain-model.ts'
import { entryForRef } from '../../domain/template-entry.domain-model.ts'
import { TemplateFilesPort } from '../../ports/template-files.port.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'
import { createPersonalProjectProgram } from '../create-project/create-project.program.ts'

const PINNED_LENGTH = 12

const reasonOf = (reason: GitHubApiError['reason']): ProjectSourceUnavailableError['reason'] => {
  if (reason === 'not-found' || reason === 'rate-limited') return reason
  return reason === 'incomplete' ? 'too-large' : 'unavailable'
}

export const importFromUrlProgram = (input: string) =>
  Effect.gen(function* () {
    const parsed = templateRefOfInput(input)
    if (Option.isNone(parsed)) return yield* new ProjectSourceInvalidError({ reason: 'url' })
    const ref = parsed.value
    const index = yield* TemplateIndexPort
    const entries = yield* index.entries.pipe(Effect.orElseSucceed(() => []))
    const entry = entryForRef(entries, formatTemplateRef(ref))
    if (entry !== undefined) {
      const source = yield* TemplateFilesPort
      const files = projectFilesOfImport(yield* source.load(entry.ref))
      return yield* createPersonalProjectProgram({ files, ref: entry.ref })
    }
    const contents = yield* GitHubContentsPort
    const sessions = yield* GitHubSessionPort
    const accessToken = Option.getOrUndefined(yield* sessions.session)?.accessToken
    const folder = yield* contents
      .readFolder(ref, accessToken)
      .pipe(Effect.mapError((error) => new ProjectSourceUnavailableError({ reason: reasonOf(error.reason) })))
    return yield* createPersonalProjectProgram({
      files: projectFilesOfImport(folder.files),
      ref: formatTemplateRef({ ...ref, ref: folder.commit.slice(0, PINNED_LENGTH) }),
    })
  })

export const importFileProgram = ({ fileName, bytes }: { readonly fileName: string; readonly bytes: Uint8Array }) =>
  Effect.gen(function* () {
    const files = fileName.toLowerCase().endsWith('.zip')
      ? projectFilesOfImport(yield* filesOfArchive(bytes))
      : yield* filesOfManifest(new TextDecoder().decode(bytes))
    return yield* createPersonalProjectProgram({ files })
  })
