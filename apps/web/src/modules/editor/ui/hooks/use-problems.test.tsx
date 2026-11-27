import { renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { makeLanguageServiceSessionInMemory } from '../../core/editor.test-layer.ts'
import { useProblems } from './use-problems.ts'

const FILES = {
  'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true, allowImportingTsExtensions: true } }),
  'src/main.ts': 'export const total: number = 1\n',
}

const BROKEN = "export const total: number = 'free'\n"

describe('useProblems', () => {
  it('lists the problems of the project and follows its edits', async () => {
    const session = makeLanguageServiceSessionInMemory(FILES)
    const { result, rerender } = renderHook(
      ({ revision }: { readonly revision: number }) =>
        useProblems({ session, revision, build: [], contentOf: () => '' }),
      { initialProps: { revision: 0 } }
    )
    await waitFor(() => expect(result.current.isChecked).toBe(true))
    expect(result.current.problems).toEqual([])

    await session.updateFile('src/main.ts', BROKEN).pipe(Effect.runPromise)
    rerender({ revision: 1 })

    await waitFor(() =>
      expect(result.current.problems).toEqual([
        expect.objectContaining({ path: 'src/main.ts', line: 1, column: 14, severity: 'error' }),
      ])
    )
    expect(result.current.counts).toEqual({ errors: 1, warnings: 0 })
  })

  it('lists again the problems a language service publishes after an edit', async () => {
    const watchers = new Set<(path: string) => void>()
    const session = {
      ...makeLanguageServiceSessionInMemory(FILES),
      watchDiagnostics: (listener: (path: string) => void) => {
        watchers.add(listener)
        return () => void watchers.delete(listener)
      },
    }
    const { result } = renderHook(() => useProblems({ session, revision: 0, build: [], contentOf: () => '' }))
    await waitFor(() => expect(result.current.isChecked).toBe(true))

    await session.updateFile('src/main.ts', BROKEN).pipe(Effect.runPromise)
    for (const watcher of watchers) watcher('src/main.ts')

    await waitFor(() => expect(result.current.counts).toEqual({ errors: 1, warnings: 0 }))
  })

  it('lists the build problems without a language service', () => {
    const { result } = renderHook(() =>
      useProblems({
        session: undefined,
        revision: 0,
        build: [{ severity: 'error', message: 'undefined: fmt', location: { file: 'main.go', line: 1, column: 1 } }],
        contentOf: () => 'fmt\n',
      })
    )

    expect(result.current.problems).toEqual([
      { path: 'main.go', line: 1, column: 1, from: 0, to: 0, severity: 'error', message: 'undefined: fmt' },
    ])
  })
})
