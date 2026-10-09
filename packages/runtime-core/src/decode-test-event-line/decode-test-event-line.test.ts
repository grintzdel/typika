import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { RUN_ID, testFailed } from '../__tests__/test-event.factory.ts'
import { decodeTestEventLine } from './decode-test-event-line.ts'

describe('decodeTestEventLine', () => {
  it('decodes a JSON line into its test event', async () => {
    const event = testFailed('t1', { failure: { message: 'boom', location: { file: 'a.ts', line: 3 } } })

    expect(await Effect.runPromise(decodeTestEventLine(RUN_ID, JSON.stringify(event)))).toEqual(event)
  })

  it.each([['not json'], ['{"_tag":"TestPassed","runId":"run-1"}'], ['{"_tag":"Unknown"}']])(
    'forwards %s as stderr output',
    async (line) => {
      expect(await Effect.runPromise(decodeTestEventLine(RUN_ID, line))).toEqual({
        _tag: 'Output',
        runId: RUN_ID,
        stream: 'stderr',
        chunk: line,
      })
    }
  )
})
