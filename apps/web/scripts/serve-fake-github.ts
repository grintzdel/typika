import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { argv } from 'node:process'

import { FAKE_GITHUB_ENV } from '../src/e2e/fixtures/fake-github.fixture.ts'

type GistFile = { readonly filename: string; readonly content: string; readonly truncated: boolean }
type Gist = { readonly id: string; readonly html_url: string; files: Record<string, GistFile> }

const port = Number(argv[2] ?? '3090')
const origin = `http://127.0.0.1:${port}`
const challenges = new Map<string, { readonly challenge: string; readonly scope: string }>()
const tokens = new Set<string>()
const gists = new Map<string, Gist>()

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json', ...CORS })
  response.end(JSON.stringify(body))
}

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Array<Uint8Array> = []
  for await (const chunk of request) if (chunk instanceof Uint8Array) chunks.push(chunk)
  const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

const authorize = (url: URL, response: ServerResponse) => {
  const redirect = new URL(url.searchParams.get('redirect_uri') ?? '')
  const code = randomBytes(8).toString('hex')
  challenges.set(code, {
    challenge: url.searchParams.get('code_challenge') ?? '',
    scope: (url.searchParams.get('scope') ?? '').split(' ').join(','),
  })
  redirect.searchParams.set('code', code)
  redirect.searchParams.set('state', url.searchParams.get('state') ?? '')
  response.writeHead(302, { Location: redirect.href })
  response.end()
}

const exchange = async (request: IncomingMessage, response: ServerResponse) => {
  const body = await readJson(request)
  const granted = challenges.get(String(body.code))
  challenges.delete(String(body.code))
  const challenge = createHash('sha256').update(String(body.code_verifier)).digest('base64url')
  if (
    granted === undefined ||
    granted.challenge !== challenge ||
    body.client_id !== FAKE_GITHUB_ENV.GITHUB_CLIENT_ID ||
    body.client_secret !== FAKE_GITHUB_ENV.GITHUB_CLIENT_SECRET
  )
    return json(response, 200, { error: 'bad_verification_code' })
  const token = `gho_${randomBytes(8).toString('hex')}`
  tokens.add(token)
  return json(response, 200, { access_token: token, scope: granted.scope, token_type: 'bearer' })
}

const isSignedIn = (request: IncomingMessage) =>
  tokens.has((request.headers.authorization ?? '').replace('Bearer ', ''))

const writeGist = async (request: IncomingMessage, response: ServerResponse, id: string | undefined) => {
  if (!isSignedIn(request)) return json(response, 401, { message: 'Bad credentials' })
  const existing = id === undefined ? undefined : gists.get(id)
  if (id !== undefined && existing === undefined) return json(response, 404, { message: 'Not Found' })
  const body = await readJson(request)
  const files = { ...existing?.files }
  for (const [filename, file] of Object.entries((body.files ?? {}) as Record<string, { content?: string } | null>)) {
    if (file === null) delete files[filename]
    else if ((file.content ?? '').trim() === '') return json(response, 422, { message: 'Validation Failed' })
    else files[filename] = { filename, content: file.content ?? '', truncated: false }
  }
  const gistId = id ?? randomBytes(10).toString('hex')
  const gist = { id: gistId, html_url: `${origin}/gist/${gistId}`, files }
  gists.set(gistId, gist)
  return json(response, id === undefined ? 201 : 200, gist)
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', origin)
  const gistId = /^\/api\/gists\/([0-9a-f]+)$/.exec(url.pathname)?.[1]
  const route = `${request.method ?? 'GET'} ${gistId === undefined ? url.pathname : '/api/gists/:id'}`
  const handled = (() => {
    if (request.method === 'OPTIONS') return json(response, 204, undefined)
    if (route === 'GET /health') return json(response, 200, { ok: true })
    if (route === 'GET /login/oauth/authorize') return authorize(url, response)
    if (route === 'POST /login/oauth/access_token') return exchange(request, response)
    if (route === 'POST /api/gists') return writeGist(request, response, undefined)
    if (route === 'PATCH /api/gists/:id') return writeGist(request, response, gistId)
    if (route === 'GET /api/gists/:id') {
      const gist = gists.get(gistId ?? '')
      return gist === undefined ? json(response, 404, { message: 'Not Found' }) : json(response, 200, gist)
    }
    return json(response, 404, { message: 'Not Found' })
  })()
  void Promise.resolve(handled).catch(() => json(response, 400, { message: 'Bad Request' }))
})

server.listen(port, '127.0.0.1')
