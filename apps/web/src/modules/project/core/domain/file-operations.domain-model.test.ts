import { describe, expect, it } from 'vitest'

import {
  checkMove,
  checkNewPath,
  creationFolderOf,
  FileNameIssue,
  filesWithin,
  isEditable,
  moveTargetsOf,
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

describe('isEditable', () => {
  it('accepts the project files and folders', () => {
    expect(isEditable('src/main.ts')).toBe(true)
    expect(isEditable('src/shop')).toBe(true)
  })

  it('refuses the Typika files, their folders and their group', () => {
    expect(isEditable('typika.toml')).toBe(false)
    expect(isEditable('tour/01-intro.md')).toBe(false)
    expect(isEditable('tour')).toBe(false)
    expect(isEditable(TYPIKA_GROUP_PATH)).toBe(false)
  })
})

describe('filesWithin', () => {
  it('finds a single file', () => {
    expect(filesWithin(PATHS, 'src/main.ts')).toEqual(['src/main.ts'])
  })

  it('finds every file of a folder, without its namesakes', () => {
    expect(filesWithin([...PATHS, 'src/shop/order.ts', 'src/shopping.ts'], 'src/shop')).toEqual([
      'src/shop/money.ts',
      'src/shop/order.ts',
    ])
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

const move = (path: string, isFolder: boolean, folder: string) =>
  checkMove({ item: { path, isFolder }, folder, paths: [...PATHS, 'src/shop/main.ts'], folders: ['docs'] })

describe('checkMove', () => {
  it('places the item in its new folder, under its own name', () => {
    expect(move('src/main.ts', false, 'docs')).toEqual({ _tag: 'Valid', path: 'docs/main.ts' })
    expect(move('src/shop', true, '')).toEqual({ _tag: 'Valid', path: 'shop' })
  })

  it('keeps the item where it is when it is moved to its own folder', () => {
    expect(move('src/main.ts', false, 'src')).toEqual({ _tag: 'Valid', path: 'src/main.ts' })
  })

  it('refuses a folder that already holds an item of this name', () => {
    expect(move('src/main.ts', false, 'src/shop')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.TAKEN })
  })

  it('refuses to move a folder inside itself', () => {
    expect(move('src', true, 'src/shop')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.INSIDE_ITSELF })
    expect(move('src/shop', true, 'src/shop')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.INSIDE_ITSELF })
  })

  it('refuses to move the Typika files, or to move anything among them', () => {
    expect(move('typika.toml', false, 'src')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.READ_ONLY })
    expect(move('README.md', false, 'tour')).toEqual({ _tag: 'Invalid', issue: FileNameIssue.RESERVED })
    expect(move('README.md', false, TYPIKA_GROUP_PATH)).toEqual({ _tag: 'Invalid', issue: FileNameIssue.RESERVED })
  })
})

describe('moveTargetsOf', () => {
  it('offers the root and every project folder but the current one', () => {
    expect(moveTargetsOf({ path: 'src/main.ts', isFolder: false }, PATHS, ['docs/guides'])).toEqual([
      '',
      'docs',
      'docs/guides',
      'src/shop',
    ])
  })

  it('leaves out a moved folder and its own folders', () => {
    expect(moveTargetsOf({ path: 'src', isFolder: true }, PATHS, ['src/empty'])).toEqual([])
    expect(moveTargetsOf({ path: 'src/shop', isFolder: true }, PATHS, ['docs'])).toEqual(['', 'docs'])
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
