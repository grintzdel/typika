export type GoListError = {
  readonly ImportStack: ReadonlyArray<string>
  readonly Pos: string
  readonly Err: string
}

export type GoListModule = {
  readonly Path: string
  readonly Main: boolean
  readonly Dir: string
  readonly GoMod: string
  readonly GoVersion: string
}

export type GoListPackage = {
  readonly Dir?: string
  readonly ImportPath: string
  readonly Name?: string
  readonly ForTest?: string
  readonly Module?: GoListModule
  readonly DepOnly?: boolean
  readonly GoFiles?: ReadonlyArray<string>
  readonly CgoFiles?: ReadonlyArray<string>
  readonly CompiledGoFiles?: ReadonlyArray<string>
  readonly IgnoredGoFiles?: ReadonlyArray<string>
  readonly IgnoredOtherFiles?: ReadonlyArray<string>
  readonly CFiles?: ReadonlyArray<string>
  readonly CXXFiles?: ReadonlyArray<string>
  readonly MFiles?: ReadonlyArray<string>
  readonly HFiles?: ReadonlyArray<string>
  readonly FFiles?: ReadonlyArray<string>
  readonly SFiles?: ReadonlyArray<string>
  readonly SwigFiles?: ReadonlyArray<string>
  readonly SwigCXXFiles?: ReadonlyArray<string>
  readonly SysoFiles?: ReadonlyArray<string>
  readonly EmbedFiles?: ReadonlyArray<string>
  readonly Imports?: ReadonlyArray<string>
  readonly ImportMap?: Readonly<Record<string, string>>
  readonly Error?: GoListError
  readonly DepsErrors?: ReadonlyArray<GoListError>
  readonly TestGoFiles?: ReadonlyArray<string>
  readonly TestImports?: ReadonlyArray<string>
  readonly XTestGoFiles?: ReadonlyArray<string>
  readonly XTestImports?: ReadonlyArray<string>
}

export type GoListField = keyof GoListPackage

export const isGoListPackage = (value: unknown): value is GoListPackage =>
  typeof value === 'object' && value !== null && 'ImportPath' in value && typeof value.ImportPath === 'string'

export const parseGoListJson = (stdout: string): ReadonlyArray<GoListPackage> =>
  stdout
    .split(/\n(?=\{)/)
    .filter((chunk) => chunk.trim() !== '')
    .map((chunk): unknown => JSON.parse(chunk))
    .filter(isGoListPackage)

export type StdPackages = ReadonlyMap<string, GoListPackage>

export type GoCommandResult = { readonly stdout: string; readonly stderr: string; readonly code: number }
