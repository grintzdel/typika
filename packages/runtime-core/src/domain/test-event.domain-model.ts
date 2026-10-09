import * as Schema from 'effect/Schema'

export const TestLocationSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Int,
  column: Schema.optionalKey(Schema.Int),
})

export type TestLocation = typeof TestLocationSchema.Type

export const TestFailureSchema = Schema.Struct({
  message: Schema.String,
  expected: Schema.optionalKey(Schema.String),
  actual: Schema.optionalKey(Schema.String),
  stack: Schema.optionalKey(Schema.String),
  location: Schema.optionalKey(TestLocationSchema),
})

export type TestFailure = typeof TestFailureSchema.Type

export const DiagnosticSchema = Schema.Struct({
  severity: Schema.Literals(['error', 'warning']),
  message: Schema.String,
  location: Schema.optionalKey(TestLocationSchema),
})

export type Diagnostic = typeof DiagnosticSchema.Type

export const RunStatus = {
  PASSED: 'passed',
  FAILED: 'failed',
  ERRORED: 'errored',
} as const

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus]

const testFields = {
  runId: Schema.String,
  testId: Schema.String,
  suiteId: Schema.optionalKey(Schema.String),
  name: Schema.String,
  file: Schema.String,
}

export const TestEventSchema = Schema.Union([
  Schema.TaggedStruct('RunStarted', { runId: Schema.String, startedAt: Schema.Number }),
  Schema.TaggedStruct('Diagnostics', { runId: Schema.String, diagnostics: Schema.Array(DiagnosticSchema) }),
  Schema.TaggedStruct('SuiteStarted', {
    runId: Schema.String,
    suiteId: Schema.String,
    parentId: Schema.optionalKey(Schema.String),
    name: Schema.String,
    file: Schema.String,
  }),
  Schema.TaggedStruct('TestPassed', { ...testFields, durationMs: Schema.Number }),
  Schema.TaggedStruct('TestFailed', { ...testFields, durationMs: Schema.Number, failure: TestFailureSchema }),
  Schema.TaggedStruct('TestSkipped', {
    ...testFields,
    reason: Schema.optionalKey(Schema.Literals(['skip', 'todo', 'filtered'])),
  }),
  Schema.TaggedStruct('Output', {
    runId: Schema.String,
    testId: Schema.optionalKey(Schema.String),
    stream: Schema.Literals(['stdout', 'stderr']),
    chunk: Schema.String,
  }),
  Schema.TaggedStruct('SuiteFinished', { runId: Schema.String, suiteId: Schema.String }),
  Schema.TaggedStruct('RunFinished', {
    runId: Schema.String,
    status: Schema.Literals(Object.values(RunStatus)),
    passed: Schema.Int,
    failed: Schema.Int,
    skipped: Schema.Int,
    durationMs: Schema.Number,
  }),
])

export type TestEvent = typeof TestEventSchema.Type
