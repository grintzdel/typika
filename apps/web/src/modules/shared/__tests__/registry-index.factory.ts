import type { IndexTemplate, RegistryIndex } from '@typika/registry-tools/index-schema'
import type { TemplateHealth } from '@typika/registry-tools/template-health'

type Manifest = IndexTemplate['manifest']

export type IndexTemplateOverrides = Partial<Omit<IndexTemplate, 'manifest'>> & {
  readonly manifest?: Partial<Omit<Manifest, 'facets'>> & { readonly facets?: Partial<Manifest['facets']> }
}

export const indexTemplate = (name: string, overrides: IndexTemplateOverrides = {}): IndexTemplate => {
  const { manifest = {}, ...entry } = overrides
  const { facets = {}, ...fields } = manifest
  return {
    name,
    ref: `github:typika/templates/${name}@0123456789ab`,
    category: 'official',
    maintainers: ['github:maoudin'],
    addedAt: '2026-10-08',
    updatedAt: '2026-10-08',
    manifest: {
      title: 'Strategy',
      summary: 'Replace a growing switch.',
      license: 'MIT-0',
      authors: ['github:maoudin'],
      role: 'template',
      facets: {
        language: 'typescript',
        framework: [],
        library: [],
        paradigm: ['oop'],
        topic: [],
        level: 'intermediate',
        useCase: [],
        ...facets,
      },
      runtime: { kind: 'browser-js' },
      base: null,
      variants: {},
      tour: { steps: [] },
      exercises: [],
      ...fields,
    },
    parent: null,
    health: null,
    search: { text: name },
    ...entry,
  }
}

export const registryIndex = (overrides: Partial<RegistryIndex> = {}): RegistryIndex => ({
  schema: 1,
  generatedAt: '2026-10-12T08:00:00.000Z',
  registryCommit: '0123456789ab',
  vocabulary: { topics: [], languages: ['typescript'] },
  templates: [indexTemplate('strategy-ts'), indexTemplate('strategy-base-ts', { manifest: { role: 'base' } })],
  ...overrides,
})

export const templateHealth = (
  status: TemplateHealth['status'],
  overrides: Partial<TemplateHealth> = {}
): TemplateHealth => ({
  status,
  checkedAt: '2026-10-12T03:00:00.000Z',
  brokenSince: status === 'broken' || status === 'deprecated' ? '2026-10-12T03:00:00.000Z' : null,
  checks: { boot: 'pass', tests: status === 'broken' ? 'fail' : 'pass', exercises: 'pass', deps: 'skip' },
  runUrl: null,
  ...overrides,
})
