import { parseManifest } from '@typika/manifest'
import { ProjectPathSchema, type FileContent, type ProjectSnapshot } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

const sources = import.meta.glob<string>(
  ['../../../../templates/strategy/kotlin/**/*.kt', '../../../../templates/strategy/kotlin/typika.toml'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  }
)

const PREFIX = '../../../../templates/strategy/kotlin/'
const EXERCISES = 'exercises/'

export const projectPath = Schema.decodeUnknownSync(ProjectPathSchema)

const templateFiles = () =>
  Object.entries(sources).map(([path, content]) => [path.slice(PREFIX.length), content] as const)

const strategyFiles = (): Record<string, FileContent> =>
  Object.fromEntries(templateFiles().filter(([path]) => !path.startsWith(EXERCISES)))

export const exerciseStartFiles = (exercise: string): Record<string, FileContent> => {
  const start = `${EXERCISES}${exercise}/start/`
  return Object.fromEntries(
    templateFiles()
      .filter(([path]) => path.startsWith(start))
      .map(([path, content]) => [path.slice(start.length), content])
  )
}

export const strategyKotlinProject = (overrides: Readonly<Record<string, FileContent>> = {}): ProjectSnapshot => {
  const files = { ...strategyFiles(), ...overrides }
  const manifest = files['typika.toml']
  return {
    files: new Map(Object.entries(files).map(([path, content]) => [projectPath(path), content] as const)),
    manifest: Effect.runSync(parseManifest(typeof manifest === 'string' ? manifest : '')),
  }
}
