import * as Data from 'effect/Data'

export class ProjectManifestMissingError extends Data.TaggedError('ProjectManifestMissingError')<{
  readonly name: string
}> {}
