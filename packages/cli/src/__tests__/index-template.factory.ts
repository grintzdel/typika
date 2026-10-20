import type { IndexTemplate, RegistryIndex } from '@typika/registry-tools/index-schema'

type Manifest = IndexTemplate['manifest']

export type IndexTemplateOverrides = Partial<Omit<IndexTemplate, 'manifest'>> & {
  readonly manifest?: Partial<Manifest>
}

export const indexTemplate = (
  name: string,
  { manifest = {}, ...entry }: IndexTemplateOverrides = {}
): IndexTemplate => ({
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
    },
    runtime: { kind: 'browser-js' },
    base: null,
    variants: {},
    tour: { steps: [] },
    exercises: [],
    ...manifest,
  },
  parent: null,
  health: null,
  search: { text: name },
  ...entry,
})

export const indexOf = (templates: ReadonlyArray<IndexTemplate>): RegistryIndex => ({
  schema: 1,
  generatedAt: '2026-10-20T00:00:00.000Z',
  registryCommit: '0123456789ab',
  vocabulary: {
    topics: [{ id: 'design-pattern/behavioral/strategy', label: 'Strategy', category: 'design-pattern' }],
    languages: [],
  },
  templates,
})
