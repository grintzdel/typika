const NO_VALUE = Symbol('no value')

export class AssertionError extends Error {
  override readonly name = 'AssertionError'
  readonly expected: unknown
  readonly actual: unknown
  readonly showDiff: boolean

  constructor(message: string, expected: unknown = NO_VALUE, actual: unknown = NO_VALUE) {
    super(message)
    this.showDiff = expected !== NO_VALUE && actual !== NO_VALUE
    this.expected = expected
    this.actual = actual
  }
}
