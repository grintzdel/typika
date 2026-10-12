import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { makeProjectTestLayer } from '../../../../project/core/project.test-layer.ts'
import { openComparisonProgram } from './open-comparison.program.ts'

const manifest = (name: string, language: string, kind: string, entry: string, variants: string) => `schema = 1
name = "${name}"
title = "Strategy in ${language}"
summary = "A strategy."
license = "MIT-0"
authors = ["github:maoudin"]

[facets]
language = "${language}"
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "${kind}"
entry = "${entry}"

[tour]
steps = ["tour/01-overview.md"]

[variants]
${variants}
`

const files = (name: string, language: string, kind: string, entry: string, variants: string) =>
  new Map(
    Object.entries({
      'typika.toml': manifest(name, language, kind, entry, variants),
      'README.md': '# Strategy\n',
      LICENSE: 'MIT No Attribution\n',
      [entry]: `// ${name}\n`,
      'tour/01-overview.md': `+++\nid = "overview"\ntitle = "Overview of ${name}"\nfile = "${entry}"\n+++\n\nHello.\n`,
      'exercises/fix/README.md': '# Fix\n',
    })
  )

const TEMPLATES = {
  'strategy-ts': files(
    'strategy-ts',
    'typescript',
    'browser-js',
    'src/main.ts',
    'go = "github:typika/templates/strategy/go"\nkotlin = "github:typika/templates/strategy/kotlin"'
  ),
  'strategy-go': files('strategy-go', 'go', 'go', 'main.go', 'typescript = "github:typika/templates/strategy/ts"'),
}

const open = (name: string, a?: string, b?: string) =>
  Effect.runPromiseExit(openComparisonProgram({ name, a, b }).pipe(Effect.provide(makeProjectTestLayer(TEMPLATES))))

describe('openComparisonProgram', () => {
  it('opens both variants with their files and tours', async () => {
    const exit = await open('strategy-go')

    expect(Exit.isSuccess(exit) && exit.value.variants).toEqual([
      { language: 'typescript', name: 'strategy-ts' },
      { language: 'go', name: 'strategy-go' },
    ])
    const sides = Exit.isSuccess(exit) && exit.value._tag === 'Ready' ? exit.value : undefined
    expect(sides?.a).toMatchObject({ language: 'typescript', name: 'strategy-ts', entry: 'src/main.ts' })
    expect(sides?.b).toMatchObject({ language: 'go', name: 'strategy-go', entry: 'main.go' })
    expect(sides?.b.files.get('main.go')).toBe('// strategy-go\n')
    expect(sides?.b.files.has('exercises/fix/README.md')).toBe(false)
    expect(sides?.b.tourSteps.map(({ title }) => title)).toEqual(['Overview of strategy-go'])
  })

  it('leaves out a variant that the index does not have', async () => {
    const exit = await open('strategy-ts', 'typescript', 'kotlin')

    expect(Exit.isSuccess(exit) && exit.value).toMatchObject({
      _tag: 'Choose',
      choice: { _tag: 'Unavailable', language: 'kotlin' },
      variants: [
        { language: 'typescript', name: 'strategy-ts' },
        { language: 'go', name: 'strategy-go' },
      ],
    })
  })

  it('fails when the template is unknown', async () => {
    const exit = await open('missing-ts')

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateNotFoundError', name: 'missing-ts' },
    })
  })
})
