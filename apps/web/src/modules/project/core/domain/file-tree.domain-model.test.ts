import { describe, expect, it } from 'vitest'

import { buildFileTree } from './file-tree.domain-model.ts'

describe('buildFileTree', () => {
  it('nests files under their folders, folders first, then by name', () => {
    expect(buildFileTree(['src/b.ts', 'README.md', 'src/a/x.ts', 'LICENSE', 'src/a.ts'])).toEqual([
      {
        _tag: 'Folder',
        name: 'src',
        path: 'src',
        children: [
          { _tag: 'Folder', name: 'a', path: 'src/a', children: [{ _tag: 'File', name: 'x.ts', path: 'src/a/x.ts' }] },
          { _tag: 'File', name: 'a.ts', path: 'src/a.ts' },
          { _tag: 'File', name: 'b.ts', path: 'src/b.ts' },
        ],
      },
      { _tag: 'File', name: 'LICENSE', path: 'LICENSE' },
      { _tag: 'File', name: 'README.md', path: 'README.md' },
    ])
  })
})
