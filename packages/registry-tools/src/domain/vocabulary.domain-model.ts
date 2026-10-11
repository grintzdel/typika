import { TopicSchema } from '@typika/manifest'
import * as Schema from 'effect/Schema'

export const VocabularySchema = Schema.Struct({
  topics: Schema.Array(
    Schema.Struct({
      id: TopicSchema,
      label: Schema.String.check(Schema.isMinLength(1, { expected: 'a non-empty label' })),
    })
  ),
})

export type Vocabulary = typeof VocabularySchema.Type
