import * as Data from 'effect/Data'

export class RuntimeAssetLoadError extends Data.TaggedError('RuntimeAssetLoadError')<{
  readonly asset: string
  readonly cause: unknown
}> {}
