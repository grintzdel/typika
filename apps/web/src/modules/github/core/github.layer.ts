import * as Layer from 'effect/Layer'

import { SharedLayer } from '../../shared/core/shared.layer.ts'
import { GitHubGistFetchLayer } from './adapters/github-gist.fetch.adapter.ts'
import { GitHubSessionStorageLayer } from './adapters/github-session.storage.adapter.ts'
import { GitHubTokenFetchLayer } from './adapters/github-token.fetch.adapter.ts'

export const GitHubLayer = Layer.mergeAll(
  GitHubSessionStorageLayer,
  GitHubTokenFetchLayer,
  GitHubGistFetchLayer.pipe(Layer.provide(SharedLayer)),
  SharedLayer
)
