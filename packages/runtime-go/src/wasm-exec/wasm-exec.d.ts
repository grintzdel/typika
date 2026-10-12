declare global {
  class Go {
    argv: Array<string>
    env: Record<string, string>
    exit: (code: number) => void
    readonly importObject: WebAssembly.Imports
    run(instance: WebAssembly.Instance): Promise<void>
  }
}

export type GoRuntime = Go
