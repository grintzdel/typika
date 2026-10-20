import type { TemplateFiles } from '@typika/manifest'
import { describe, expect, it } from 'vitest'

import { exerciseFixture, manifestFixture } from '../__tests__/manifest.factory.ts'
import { composeProject, PUBLIC_APP_URL } from './compose-project.ts'

const REF = 'github:typika/templates/strategy/ts@1318eae7665d'

const templateFiles = (): TemplateFiles =>
  new Map([
    ['typika.toml', 'schema = 1\nname = "strategy-ts"\n'],
    ['README.md', '# Strategy\n'],
    ['src/main.ts', 'main()\n'],
    ['tests/express.test.ts', 'test()\n'],
    ['tour/01-overview.md', '# Overview\n'],
    ['exercises/implement-express/README.md', 'Implement express.\n'],
    ['exercises/implement-express/hint-1.md', 'Look at standard.\n'],
    ['exercises/implement-express/solution/src/express.ts', 'solved()\n'],
  ])

describe('composeProject', () => {
  it('drops typika.toml, the tour and the exercises by default', () => {
    const files = composeProject({ manifest: manifestFixture(), files: templateFiles(), ref: REF, keepTour: false })

    expect([...files.keys()].toSorted()).toEqual(['README.md', 'src/main.ts', 'tests/express.test.ts'])
  })

  it('keeps every Typika file with --keep-tour and pins the template as parent', () => {
    const files = composeProject({ manifest: manifestFixture(), files: templateFiles(), ref: REF, keepTour: true })

    expect([...files.keys()].toSorted()).toEqual([...templateFiles().keys()].toSorted())
    expect(files.get('typika.toml')).toContain(`parent = "${REF}"`)
  })

  it('starts from the exercise start state with its statement in EXERCISE.md, without hints or solution', () => {
    const start: TemplateFiles = new Map([
      ['README.md', '# Strategy\n'],
      ['src/main.ts', 'main()\n'],
      ['src/express.ts', 'todo()\n'],
      ['typika.toml', 'schema = 1\n'],
    ])

    const files = composeProject({
      manifest: manifestFixture(),
      files: templateFiles(),
      ref: REF,
      exercise: { definition: exerciseFixture({ name: 'implement-express' }), start },
      keepTour: false,
    })

    expect(files).toEqual(
      new Map([
        ['README.md', '# Strategy\n'],
        ['src/main.ts', 'main()\n'],
        ['src/express.ts', 'todo()\n'],
        ['EXERCISE.md', 'Implement express.\n'],
      ])
    )
  })

  it('keeps the tour but no exercise folder when an exercise is created with --keep-tour', () => {
    const files = composeProject({
      manifest: manifestFixture(),
      files: templateFiles(),
      ref: REF,
      exercise: { definition: exerciseFixture({ name: 'implement-express' }), start: new Map([['a.ts', '']]) },
      keepTour: true,
    })

    expect([...files.keys()].toSorted()).toEqual([
      'EXERCISE.md',
      'README.md',
      'a.ts',
      'tour/01-overview.md',
      'typika.toml',
    ])
  })

  it('adds a README that links to the template page when the template has none', () => {
    const template = new Map([['src/main.ts', 'main()\n']])

    const files = composeProject({
      manifest: manifestFixture({ name: 'strategy-ts', title: 'Strategy', summary: 'Pick an algorithm.' }),
      files: template,
      ref: REF,
      keepTour: false,
    })

    expect(files.get('README.md')).toBe(
      `# Strategy\n\nPick an algorithm.\n\nCreated from [strategy-ts](${PUBLIC_APP_URL}/templates/strategy-ts) with Typika.\n`
    )
  })
})
