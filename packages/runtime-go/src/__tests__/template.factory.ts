import { parseManifest } from '@typika/manifest'
import { ProjectPathSchema, type FileContent, type ProjectSnapshot } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

const sources = import.meta.glob<string>('../../../../templates/strategy/go/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const PREFIX = '../../../../templates/strategy/go/'

export const projectPath = Schema.decodeUnknownSync(ProjectPathSchema)

const strategyFiles = (): Record<string, FileContent> =>
  Object.fromEntries(
    Object.entries(sources)
      .map(([path, content]) => [path.slice(PREFIX.length), content] as const)
      .filter(([path]) => !path.startsWith('exercises/'))
  )

export const strategyGoProject = (overrides: Readonly<Record<string, FileContent>> = {}): ProjectSnapshot => {
  const files = { ...strategyFiles(), ...overrides }
  const manifest = files['typika.toml']
  return {
    files: new Map(Object.entries(files).map(([path, content]) => [projectPath(path), content] as const)),
    manifest: Effect.runSync(parseManifest(typeof manifest === 'string' ? manifest : '')),
  }
}
