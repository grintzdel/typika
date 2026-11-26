import {
  autocompletion,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

import {
  importPrefixOf,
  KEYWORDS,
  projectImportsOf,
  projectWordsOf,
  STANDARD_IMPORTS,
  type CompletedLanguage,
} from '../../core/domain/code-completion.domain-model.ts'

const WORD = /[\w$]+$/
const IDENTIFIER = /^[\w$]*$/

const SNIPPETS: Readonly<Record<CompletedLanguage, ReadonlyArray<Completion>>> = {
  go: [
    snippetCompletion('func ${name}(${}) {\n\t${}\n}', { label: 'func', detail: 'function', type: 'keyword' }),
    snippetCompletion('for ${i} := 0; ${i} < ${n}; ${i}++ {\n\t${}\n}', { label: 'for', detail: 'loop' }),
    snippetCompletion('for ${_}, ${value} := range ${values} {\n\t${}\n}', { label: 'forr', detail: 'range' }),
    snippetCompletion('if err != nil {\n\treturn ${err}\n}', { label: 'iferr', detail: 'error check' }),
    snippetCompletion('type ${Name} struct {\n\t${}\n}', { label: 'struct', detail: 'type' }),
    snippetCompletion('type ${Name} interface {\n\t${}\n}', { label: 'interface', detail: 'type' }),
    snippetCompletion('switch ${value} {\ncase ${}:\n\t${}\n}', { label: 'switch', detail: 'statement' }),
    snippetCompletion('func Test${Name}(t *testing.T) {\n\t${}\n}', { label: 'test', detail: 'test function' }),
  ],
  kotlin: [
    snippetCompletion('fun ${name}(${}) {\n    ${}\n}', { label: 'fun', detail: 'function', type: 'keyword' }),
    snippetCompletion('class ${Name}(${}) {\n    ${}\n}', { label: 'class', detail: 'declaration' }),
    snippetCompletion('data class ${Name}(val ${value}: ${Type})', { label: 'data class', detail: 'declaration' }),
    snippetCompletion('interface ${Name} {\n    ${}\n}', { label: 'interface', detail: 'declaration' }),
    snippetCompletion('when (${value}) {\n    ${} -> ${}\n    else -> ${}\n}', { label: 'when', detail: 'expression' }),
    snippetCompletion('for (${item} in ${items}) {\n    ${}\n}', { label: 'for', detail: 'loop' }),
    snippetCompletion('@Test\nfun `${name}`() {\n    ${}\n}', { label: 'test', detail: 'test function' }),
  ],
}

type ProjectFiles = () => ReadonlyMap<string, string>

const withDocument = (filesOf: ProjectFiles, path: string, context: CompletionContext) =>
  new Map([...filesOf(), [path, context.state.doc.toString()]])

const importSource =
  (language: CompletedLanguage, path: string, filesOf: ProjectFiles): CompletionSource =>
  (context: CompletionContext): CompletionResult | null => {
    const prefix = importPrefixOf(language, context.state.sliceDoc(0, context.pos))
    if (prefix === undefined) return null
    const project = projectImportsOf(withDocument(filesOf, path, context), language)
    return {
      from: context.pos - prefix.length,
      options: [
        ...project.map((label): Completion => ({ label, type: 'namespace', boost: 1 })),
        ...STANDARD_IMPORTS[language].map((label): Completion => ({ label, type: 'namespace' })),
      ],
      validFor: /^[\w./*-]*$/,
    }
  }

const wordSource =
  (language: CompletedLanguage, path: string, filesOf: ProjectFiles): CompletionSource =>
  (context: CompletionContext): CompletionResult | null => {
    if (importPrefixOf(language, context.state.sliceDoc(0, context.pos)) !== undefined) return null
    const word = context.matchBefore(WORD)
    if (word === null && !context.explicit) return null
    const from = word?.from ?? context.pos
    const typed = context.state.sliceDoc(from, context.pos)
    const keywords = KEYWORDS[language].map((label): Completion => ({ label, type: 'keyword', boost: -1 }))
    const names = projectWordsOf(withDocument(filesOf, path, context), language)
      .filter((label) => label !== typed)
      .map((label): Completion => ({ label, type: 'variable' }))
    return { from, options: [...SNIPPETS[language], ...keywords, ...names], validFor: IDENTIFIER }
  }

export const basicCompletions = (language: CompletedLanguage, path: string, filesOf: ProjectFiles): Extension =>
  autocompletion({ override: [importSource(language, path, filesOf), wordSource(language, path, filesOf)] })
