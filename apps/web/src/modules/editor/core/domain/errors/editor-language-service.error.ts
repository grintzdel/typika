import * as Data from 'effect/Data'

export class EditorLanguageServiceError extends Data.TaggedError('EditorLanguageServiceError')<{
  readonly cause: unknown
}> {}
