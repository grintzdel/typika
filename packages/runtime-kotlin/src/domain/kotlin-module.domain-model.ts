export type KotlinConsoleMethod = 'log' | 'info' | 'debug' | 'warn' | 'error'

export type KotlinConsole = Readonly<Record<KotlinConsoleMethod, (...args: ReadonlyArray<unknown>) => void>>

export type KotlinModuleGlobals = {
  readonly describe: (name: string, fn: () => void) => void
  readonly xdescribe: (name: string, fn: () => void) => void
  readonly it: (name: string, fn: () => unknown) => void
  readonly xit: (name: string, fn: () => unknown) => void
  readonly console: KotlinConsole
}

export type LoadKotlinModule = (globals: KotlinModuleGlobals) => Promise<void>
