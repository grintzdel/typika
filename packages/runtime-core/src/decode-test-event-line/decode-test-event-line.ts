import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { TestEventSchema, type TestEvent } from '../domain/test-event.domain-model.ts'

const decodeTestEvent = Schema.decodeUnknownOption(Schema.fromJsonString(TestEventSchema))

export const decodeTestEventLine = (runId: string, line: string): Effect.Effect<TestEvent> =>
  Option.match(decodeTestEvent(line), {
    onSome: (event) => Effect.succeed(event),
    onNone: () => {
      const output: TestEvent = { _tag: 'Output', runId, stream: 'stderr', chunk: line }
      return Effect.as(Effect.logWarning('Test event line does not match TestEventSchema', line), output)
    },
  })
