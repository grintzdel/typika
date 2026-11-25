export const DiagnosticSeverity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const

export type DiagnosticSeverity = (typeof DiagnosticSeverity)[keyof typeof DiagnosticSeverity]

export type EditorDiagnostic = {
  readonly from: number
  readonly to: number
  readonly severity: DiagnosticSeverity
  readonly message: string
}

export type CompletionItem = {
  readonly label: string
  readonly kind: string
  readonly sortText: string
  readonly source: string | undefined
  readonly hasAction: boolean
}

export type CompletionList = {
  readonly from: number
  readonly items: ReadonlyArray<CompletionItem>
}

export type TextChange = {
  readonly from: number
  readonly to: number
  readonly insert: string
}

export type QuickInfo = {
  readonly from: number
  readonly to: number
  readonly signature: string
  readonly documentation: string
}

export type SignatureHelp = {
  readonly prefix: string
  readonly parameters: ReadonlyArray<string>
  readonly separator: string
  readonly suffix: string
  readonly activeParameter: number
  readonly documentation: string
}

export type SourceRange = {
  readonly path: string
  readonly from: number
  readonly to: number
}

export type SymbolReference = SourceRange & {
  readonly line: number
  readonly lineText: string
  readonly isDefinition: boolean
}

export type ReferenceSearch = {
  readonly symbol: string
  readonly references: ReadonlyArray<SymbolReference>
}

export type FileRename = {
  readonly path: string
  readonly changes: ReadonlyArray<TextChange>
  readonly content: string
}

export type LanguageServiceFiles = Readonly<Record<string, string>>

export type TypeScriptProject = {
  readonly setFiles: (files: LanguageServiceFiles) => void
  readonly updateFile: (path: string, content: string) => void
  readonly diagnostics: (path: string) => ReadonlyArray<EditorDiagnostic>
  readonly completions: (path: string, position: number) => CompletionList | undefined
  readonly completionChanges: (path: string, position: number, item: CompletionItem) => ReadonlyArray<TextChange>
  readonly quickInfo: (path: string, position: number) => QuickInfo | undefined
  readonly signatureHelp: (path: string, position: number) => SignatureHelp | undefined
  readonly definition: (path: string, position: number) => ReadonlyArray<SourceRange>
  readonly references: (path: string, position: number) => ReferenceSearch | undefined
  readonly rename: (path: string, position: number, newName: string) => ReadonlyArray<FileRename> | undefined
}

const ANALYZED = /\.(?:[cm]?tsx?|[cm]?jsx?)$/
const CONFIGURATION = /(?:^|\/)(?:tsconfig\.json|package\.json)$/
const EXERCISES = 'exercises/'

export const isAnalyzedPath = (path: string) => ANALYZED.test(path) && !path.startsWith(EXERCISES)

export const isLanguageServiceInput = (path: string) => ANALYZED.test(path) || CONFIGURATION.test(path)
