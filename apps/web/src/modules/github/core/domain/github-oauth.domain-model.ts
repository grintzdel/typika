import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

export const GITHUB_CALLBACK_PATH = '/auth/github/callback'
export const GITHUB_TOKEN_PATH = '/api/github/token'
export const GITHUB_REVOKE_PATH = '/settings/applications'

export const GitHubScope = {
  GIST: 'gist',
  PUBLIC_REPO: 'public_repo',
} as const
export type GitHubScope = (typeof GitHubScope)[keyof typeof GitHubScope]

export const GitHubSessionSchema = Schema.Struct({
  accessToken: Schema.String,
  scopes: Schema.Array(Schema.String),
})
export type GitHubSession = typeof GitHubSessionSchema.Type

export const PendingAuthorizationSchema = Schema.Struct({
  state: Schema.String,
  codeVerifier: Schema.String,
  returnTo: Schema.String,
  intent: Schema.String,
})
export type PendingAuthorization = typeof PendingAuthorizationSchema.Type

export type GitHubStatus = {
  readonly isEnabled: boolean
  readonly isConnected: boolean
  readonly scopes: ReadonlyArray<string>
  readonly revokeUrl: string | undefined
}

export const hasScopes = (granted: ReadonlyArray<string>, required: ReadonlyArray<GitHubScope>): boolean =>
  required.every((scope) => granted.includes(scope))

const toBase64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

export const randomToken = (): string => toBase64Url(crypto.getRandomValues(new Uint8Array(32)))

export const codeChallengeOf = (codeVerifier: string): Effect.Effect<string> =>
  Effect.promise(async () =>
    toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))))
  )

// Browsers read `/\host` as `//host`.
export const returnPathOf = (path: string): string => (/^\/(?![/\\])/.test(path) ? path : '/')

export const authorizeUrlOf = ({
  githubUrl,
  clientId,
  appOrigin,
  scopes,
  state,
  codeChallenge,
}: {
  readonly githubUrl: string
  readonly clientId: string
  readonly appOrigin: string
  readonly scopes: ReadonlyArray<string>
  readonly state: string
  readonly codeChallenge: string
}): string => {
  const url = new URL(`${githubUrl}/login/oauth/authorize`)
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appOrigin}${GITHUB_CALLBACK_PATH}`,
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString()
  return url.href
}
