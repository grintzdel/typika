import * as Data from 'effect/Data'

export class ManifestNotFoundError extends Data.TaggedError('ManifestNotFoundError')<{}> {}
