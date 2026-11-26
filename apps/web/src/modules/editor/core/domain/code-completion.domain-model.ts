import { EditorLanguage, languageOf } from './language.domain-model.ts'

export type CompletedLanguage = typeof EditorLanguage.GO | typeof EditorLanguage.KOTLIN

export const isCompletedLanguage = (language: EditorLanguage): language is CompletedLanguage =>
  language === EditorLanguage.GO || language === EditorLanguage.KOTLIN

export const KEYWORDS: Readonly<Record<CompletedLanguage, ReadonlyArray<string>>> = {
  go: [
    'break',
    'case',
    'chan',
    'const',
    'continue',
    'default',
    'defer',
    'else',
    'fallthrough',
    'for',
    'func',
    'go',
    'goto',
    'if',
    'import',
    'interface',
    'map',
    'package',
    'range',
    'return',
    'select',
    'struct',
    'switch',
    'type',
    'var',
    'nil',
    'true',
    'false',
    'iota',
    'any',
    'bool',
    'byte',
    'error',
    'float64',
    'int',
    'int64',
    'rune',
    'string',
    'append',
    'cap',
    'clear',
    'close',
    'copy',
    'delete',
    'len',
    'make',
    'max',
    'min',
    'new',
    'panic',
    'recover',
  ],
  kotlin: [
    'abstract',
    'as',
    'break',
    'by',
    'class',
    'companion',
    'const',
    'continue',
    'data',
    'do',
    'else',
    'enum',
    'false',
    'final',
    'for',
    'fun',
    'if',
    'import',
    'in',
    'init',
    'interface',
    'internal',
    'is',
    'lateinit',
    'null',
    'object',
    'open',
    'operator',
    'override',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'sealed',
    'super',
    'suspend',
    'this',
    'throw',
    'true',
    'try',
    'typealias',
    'val',
    'var',
    'when',
    'while',
    'Any',
    'Boolean',
    'Double',
    'Int',
    'List',
    'Long',
    'Map',
    'Set',
    'String',
    'Unit',
    'listOf',
    'mapOf',
    'mutableListOf',
    'mutableMapOf',
    'println',
    'require',
    'setOf',
  ],
}

export const STANDARD_IMPORTS: Readonly<Record<CompletedLanguage, ReadonlyArray<string>>> = {
  go: [
    'bufio',
    'bytes',
    'cmp',
    'context',
    'encoding/json',
    'errors',
    'fmt',
    'io',
    'iter',
    'log',
    'maps',
    'math',
    'math/rand',
    'os',
    'reflect',
    'regexp',
    'slices',
    'sort',
    'strconv',
    'strings',
    'sync',
    'testing',
    'time',
    'unicode',
    'unicode/utf8',
  ],
  kotlin: [
    'kotlin.collections.*',
    'kotlin.math.abs',
    'kotlin.math.max',
    'kotlin.math.min',
    'kotlin.math.pow',
    'kotlin.math.roundToInt',
    'kotlin.math.sqrt',
    'kotlin.random.Random',
    'kotlin.test.Test',
    'kotlin.test.assertEquals',
    'kotlin.test.assertFailsWith',
    'kotlin.test.assertFalse',
    'kotlin.test.assertTrue',
    'java.math.BigDecimal',
    'java.time.Duration',
    'java.time.Instant',
    'java.time.LocalDate',
    'java.util.UUID',
  ],
}

const EXERCISES = 'exercises/'
const IDENTIFIER = /[A-Za-z_]\w{2,}/g
const MAX_WORDS = 2000

const filesOf = (files: ReadonlyMap<string, string>, language: CompletedLanguage) =>
  [...files].filter(([path]) => languageOf(path) === language && !path.startsWith(EXERCISES))

const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const withoutStrings = (source: string) => source.replace(/"(?:[^"\\\n]|\\.)*"|`[^`]*`/g, '')

export const projectWordsOf = (
  files: ReadonlyMap<string, string>,
  language: CompletedLanguage
): ReadonlyArray<string> => {
  const keywords = new Set(KEYWORDS[language])
  const words = new Set<string>()
  for (const [, content] of filesOf(files, language)) {
    for (const [word] of withoutStrings(withoutComments(content)).matchAll(IDENTIFIER)) {
      if (!keywords.has(word)) words.add(word)
      if (words.size >= MAX_WORDS) return [...words].toSorted()
    }
  }
  return [...words].toSorted()
}

const dirOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))

const goImportsOf = (files: ReadonlyMap<string, string>) => {
  const module = /^module\s+(\S+)/m.exec(files.get('go.mod') ?? '')?.[1]
  if (module === undefined) return []
  const packages = new Map<string, boolean>()
  for (const [path, content] of filesOf(files, EditorLanguage.GO)) {
    if (path.endsWith('_test.go')) continue
    const dir = dirOf(path)
    const isMain = /^package\s+main\b/m.test(content)
    packages.set(dir, (packages.get(dir) ?? false) || isMain)
  }
  return [...packages]
    .filter(([dir, isMain]) => dir !== '' && !isMain)
    .map(([dir]) => `${module}/${dir}`)
    .toSorted()
}

const KOTLIN_DECLARATION =
  /^(?:(?:public|internal|data|sealed|abstract|open|enum|fun)\s+)*(?:fun|class|interface|object|val)\s+(?:<[^>]*>\s*)?([A-Za-z_]\w*)/gm

const kotlinImportsOf = (files: ReadonlyMap<string, string>) => {
  const imports = new Set<string>()
  for (const [, content] of filesOf(files, EditorLanguage.KOTLIN)) {
    const pkg = /^package\s+([\w.]+)/m.exec(content)?.[1]
    if (pkg === undefined) continue
    imports.add(pkg)
    for (const [, name] of withoutComments(content).matchAll(KOTLIN_DECLARATION)) {
      if (name !== undefined) imports.add(`${pkg}.${name}`)
    }
  }
  return [...imports].toSorted()
}

export const projectImportsOf = (
  files: ReadonlyMap<string, string>,
  language: CompletedLanguage
): ReadonlyArray<string> => (language === EditorLanguage.GO ? goImportsOf(files) : kotlinImportsOf(files))

const GO_IMPORT_LINE = /^\s*(?:import\s+(?:[\w.]+\s+)?)?"([^"\n]*)$/
const KOTLIN_IMPORT_LINE = /^\s*import\s+([\w.]*)$/

const isInGoImportBlock = (before: string) => {
  const opened = before.lastIndexOf('import (')
  return opened !== -1 && !before.slice(opened).includes(')')
}

export const importPrefixOf = (language: CompletedLanguage, before: string): string | undefined => {
  const line = before.slice(before.lastIndexOf('\n') + 1)
  if (language === EditorLanguage.KOTLIN) return KOTLIN_IMPORT_LINE.exec(line)?.[1]
  const match = GO_IMPORT_LINE.exec(line)
  if (match === null) return undefined
  return /^\s*import\b/.test(line) || isInGoImportBlock(before) ? match[1] : undefined
}
