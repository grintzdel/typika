import * as Schema from 'effect/Schema'

export interface RunCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly env?: Readonly<Record<string, string>>
}

export const ProcessOutputSchema = Schema.Union([
  Schema.TaggedStruct('Stdout', { chunk: Schema.String }),
  Schema.TaggedStruct('Stderr', { chunk: Schema.String }),
  Schema.TaggedStruct('Exit', { code: Schema.Int }),
])

export type ProcessOutput = typeof ProcessOutputSchema.Type
