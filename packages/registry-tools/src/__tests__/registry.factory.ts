import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { RegistryCategory } from '../domain/constants/registry-category.constant.ts'

export const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..')
export const TEMPLATES_ROOT = join(REPO_ROOT, 'templates')
export const VOCABULARY = readFileSync(join(REPO_ROOT, 'registry', 'vocabulary.toml'), 'utf8')

export type EntryFixture = {
  readonly ref?: string
  readonly category?: string
  readonly maintainers?: ReadonlyArray<string>
  readonly added?: string
  readonly extra?: string
}

export const entryToml = ({
  ref = 'github:typika/templates/strategy/ts@2be9bdff96b6',
  category = RegistryCategory.OFFICIAL,
  maintainers = ['github:maoudin'],
  added = '2026-10-08',
  extra = '',
}: EntryFixture = {}) => `ref = "${ref}"
maintainers = [${maintainers.map((maintainer) => `"${maintainer}"`).join(', ')}]
category = "${category}"
added = ${added}
${extra}`

export const officialEntry = (name: string, dir: string, extra: EntryFixture = {}) =>
  ({
    file: `templates/${extra.category ?? RegistryCategory.OFFICIAL}/${name}.toml`,
    source: entryToml({ ref: `github:typika/templates/${dir}@0123456789ab`, ...extra }),
  }) as const
