import { SizeLimit, type TemplateFiles } from '@typika/manifest'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { DEFAULT_GITHUB_API_URL } from '../../../shared/core/public-config/public-config-from-env.ts'
import { GitHubApiError } from '../domain/errors/github-api.error.ts'
import { GitHubContentsPort } from '../ports/github-contents.port.ts'
import { makeGitHubApiCall } from './github-api.fetch.ts'

const CommitSchema = Schema.Struct({ sha: Schema.String })
const TreeSchema = Schema.Struct({
  truncated: Schema.Boolean,
  tree: Schema.Array(
    Schema.Struct({
      path: Schema.String,
      type: Schema.String,
      sha: Schema.String,
      size: Schema.optionalKey(Schema.Number),
    })
  ),
})
const BlobSchema = Schema.Struct({ content: Schema.String, encoding: Schema.String })

const CONCURRENT_BLOBS = 8
const MAX_BYTES = 2 * SizeLimit.TEXT_BYTES

const bytesOf = (base64: string) =>
  Uint8Array.from(atob(base64.replaceAll(/\s/g, '')), (char) => char.codePointAt(0) ?? 0)

const contentOf = (bytes: Uint8Array): string | Uint8Array => {
  if (bytes.includes(0)) return bytes
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return bytes
  }
}

export const makeGitHubContentsFetch = (
  apiUrl: string,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof GitHubContentsPort> => {
  const call = makeGitHubApiCall(apiUrl, fetchFn)
  return {
    readFolder: ({ owner, repo, path, ref }, accessToken) =>
      Effect.gen(function* () {
        const repository = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
        const commit = yield* call(
          CommitSchema,
          `${repository}/commits/${encodeURIComponent(ref ?? 'HEAD')}`,
          accessToken
        )
        const tree = yield* call(TreeSchema, `${repository}/git/trees/${commit.sha}?recursive=1`, accessToken)
        if (tree.truncated) return yield* new GitHubApiError({ reason: 'incomplete' })
        const prefix = path === undefined ? '' : `${path}/`
        const blobs = tree.tree.filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix))
        if (blobs.length === 0) return yield* new GitHubApiError({ reason: 'not-found' })
        const size = blobs.reduce((total, blob) => total + (blob.size ?? 0), 0)
        if (blobs.length > SizeLimit.FILES || size > MAX_BYTES)
          return yield* new GitHubApiError({ reason: 'incomplete' })
        const contents = yield* Effect.forEach(
          blobs,
          (blob) =>
            Effect.map(call(BlobSchema, `${repository}/git/blobs/${blob.sha}`, accessToken), (body) =>
              contentOf(body.encoding === 'base64' ? bytesOf(body.content) : new TextEncoder().encode(body.content))
            ),
          { concurrency: CONCURRENT_BLOBS }
        )
        const files: TemplateFiles = new Map(
          blobs.map((blob, index) => [blob.path.slice(prefix.length), contents[index] ?? ''])
        )
        return { commit: commit.sha, files }
      }),
  }
}

export const GitHubContentsFetchLayer = Layer.effect(
  GitHubContentsPort,
  Effect.map(AppConfig, (config) => makeGitHubContentsFetch(config.github?.apiUrl ?? DEFAULT_GITHUB_API_URL))
)
