import { describe, expect, it } from 'vitest'

import { buildFileTree, isTypikaFile, TYPIKA_GROUP_PATH } from './file-tree.domain-model.ts'

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

  it('groups the Typika files after the others', () => {
    expect(buildFileTree(['typika.toml', 'tour/01-overview.md', 'src/main.ts', 'README.md'])).toEqual([
      { _tag: 'Folder', name: 'src', path: 'src', children: [{ _tag: 'File', name: 'main.ts', path: 'src/main.ts' }] },
      { _tag: 'File', name: 'README.md', path: 'README.md' },
      {
        _tag: 'Folder',
        name: 'Typika',
        path: TYPIKA_GROUP_PATH,
        children: [
          {
            _tag: 'Folder',
            name: 'tour',
            path: 'tour',
            children: [{ _tag: 'File', name: '01-overview.md', path: 'tour/01-overview.md' }],
          },
          { _tag: 'File', name: 'typika.toml', path: 'typika.toml' },
        ],
      },
    ])
  })
})

describe('isTypikaFile', () => {
  it('recognises the manifest and the tour', () => {
    expect(isTypikaFile('typika.toml')).toBe(true)
    expect(isTypikaFile('tour/01-overview.md')).toBe(true)
    expect(isTypikaFile('src/tour/step.ts')).toBe(false)
    expect(isTypikaFile('tours.md')).toBe(false)
  })
})
