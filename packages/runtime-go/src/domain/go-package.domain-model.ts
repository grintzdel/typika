import type { Diagnostic } from '@typika/runtime-core'

import type { GoImport } from '../parse-go-source/parse-go-source.ts'

export type GoTest = { readonly name: string; readonly file: string }

export type GoFileImport = GoImport & { readonly file: string }

export type GoPackage = {
  readonly importPath: string
  readonly dir: string
  readonly name: string
  readonly goFiles: ReadonlyArray<string>
  readonly testGoFiles: ReadonlyArray<string>
  readonly xtestGoFiles: ReadonlyArray<string>
  readonly imports: ReadonlyArray<string>
  readonly testImports: ReadonlyArray<string>
  readonly xtestImports: ReadonlyArray<string>
  readonly tests: ReadonlyArray<GoTest>
  readonly xtests: ReadonlyArray<GoTest>
  readonly testMain: 'test' | 'xtest' | undefined
}

export type GoModule = {
  readonly path: string
  readonly language: string
  readonly packages: ReadonlyMap<string, GoPackage>
}

export type GoBuildPlan =
  | { readonly _tag: 'Planned'; readonly module: GoModule }
  | { readonly _tag: 'Invalid'; readonly diagnostics: ReadonlyArray<Diagnostic> }
