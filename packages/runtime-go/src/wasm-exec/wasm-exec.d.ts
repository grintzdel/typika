declare global {
  class Go {
    argv: Array<string>
    env: Record<string, string>
    exit: (code: number) => void
    readonly importObject: WebAssembly.Imports
    readonly _scheduledTimeouts: Map<number, ReturnType<typeof setTimeout>>
    run(instance: WebAssembly.Instance): Promise<void>
  }
}

export type GoRuntime = Go
