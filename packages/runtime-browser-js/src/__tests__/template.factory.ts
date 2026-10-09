import type { FileContent } from '@typika/runtime-core'

import { projectFixture } from './project.factory.ts'

const sources = import.meta.glob<string>('../../../../templates/strategy-base/ts/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const PREFIX = '../../../../templates/strategy-base/ts/'

export const strategyBaseFiles = (): Record<string, FileContent> =>
  Object.fromEntries(Object.entries(sources).map(([path, content]) => [path.slice(PREFIX.length), content]))

export const strategyBaseProject = () => {
  const { 'typika.toml': manifest, ...files } = strategyBaseFiles()
  return projectFixture(files, typeof manifest === 'string' ? manifest : '')
}
