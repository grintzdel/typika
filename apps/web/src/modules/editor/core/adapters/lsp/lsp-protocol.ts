import * as Schema from 'effect/Schema'

const PositionSchema = Schema.Struct({ line: Schema.Number, character: Schema.Number })

export const RangeSchema = Schema.Struct({ start: PositionSchema, end: PositionSchema })

export const TextEditSchema = Schema.Struct({ range: RangeSchema, newText: Schema.String })

const MarkupSchema = Schema.Struct({ kind: Schema.String, value: Schema.String })

const MarkedStringSchema = Schema.Union([
  Schema.String,
  Schema.Struct({ language: Schema.String, value: Schema.String }),
])

export const DocumentationSchema = Schema.Union([Schema.String, MarkupSchema])

const optional = <S extends Schema.Top>(schema: S) => Schema.optionalKey(Schema.NullOr(schema))

export const CompletionItemSchema = Schema.Struct({
  label: Schema.String,
  kind: optional(Schema.Number),
  sortText: optional(Schema.String),
  detail: optional(Schema.String),
  documentation: optional(DocumentationSchema),
  textEdit: optional(
    Schema.Union([TextEditSchema, Schema.Struct({ insert: RangeSchema, replace: RangeSchema, newText: Schema.String })])
  ),
  additionalTextEdits: optional(Schema.Array(TextEditSchema)),
})

export type LspCompletionItem = typeof CompletionItemSchema.Type

export const CompletionResultSchema = Schema.NullOr(
  Schema.Union([Schema.Array(CompletionItemSchema), Schema.Struct({ items: Schema.Array(CompletionItemSchema) })])
)

export const HoverSchema = Schema.NullOr(
  Schema.Struct({
    contents: Schema.Union([MarkupSchema, MarkedStringSchema, Schema.Array(MarkedStringSchema)]),
    range: optional(RangeSchema),
  })
)

export const SignatureHelpSchema = Schema.NullOr(
  Schema.Struct({
    signatures: Schema.Array(
      Schema.Struct({
        label: Schema.String,
        documentation: optional(DocumentationSchema),
        parameters: optional(
          Schema.Array(
            Schema.Struct({ label: Schema.Union([Schema.String, Schema.Tuple([Schema.Number, Schema.Number])]) })
          )
        ),
        activeParameter: optional(Schema.Number),
      })
    ),
    activeSignature: optional(Schema.Number),
    activeParameter: optional(Schema.Number),
  })
)

const LocationSchema = Schema.Struct({ uri: Schema.String, range: RangeSchema })

const LocationLinkSchema = Schema.Struct({ targetUri: Schema.String, targetSelectionRange: RangeSchema })

export const LocationsSchema = Schema.NullOr(
  Schema.Union([LocationSchema, Schema.Array(Schema.Union([LocationSchema, LocationLinkSchema]))])
)

export const WorkspaceEditSchema = Schema.NullOr(
  Schema.Struct({
    changes: optional(Schema.Record(Schema.String, Schema.Array(TextEditSchema))),
    documentChanges: optional(
      Schema.Array(
        Schema.Struct({ textDocument: Schema.Struct({ uri: Schema.String }), edits: Schema.Array(TextEditSchema) })
      )
    ),
  })
)

export const DiagnosticSchema = Schema.Struct({
  range: RangeSchema,
  severity: optional(Schema.Number),
  message: Schema.String,
})

export type LspDiagnostic = typeof DiagnosticSchema.Type

export const PublishDiagnosticsSchema = Schema.Struct({
  uri: Schema.String,
  version: optional(Schema.Number),
  diagnostics: Schema.Array(DiagnosticSchema),
})

export const MessageSchema = Schema.Struct({
  id: optional(Schema.Union([Schema.Number, Schema.String])),
  method: Schema.optionalKey(Schema.String),
  params: Schema.optionalKey(Schema.Unknown),
  result: Schema.optionalKey(Schema.Unknown),
  error: Schema.optionalKey(Schema.Unknown),
})

export const ConfigurationParamsSchema = Schema.Struct({ items: Schema.Array(Schema.Unknown) })
