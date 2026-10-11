import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript-6'
import type { Plugin } from 'vite'

export type TypeScriptLibraries = Readonly<Record<string, string>>

const ROOT_LIB = 'es2022'
const MODULE_ID = 'virtual:typika/typescript-libraries'

const GLOBALS = `type ConsoleMethod = (...data: Array<unknown>) => void
declare var console: {
  log: ConsoleMethod
  info: ConsoleMethod
  debug: ConsoleMethod
  warn: ConsoleMethod
  error: ConsoleMethod
  trace: ConsoleMethod
}
declare function setTimeout(handler: (...args: Array<any>) => void, timeout?: number, ...args: Array<any>): number
declare function clearTimeout(id: number | undefined): void
declare function setInterval(handler: (...args: Array<any>) => void, timeout?: number, ...args: Array<any>): number
declare function clearInterval(id: number | undefined): void
declare function queueMicrotask(callback: () => void): void
declare function structuredClone<T>(value: T): T
`

const libDirectory = dirname(createRequire(import.meta.url).resolve('typescript-6'))

const collectLibs = (name: string, into: Record<string, string>) => {
  const file = `lib.${name}.d.ts`
  if (`/${file}` in into) return
  const text = readFileSync(join(libDirectory, file), 'utf8')
  into[`/${file}`] = text
  for (const [, referenced = ''] of text.matchAll(/<reference lib="([^"]+)"/g)) collectLibs(referenced, into)
}

const emitVitestDeclarations = (into: Record<string, string>) => {
  const entry = fileURLToPath(import.meta.resolve('@typika/test-runner'))
  const program = ts.createProgram([entry], {
    declaration: true,
    emitDeclarationOnly: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    allowImportingTsExtensions: true,
    skipLibCheck: true,
    types: [],
  })
  program.emit(undefined, (fileName, text) => {
    into[`/node_modules/vitest/${relative(dirname(entry), fileName)}`] = text.replaceAll(
      /(from '\.[^']*)\.ts'/g,
      "$1.js'"
    )
  })
  into['/node_modules/vitest/package.json'] = JSON.stringify({ name: 'vitest', type: 'module', types: './index.d.ts' })
}

export const collectTypeScriptLibraries = (): TypeScriptLibraries => {
  const libraries: Record<string, string> = { '/typika-globals.d.ts': GLOBALS }
  collectLibs(ROOT_LIB, libraries)
  emitVitestDeclarations(libraries)
  return libraries
}

export const typescriptLibraries = (): Plugin => ({
  name: 'typika:typescript-libraries',
  resolveId: (id) => (id === MODULE_ID ? `\0${MODULE_ID}` : undefined),
  load: (id) =>
    id === `\0${MODULE_ID}` ? `export default ${JSON.stringify(collectTypeScriptLibraries())}` : undefined,
})
