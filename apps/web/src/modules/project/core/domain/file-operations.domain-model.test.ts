import { describe, expect, it } from 'vitest'

import {
  checkNewPath,
  creationFolderOf,
  FileNameIssue,
  isRenamable,
  movesOf,
  nameOf,
  parentOf,
} from './file-operations.domain-model.ts'
import { TYPIKA_GROUP_PATH } from './file-tree.domain-model.ts'

const PATHS = ['src/main.ts', 'src/shop/money.ts', 'README.md', 'typika.toml', 'tour/01-intro.md']

const check = (parent: string, name: string, renamed?: string) =>
  checkNewPath({ parent, name, paths: PATHS, folders: ['docs'], renamed })

describe('checkNewPath', () => {
  it('places a valid name in its folder, without the surrounding spaces', () => {
    expect(check('src/shop', '  tax.ts ')).toEqual({ _tag: 'Valid', path: 'src/shop/tax.ts' })
    expect(check('', 'LICENSE')).toEqual({ _tag: 'Valid', path: 'LICENSE' })
  })

  it('rejects an empty name', () => {
    expect(check('src', '   ')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.EMPTY })
  })

  it.each([['a/b.ts'], ['a\\b.ts'], ['.'], ['..'], ['a:b'], ['a*b'], ['a?b'], ['a"b'], ['a<b'], ['a>b'], ['a|b']])(
    'rejects the forbidden name %j',
    (name) => {
      expect(check('src', name)).toEqual({ _tag: 'Invalid', issue: FileNameIssue.INVALID })
    }
  )

  it('rejects a control character', () => {
    expect(check('src', 'a\u0007b')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.INVALID })
  })

  it.each([
    ['src', 'main.ts'],
    ['src', 'shop'],
    ['', 'docs'],
    ['', 'README.md'],
  ])('rejects %s/%s, which already exists', (parent, name) => {
    expect(check(parent, name)).toEqual({ _tag: 'Invalid', issue: FileNameIssue.TAKEN })
  })

  it('rejects the paths Typika keeps for itself', () => {
    expect(check('', 'typika.toml')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.RESERVED })
    expect(check('', 'tour')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.RESERVED })
    expect(check('tour', 'notes.md')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.RESERVED })
  })

  it('lets a renamed item keep its own name or change its case', () => {
    expect(check('src', 'main.ts', 'src/main.ts')).toEqual({ _tag: 'Valid', path: 'src/main.ts' })
    expect(check('src', 'Main.ts', 'src/main.ts')).toEqual({ _tag: 'Valid', path: 'src/Main.ts' })
    expect(check('src', 'shop', 'src/shop')).toEqual({ _tag: 'Valid', path: 'src/shop' })
  })
})

describe('isRenamable', () => {
  it('accepts the project files and folders', () => {
    expect(isRenamable('src/main.ts')).toBe(true)
    expect(isRenamable('src/shop')).toBe(true)
  })

  it('refuses the Typika files, their folders and their group', () => {
    expect(isRenamable('typika.toml')).toBe(false)
    expect(isRenamable('tour/01-intro.md')).toBe(false)
    expect(isRenamable('tour')).toBe(false)
    expect(isRenamable(TYPIKA_GROUP_PATH)).toBe(false)
  })
})

describe('movesOf', () => {
  it('moves a single file', () => {
    expect(movesOf(PATHS, 'src/main.ts', 'src/app.ts')).toEqual([['src/main.ts', 'src/app.ts']])
  })

  it('moves every file of a folder', () => {
    expect(movesOf([...PATHS, 'src/shop/order.ts', 'src/shopping.ts'], 'src/shop', 'src/store')).toEqual([
      ['src/shop/money.ts', 'src/store/money.ts'],
      ['src/shop/order.ts', 'src/store/order.ts'],
    ])
  })
})

describe('creationFolderOf', () => {
  it('creates inside a folder, or next to a file', () => {
    expect(creationFolderOf({ path: 'src/shop', isFolder: true })).toBe('src/shop')
    expect(creationFolderOf({ path: 'src/shop/money.ts', isFolder: false })).toBe('src/shop')
    expect(creationFolderOf({ path: 'README.md', isFolder: false })).toBe('')
    expect(creationFolderOf(undefined)).toBe('')
  })

  it('creates at the root from the Typika files', () => {
    expect(creationFolderOf({ path: TYPIKA_GROUP_PATH, isFolder: true })).toBe('')
    expect(creationFolderOf({ path: 'tour', isFolder: true })).toBe('')
    expect(creationFolderOf({ path: 'typika.toml', isFolder: false })).toBe('')
  })
})

describe('paths', () => {
  it('splits a path into its folder and its name', () => {
    expect(parentOf('src/shop/money.ts')).toBe('src/shop')
    expect(parentOf('README.md')).toBe('')
    expect(nameOf('src/shop/money.ts')).toBe('money.ts')
  })
})
