import { describe, expect, it } from 'vitest'

import { makeTest2JsonConverter, type Test2JsonEvent } from './convert-test2json.ts'

const M = '\u0016'

const convert = (chunks: ReadonlyArray<string>, exitCode: number) => {
  const events: Array<Test2JsonEvent> = []
  const converter = makeTest2JsonConverter((event) => events.push(event))
  for (const chunk of chunks) converter.write(chunk)
  converter.exited(exitCode)
  converter.close()
  return events
}

describe('makeTest2JsonConverter', () => {
  it('turns the framing lines of a verbose run into actions, and attributes the output', () => {
    const events = convert(
      [
        `${M}=== RUN   TestQuote\n`,
        `${M}=== RUN   TestQuote/adds_shipping\n`,
        '    quote_test.go:12: got 4.90, want 5.90\n',
        `${M}--- FAIL: TestQuote (0.01s)\n`,
        `${M}    --- FAIL: TestQuote/adds_shipping (0.00s)\n`,
        `${M}FAIL\n`,
      ],
      1
    )

    expect(events).toEqual([
      { Action: 'start' },
      { Action: 'run', Test: 'TestQuote' },
      { Action: 'output', Test: 'TestQuote', Output: '=== RUN   TestQuote\n' },
      { Action: 'run', Test: 'TestQuote/adds_shipping' },
      { Action: 'output', Test: 'TestQuote/adds_shipping', Output: '=== RUN   TestQuote/adds_shipping\n' },
      { Action: 'output', Test: 'TestQuote/adds_shipping', Output: '    quote_test.go:12: got 4.90, want 5.90\n' },
      { Action: 'output', Test: 'TestQuote', Output: '--- FAIL: TestQuote (0.01s)\n' },
      { Action: 'output', Test: 'TestQuote/adds_shipping', Output: '    --- FAIL: TestQuote/adds_shipping (0.00s)\n' },
      { Action: 'fail', Test: 'TestQuote/adds_shipping', Elapsed: 0 },
      { Action: 'fail', Test: 'TestQuote', Elapsed: 0.01 },
      { Action: 'output', Output: 'FAIL\n' },
      { Action: 'fail' },
    ])
  })

  it('splits lines across chunks and at a marker in the middle of a line', () => {
    const events = convert([`${M}=== RUN   TestA\nhal`, `f line${M}--- PASS: TestA (0.00s)\n`, `${M}PASS\n`], 0)

    expect(events.filter((event) => event.Action !== 'output')).toEqual([
      { Action: 'start' },
      { Action: 'run', Test: 'TestA' },
      { Action: 'pass', Test: 'TestA', Elapsed: 0 },
      { Action: 'pass' },
    ])
    expect(events.find((event) => event.Output === 'half line')).toEqual({
      Action: 'output',
      Test: 'TestA',
      Output: 'half line',
    })
  })

  it('treats an unmarked framing line as output once markers have been seen', () => {
    const events = convert([`${M}=== RUN   TestA\n`, '--- FAIL: TestFake\n', `${M}--- PASS: TestA (0.00s)\n`], 0)

    expect(events.filter((event) => event.Action === 'fail')).toEqual([])
    expect(events).toContainEqual({ Action: 'output', Test: 'TestA', Output: '--- FAIL: TestFake\n' })
  })
})
