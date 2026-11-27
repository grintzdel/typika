import { describe, expect, it } from 'vitest'

import { FileChangeType, watchedFileChanges } from './watched-file-changes.ts'

describe('watchedFileChanges', () => {
  it('reports created, changed and deleted files under the root', () => {
    const previous = new Map([
      ['go.mod', 'module shop'],
      ['main.go', 'package main'],
      ['old.go', 'package main'],
    ])
    const next = new Map([
      ['go.mod', 'module shop'],
      ['main.go', 'package main\n'],
      ['new.go', 'package main'],
    ])

    expect(watchedFileChanges('/work', previous, next)).toEqual([
      { uri: 'file:///work/main.go', type: FileChangeType.CHANGED },
      { uri: 'file:///work/new.go', type: FileChangeType.CREATED },
      { uri: 'file:///work/old.go', type: FileChangeType.DELETED },
    ])
  })

  it('compares binary content by bytes', () => {
    const previous = new Map([['data.bin', new Uint8Array([1, 2])]])

    expect(watchedFileChanges('/work', previous, new Map([['data.bin', new Uint8Array([1, 2])]]))).toEqual([])
    expect(watchedFileChanges('/work', previous, new Map([['data.bin', new Uint8Array([1, 3])]]))).toEqual([
      { uri: 'file:///work/data.bin', type: FileChangeType.CHANGED },
    ])
  })

  it('encodes the path into the URI', () => {
    expect(watchedFileChanges('/work', new Map(), new Map([['docs/a b.go', '']]))).toEqual([
      { uri: 'file:///work/docs/a%20b.go', type: FileChangeType.CREATED },
    ])
  })
})
