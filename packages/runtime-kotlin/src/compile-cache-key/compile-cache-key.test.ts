import { describe, expect, it } from 'vitest'

import type { KotlinCompileRequest } from '../domain/compile-protocol.domain-model.ts'
import { KotlinCompileMode } from '../domain/constants/kotlin-compile-mode.constant.ts'
import { compileCacheKey } from './compile-cache-key.ts'

const request = (overrides: Partial<KotlinCompileRequest> = {}): KotlinCompileRequest => ({
  protocol: 1,
  target: 'js',
  kotlinVersion: '2.4',
  mode: KotlinCompileMode.TEST,
  files: [
    { path: 'src/main/kotlin/A.kt', content: 'class A' },
    { path: 'src/main/kotlin/B.kt', content: 'class B' },
  ],
  ...overrides,
})

describe('compileCacheKey', () => {
  it('is a SHA-256 in hexadecimal', async () => {
    expect(await compileCacheKey(request())).toMatch(/^[0-9a-f]{64}$/)
  })

  it('does not depend on the order of the files', async () => {
    const reversed = request({ files: request().files.toReversed() })

    expect(await compileCacheKey(reversed)).toBe(await compileCacheKey(request()))
  })

  it.each([
    ['mode', { mode: KotlinCompileMode.RUN }],
    ['Kotlin version', { kotlinVersion: '2.5' }],
    ['protocol', { protocol: 2 }],
    ['file content', { files: [{ path: 'src/main/kotlin/A.kt', content: 'class A2' }] }],
    ['file path', { files: [{ path: 'src/main/kotlin/C.kt', content: 'class A' }] }],
  ])('changes with the %s', async (_, overrides) => {
    expect(await compileCacheKey(request(overrides))).not.toBe(await compileCacheKey(request()))
  })
})
