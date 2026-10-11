export type HttpRequest = {
  readonly method: 'GET' | 'POST'
  readonly path: string
  readonly body?: unknown
}

export type HttpResponse = {
  readonly status: number
  readonly body: Readonly<Record<string, unknown>>
}
