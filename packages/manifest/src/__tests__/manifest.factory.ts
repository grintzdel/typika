import { stringify } from 'smol-toml'

export type ManifestInput = Record<string, unknown>

export const facetsFixture = (overrides: ManifestInput = {}): ManifestInput => ({
  language: 'typescript',
  paradigm: ['oop'],
  topic: ['design-pattern/behavioral/strategy', 'principle/open-closed'],
  level: 'intermediate',
  useCase: ['backend'],
  ...overrides,
})

export const exercisesFixture = (): Array<ManifestInput> => [
  {
    name: 'add-pickup-point-option',
    kind: 'refactor',
    title: 'Add a pickup-point shipping option',
    from: 'base',
    solutionFrom: 'self',
    failing: ['tests/pickup-point.test.ts'],
  },
  {
    name: 'implement-express',
    kind: 'fix',
    title: 'Implement the express shipping strategy',
    failing: ['tests/express-shipping.test.ts'],
    hints: ['hint-1.md'],
  },
]

export const manifestFixture = (overrides: ManifestInput = {}): ManifestInput => ({
  schema: 1,
  name: 'strategy-ts',
  title: 'Strategy: shipping options',
  summary: 'Pick an algorithm at runtime without the caller knowing which one runs.',
  license: 'MIT-0',
  authors: ['github:maoudin'],
  facets: facetsFixture(),
  runtime: { kind: 'browser-js', entry: 'src/main.ts' },
  commands: { test: 'vitest' },
  tests: { include: ['tests/**/*.test.ts'] },
  tour: { steps: ['tour/01-overview.md', 'tour/02-context.md'] },
  base: { template: 'github:typika/templates/strategy-base/ts', focus: ['src/checkout/**'] },
  variants: { go: 'github:typika/templates/strategy/go' },
  exercises: exercisesFixture(),
  ...overrides,
})

export const baseManifestFixture = (overrides: ManifestInput = {}): ManifestInput => {
  const { tour: _tour, base: _base, variants: _variants, exercises: _exercises, ...rest } = manifestFixture()
  return { ...rest, name: 'strategy-base-ts', role: 'base', ...overrides }
}

export const toToml = (manifest: ManifestInput): string => stringify(manifest)
