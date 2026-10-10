import { renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { useOpenTemplate } from './use-open-template.ts'

const wrapper = makeRegistryWrapper(
  Layer.mergeAll(makeProjectTestLayer({ 'sample-ts': templateFiles() }), makeRuntimeTestLayer(makeFakeRuntime().port))
)

describe('useOpenTemplate', () => {
  it('exposes the template title, entry and file tree', async () => {
    const { result } = renderHook(() => useOpenTemplate('sample-ts'), { wrapper })

    await waitFor(() => expect(result.current.template).toBeDefined())
    expect(result.current.template?.title).toBe('Sample')
    expect(result.current.template?.entry).toBe('src/main.ts')
    expect(result.current.template?.tree.map((node) => node.name)).toEqual([
      'src',
      'tests',
      'LICENSE',
      'README.md',
      'typika.toml',
    ])
    expect(result.current.template?.contentOf('src/main.ts')).toBe("console.log('hello')\n")
  })

  it('reports a missing template', async () => {
    const { result } = renderHook(() => useOpenTemplate('missing-ts'), { wrapper })

    await waitFor(() => expect(result.current.failure).toEqual({ _tag: 'NotFound', name: 'missing-ts' }))
  })
})
