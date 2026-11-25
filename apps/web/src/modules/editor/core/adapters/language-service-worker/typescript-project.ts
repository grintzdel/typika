import { createSystem, createVirtualTypeScriptEnvironment, type VirtualTypeScriptEnvironment } from '@typescript/vfs'
import ts from 'typescript-6'

import {
  isAnalyzedPath,
  type CompletionItem,
  type DiagnosticSeverity,
  type EditorDiagnostic,
  type FileRename,
  type LanguageServiceFiles,
  type SourceRange,
  type SymbolReference,
  type TextChange,
  type TypeScriptProject,
} from '../../domain/language-service.domain-model.ts'

const TSCONFIG = 'tsconfig.json'
const ROOT_LIB = 'lib.es2022.d.ts'
const GLOBALS = '/typika-globals.d.ts'

const DEFAULT_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  strict: true,
}

const PREFERENCES: ts.UserPreferences = {
  includeCompletionsForModuleExports: true,
  includeCompletionsWithInsertText: true,
  quotePreference: 'auto',
}

const IDENTIFIER_PART = /[\w$]/

const SEVERITY: Readonly<Record<ts.DiagnosticCategory, DiagnosticSeverity>> = {
  [ts.DiagnosticCategory.Error]: 'error',
  [ts.DiagnosticCategory.Warning]: 'warning',
  [ts.DiagnosticCategory.Suggestion]: 'info',
  [ts.DiagnosticCategory.Message]: 'info',
}

const absolute = (path: string) => `/${path}`

const relative = (fileName: string) => fileName.replace(/^\//, '')

const rangeOf = (fileName: string, span: ts.TextSpan): SourceRange => ({
  path: relative(fileName),
  from: span.start,
  to: span.start + span.length,
})

const sameRange = (a: SourceRange, b: SourceRange) => a.path === b.path && a.from === b.from && a.to === b.to

const byPosition = (a: SourceRange, b: SourceRange) => a.path.localeCompare(b.path) || a.from - b.from

const applyChanges = (text: string, changes: ReadonlyArray<TextChange>) =>
  changes
    .toReversed()
    .reduce((result, change) => result.slice(0, change.from) + change.insert + result.slice(change.to), text)

const entryKey = (name: string, source: string | undefined) => `${name}\u0000${source ?? ''}`

const compilerOptionsOf = (tsconfig: string | undefined): ts.CompilerOptions => {
  const parsed = tsconfig === undefined ? undefined : ts.parseConfigFileTextToJson(TSCONFIG, tsconfig)
  const json: unknown = parsed?.config
  const compilerOptions =
    typeof json === 'object' && json !== null && 'compilerOptions' in json ? json.compilerOptions : undefined
  const options =
    compilerOptions === undefined ? DEFAULT_OPTIONS : ts.convertCompilerOptionsFromJson(compilerOptions, '/').options
  return { ...options, allowJs: true, lib: [ROOT_LIB], types: [], noEmit: true }
}

const toDiagnostic = (diagnostic: ts.Diagnostic): EditorDiagnostic | undefined =>
  diagnostic.start === undefined
    ? undefined
    : {
        from: diagnostic.start,
        to: diagnostic.start + (diagnostic.length ?? 0),
        severity: SEVERITY[diagnostic.category],
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      }

const wordStart = (text: string, position: number) => {
  let start = position
  while (start > 0 && IDENTIFIER_PART.test(text.charAt(start - 1))) start -= 1
  return start
}

const wordAt = (text: string, position: number) => {
  let end = position
  while (end < text.length && IDENTIFIER_PART.test(text.charAt(end))) end += 1
  return text.slice(wordStart(text, position), end)
}

export const makeTypeScriptProject = ({
  libraries,
  files,
}: {
  readonly libraries: LanguageServiceFiles
  readonly files: LanguageServiceFiles
}): TypeScriptProject => {
  let environment: VirtualTypeScriptEnvironment
  let current: Record<string, string> = {}
  let lastEntries = new Map<string, ts.CompletionEntry>()

  const build = (next: LanguageServiceFiles) => {
    current = { ...next }
    const fsMap = new Map(Object.entries(libraries))
    for (const [path, content] of Object.entries(current)) fsMap.set(absolute(path), content)
    const roots = Object.keys(current).filter(isAnalyzedPath).map(absolute)
    environment = createVirtualTypeScriptEnvironment(
      createSystem(fsMap),
      [...roots, GLOBALS],
      ts,
      compilerOptionsOf(current[TSCONFIG])
    )
  }

  build(files)

  const service = () => environment.languageService
  const textOf = (path: string) => environment.getSourceFile(absolute(path))?.text ?? ''
  const inProgram = (path: string) => service().getProgram()?.getSourceFile(absolute(path)) !== undefined
  const isProjectFile = (fileName: string) => {
    const path = relative(fileName)
    return path in current && isAnalyzedPath(path)
  }

  const updateFile = (path: string, content: string) => {
    if (current[path] === content) return
    const isNew = !(path in current)
    current[path] = content
    if (path === TSCONFIG || (isNew && !isAnalyzedPath(path))) build(current)
    else if (isNew) environment.createFile(absolute(path), content)
    else if (isAnalyzedPath(path)) environment.updateFile(absolute(path), content)
    else environment.sys.writeFile(absolute(path), content)
  }

  const definition = (path: string, position: number): ReadonlyArray<SourceRange> => {
    if (!inProgram(path)) return []
    return (service().getDefinitionAtPosition(absolute(path), position) ?? [])
      .filter((found) => isProjectFile(found.fileName))
      .map((found) => rangeOf(found.fileName, found.textSpan))
  }

  const referenceOf = (entry: ts.ReferenceEntry, definitions: ReadonlyArray<SourceRange>): SymbolReference => {
    const range = rangeOf(entry.fileName, entry.textSpan)
    const source = environment.getSourceFile(entry.fileName)
    const line = source?.getLineAndCharacterOfPosition(range.from).line ?? 0
    const starts = source?.getLineStarts() ?? []
    const lineText = (source?.text ?? '').slice(starts[line] ?? 0, starts[line + 1]).trim()
    return { ...range, line: line + 1, lineText, isDefinition: definitions.some((found) => sameRange(found, range)) }
  }

  return {
    setFiles: build,

    updateFile,

    diagnostics: (path) => {
      if (!inProgram(path)) return []
      return [...service().getSyntacticDiagnostics(absolute(path)), ...service().getSemanticDiagnostics(absolute(path))]
        .map(toDiagnostic)
        .filter((diagnostic) => diagnostic !== undefined)
    },

    completions: (path, position) => {
      if (!inProgram(path)) return undefined
      const completions = service().getCompletionsAtPosition(absolute(path), position, PREFERENCES)
      if (completions === undefined) return undefined
      const entries = completions.entries.filter((entry) => entry.kind !== ts.ScriptElementKind.warning)
      lastEntries = new Map(entries.map((entry) => [entryKey(entry.name, entry.source), entry]))
      return {
        from: wordStart(textOf(path), position),
        items: entries.map((entry): CompletionItem => ({
          label: entry.name,
          kind: entry.kind,
          sortText: entry.sortText,
          source: entry.source,
          hasAction: entry.hasAction === true,
        })),
      }
    },

    completionChanges: (path, position, item) => {
      const entry = lastEntries.get(entryKey(item.label, item.source))
      if (!inProgram(path) || entry === undefined) return []
      const details = service().getCompletionEntryDetails(
        absolute(path),
        position,
        entry.name,
        {},
        entry.source,
        PREFERENCES,
        entry.data
      )
      return (details?.codeActions ?? [])
        .flatMap((action) => action.changes)
        .filter((change) => change.fileName === absolute(path))
        .flatMap((change) => change.textChanges)
        .map((change) => ({
          from: change.span.start,
          to: change.span.start + change.span.length,
          insert: change.newText,
        }))
    },

    quickInfo: (path, position) => {
      if (!inProgram(path)) return undefined
      const info = service().getQuickInfoAtPosition(absolute(path), position)
      if (info === undefined) return undefined
      return {
        from: info.textSpan.start,
        to: info.textSpan.start + info.textSpan.length,
        signature: ts.displayPartsToString(info.displayParts),
        documentation: ts.displayPartsToString(info.documentation),
      }
    },

    signatureHelp: (path, position) => {
      if (!inProgram(path)) return undefined
      const help = service().getSignatureHelpItems(absolute(path), position, undefined)
      const item = help?.items[help.selectedItemIndex]
      if (help === undefined || item === undefined) return undefined
      return {
        prefix: ts.displayPartsToString(item.prefixDisplayParts),
        parameters: item.parameters.map((parameter) => ts.displayPartsToString(parameter.displayParts)),
        separator: ts.displayPartsToString(item.separatorDisplayParts),
        suffix: ts.displayPartsToString(item.suffixDisplayParts),
        activeParameter: help.argumentIndex,
        documentation: ts.displayPartsToString(item.documentation),
      }
    },

    definition,

    references: (path, position) => {
      if (!inProgram(path)) return undefined
      const symbols = service().findReferences(absolute(path), position)
      if (symbols === undefined || symbols.length === 0) return undefined
      const definitions = definition(path, position)
      const references = symbols
        .flatMap((symbol) => symbol.references)
        .filter((entry) => isProjectFile(entry.fileName))
        .map((entry) => referenceOf(entry, definitions))
        .filter((reference, index, all) => all.findIndex((other) => sameRange(other, reference)) === index)
        .toSorted(byPosition)
      return { symbol: wordAt(textOf(path), position), references }
    },

    rename: (path, position, newName) => {
      if (!inProgram(path) || !service().getRenameInfo(absolute(path), position).canRename) return undefined
      const declarations = service().getDefinitionAtPosition(absolute(path), position) ?? []
      if (declarations.length === 0 || !declarations.every((found) => isProjectFile(found.fileName))) return undefined
      const locations = service().findRenameLocations(absolute(path), position, false, false, {
        providePrefixAndSuffixTextForRename: false,
      })
      if (locations === undefined) return undefined
      const changesByPath = Map.groupBy(
        locations.filter((location) => isProjectFile(location.fileName)),
        (location) => relative(location.fileName)
      )
      const renames = [...changesByPath]
        .map(([renamed, found]): FileRename => {
          const changes = found
            .map((location): TextChange => ({
              from: location.textSpan.start,
              to: location.textSpan.start + location.textSpan.length,
              insert: `${location.prefixText ?? ''}${newName}${location.suffixText ?? ''}`,
            }))
            .toSorted((a, b) => a.from - b.from)
          return { path: renamed, changes, content: applyChanges(textOf(renamed), changes) }
        })
        .toSorted((a, b) => a.path.localeCompare(b.path))
      for (const renamed of renames) updateFile(renamed.path, renamed.content)
      return renames
    },
  }
}
