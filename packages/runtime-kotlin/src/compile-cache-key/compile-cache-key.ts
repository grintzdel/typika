import type { KotlinCompileRequest } from '../domain/compile-protocol.domain-model.ts'

const encoder = new TextEncoder()

export const compileCacheKey = async (request: KotlinCompileRequest): Promise<string> => {
  const files = request.files.toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const canonical = JSON.stringify([request.protocol, request.target, request.kotlinVersion, request.mode, files])
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonical))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
