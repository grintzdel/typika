import * as Schema from 'effect/Schema'

export const CreatedRepositorySchema = Schema.Struct({
  full_name: Schema.String,
  html_url: Schema.String,
  default_branch: Schema.String,
})

export const GitObjectSchema = Schema.Struct({ sha: Schema.String })

export const GitRefSchema = Schema.Struct({ ref: Schema.String })

export type RepositoryDraft = {
  readonly name: string
  readonly description: string
  readonly message: string
  readonly files: ReadonlyMap<string, string>
}

export type Repository = { readonly fullName: string; readonly htmlUrl: string }
