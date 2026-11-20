import * as Schema from 'effect/Schema'

export const GistSchema = Schema.Struct({
  id: Schema.String,
  html_url: Schema.String,
  files: Schema.Record(
    Schema.String,
    Schema.Struct({
      content: Schema.optionalKey(Schema.String),
      truncated: Schema.optionalKey(Schema.Boolean),
    })
  ),
})

export type Gist = {
  readonly id: string
  readonly htmlUrl: string
  readonly files: ReadonlyMap<string, string>
  readonly isTruncated: boolean
}

export type GistDraft = {
  readonly description: string
  readonly isPublic: boolean
  readonly files: ReadonlyMap<string, string>
}

export const gistOf = (raw: typeof GistSchema.Type): Gist => ({
  id: raw.id,
  htmlUrl: raw.html_url,
  files: new Map(Object.entries(raw.files).map(([name, file]) => [name, file.content ?? ''])),
  isTruncated: Object.values(raw.files).some((file) => file.truncated === true),
})
