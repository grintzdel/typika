import { formatTemplateRef, parseTemplateRef, type Language, type Level, type Manifest } from '@typika/manifest'
import type { HealthStatus } from '@typika/registry-tools/health-status'
import * as Option from 'effect/Option'

export type TemplateEntry = {
  readonly name: string
  readonly ref: string
  readonly role: Manifest['role']
  readonly title: string
  readonly summary: string
  readonly language: Language
  readonly level: Level
  readonly health: TemplateEntryHealth | undefined
}

export type TemplateEntryHealth = { readonly status: HealthStatus; readonly runUrl: string | null }

export const entryOfManifest = (manifest: Manifest, ref: string): TemplateEntry => ({
  name: manifest.name,
  ref,
  role: manifest.role,
  title: manifest.title,
  summary: manifest.summary,
  language: manifest.facets.language,
  level: manifest.facets.level,
  health: undefined,
})

const keyOfRef = (ref: string) =>
  Option.map(parseTemplateRef(ref), ({ owner, repo, path }) =>
    formatTemplateRef(path === undefined ? { owner, repo } : { owner, repo, path })
  )

export const entryNamed = (entries: ReadonlyArray<TemplateEntry>, name: string): TemplateEntry | undefined =>
  entries.find((entry) => entry.name === name)

export const entryForRef = (entries: ReadonlyArray<TemplateEntry>, ref: string): TemplateEntry | undefined => {
  const key = keyOfRef(ref)
  return Option.isNone(key) ? undefined : entries.find((entry) => Option.contains(keyOfRef(entry.ref), key.value))
}
