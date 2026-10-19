import { MANIFEST_FILE } from '../validate-template/validate-template.ts'

const TYPIKA_DIRS = ['tour/', 'exercises/']
const TOP_LEVEL_PARENT = /^parent\s*=/m

export const withoutTypikaFiles = <K extends string, C>(files: ReadonlyMap<K, C>): ReadonlyMap<K, C> =>
  new Map([...files].filter(([path]) => path !== MANIFEST_FILE && !TYPIKA_DIRS.some((dir) => path.startsWith(dir))))

const topLevelOf = (manifest: string) => {
  const table = manifest.search(/^\[/m)
  return table === -1 ? manifest : manifest.slice(0, table)
}

export const withParent = <K extends string, C>(files: ReadonlyMap<K, C | string>, parent: string) => {
  const manifest = [...files].find(([path]) => path === MANIFEST_FILE)?.[1]
  if (typeof manifest !== 'string' || TOP_LEVEL_PARENT.test(topLevelOf(manifest))) return files
  const top = topLevelOf(manifest)
  const body = top.trimEnd()
  const line = `parent = ${JSON.stringify(parent)}`
  const updated = `${body === '' ? '' : `${body}\n`}${line}${top.slice(body.length) || '\n'}${manifest.slice(top.length)}`
  return new Map([...files].map(([path, content]) => [path, path === MANIFEST_FILE ? updated : content] as const))
}
