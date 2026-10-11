import { describe, expect, it } from 'vitest'

import {
  appContentSecurityPolicy,
  appHeaders,
  inlineScriptHashes,
  isIsolatedPath,
  runtimeContentSecurityPolicy,
} from './security-headers.ts'

describe('isIsolatedPath', () => {
  it('isolates the sandbox routes and their children', () => {
    expect(['/play/strategy-ts', '/p/1', '/compare', '/s', '/s/x'].every(isIsolatedPath)).toBe(true)
  })

  it('leaves the other routes alone, even with a matching prefix', () => {
    expect(['/', '/projects', '/plays', '/templates', '/config.json'].some(isIsolatedPath)).toBe(false)
  })
})

describe('appHeaders', () => {
  it('adds the isolation headers on isolated routes only', () => {
    expect(appHeaders('/play/strategy-ts')).toMatchObject({
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    })
    expect(appHeaders('/')).not.toHaveProperty('Cross-Origin-Opener-Policy')
  })

  it('lets an isolated page start a worker from any script of the app', () => {
    for (const script of ['/assets/language-service.worker-Bx1.js', '/src/editor/language-service.worker.ts']) {
      expect(appHeaders(script)).toHaveProperty('Cross-Origin-Embedder-Policy', 'require-corp')
      expect(appHeaders(script)).not.toHaveProperty('Cross-Origin-Opener-Policy')
    }
    expect(appHeaders('/templates')).not.toHaveProperty('Cross-Origin-Embedder-Policy')
  })
})

describe('appContentSecurityPolicy', () => {
  const policy = appContentSecurityPolicy({
    runtimeOrigin: 'https://run.example.net',
    scriptHashes: ["'sha256-abc'"],
  })

  it('only frames the runtime origin and is never framed', () => {
    expect(policy).toContain('frame-src https://run.example.net;')
    expect(policy).toContain("frame-ancestors 'none'")
  })

  it('allows the inline scripts of the shell by hash, not every inline script', () => {
    expect(policy).toContain("script-src 'self' 'sha256-abc';")
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/)
  })
})

describe('runtimeContentSecurityPolicy', () => {
  it('lets the frame load packages from the CDN but nothing else from the network', () => {
    const policy = runtimeContentSecurityPolicy({ packageOrigin: 'https://cdn.example.com' })

    expect(policy).toContain("connect-src 'self' https://cdn.example.com;")
    expect(policy).toMatch(/script-src [^;]*'wasm-unsafe-eval'[^;]*blob: https:\/\/cdn\.example\.com;/)
    expect(policy).toContain('frame-ancestors *')
  })
})

describe('inlineScriptHashes', () => {
  it('hashes the content of the inline scripts and skips the external ones', () => {
    const html = '<script>alert(1)</script><script type="module" src="/a.js"></script><script data-x="">b()</script>'

    expect(inlineScriptHashes(html)).toEqual([
      "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='",
      "'sha256-cf242PFc/kb7xD0Qzhsmd9vvRkc+cWFmbi+k+YvtdKc='",
    ])
  })
})
