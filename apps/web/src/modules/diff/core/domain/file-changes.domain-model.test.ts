import { describe, expect, it } from 'vitest'

import { baseFocus, fileChanges, withoutTourMarkers } from './file-changes.domain-model.ts'

const files = (entries: Readonly<Record<string, string>>): ReadonlyMap<string, string> =>
  new Map(Object.entries(entries))

describe('fileChanges', () => {
  it('lists the added, modified and deleted files by path', () => {
    const before = files({ 'src/b.ts': 'b', 'src/same.ts': 's', 'src/gone.ts': 'g' })
    const after = files({ 'src/b.ts': 'b2', 'src/same.ts': 's', 'src/a.ts': 'a' })

    expect(fileChanges(before, after, () => true)).toEqual([
      { path: 'src/a.ts', status: 'added', before: '', after: 'a' },
      { path: 'src/b.ts', status: 'modified', before: 'b', after: 'b2' },
      { path: 'src/gone.ts', status: 'deleted', before: 'g', after: '' },
    ])
  })

  it('keeps only the files it is asked for', () => {
    const before = files({ 'src/a.ts': 'a', 'tests/a.test.ts': 't' })
    const after = files({ 'src/a.ts': 'a2', 'tests/a.test.ts': 't2' })

    expect(fileChanges(before, after, (path) => path.startsWith('src/')).map((change) => change.path)).toEqual([
      'src/a.ts',
    ])
  })
})

describe('baseFocus', () => {
  it('keeps the files matched by the focus globs', () => {
    const inFocus = baseFocus(['src/checkout/**'])

    expect(inFocus('src/checkout/options/express.ts')).toBe(true)
    expect(inFocus('src/shop/money.ts')).toBe(false)
  })

  it('keeps every file but the tour and the exercises without a focus', () => {
    const inFocus = baseFocus(undefined)

    expect(inFocus('src/main.ts')).toBe(true)
    expect(inFocus('typika.toml')).toBe(true)
    expect(inFocus('tour/01-overview.md')).toBe(false)
    expect(inFocus('exercises/fix/README.md')).toBe(false)
  })
})

describe('withoutTourMarkers', () => {
  it('drops the lines of the tour region markers', () => {
    const source = [
      'a',
      '// #region tour:context',
      'b',
      '  // #region tour:inner',
      'c',
      '  // #endregion',
      '// #endregion',
      'd',
    ]

    expect(withoutTourMarkers(source.join('\n'))).toBe(['a', 'b', 'c', 'd'].join('\n'))
  })

  it('keeps the other regions', () => {
    const source = ['// #region helpers', '// #region tour:context', 'a', '// #endregion', '// #endregion'].join('\n')

    expect(withoutTourMarkers(source)).toBe(['// #region helpers', 'a', '// #endregion'].join('\n'))
  })
})
