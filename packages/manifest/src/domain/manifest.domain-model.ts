import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { Level, Paradigm, UseCase } from './constants/facet.constant.ts'
import { Language, RuntimeKind, TEST_RUNNER_OF_RUNTIME } from './constants/language.constant.ts'

export const SUPPORTED_SCHEMA_VERSIONS = [1] as const

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TOPIC =
  /^(?:(?:architecture|principle|fundamental)\/|design-pattern\/(?:creational|structural|behavioral|other)\/)[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isRelativePath = (path: string): boolean =>
  path !== '' &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')

const literals = <V extends string>(values: Readonly<Record<string, V>>) => Schema.Literals(Object.values(values))
const withDefault = <S extends Schema.Top & { readonly Encoded: unknown }>(schema: S, value: S['Encoded']) =>
  schema.pipe(Schema.withDecodingDefaultKey(Effect.succeed(value)))

export const SlugSchema = Schema.String.check(Schema.isPattern(SLUG, { expected: 'a kebab-case slug' }))

export const RelativePathSchema = Schema.String.check(
  Schema.makeFilter(isRelativePath, { expected: 'a relative path inside the template, without ".." or a leading "/"' })
)

export const GlobSchema = Schema.String.check(Schema.isMinLength(1, { expected: 'a non-empty glob' }))

const lengthBetween = (min: number, max: number) =>
  Schema.String.check(
    Schema.isMinLength(min, { expected: `${min} to ${max} characters` }),
    Schema.isMaxLength(max, { expected: `${min} to ${max} characters` })
  )

export const TopicSchema = Schema.String.check(
  Schema.isPattern(TOPIC, { expected: 'a topic such as "design-pattern/behavioral/strategy"' })
)

const KeywordSchema = Schema.String.check(
  Schema.isPattern(SLUG, { expected: 'a lowercase word of 1 to 32 characters' }),
  Schema.isMaxLength(32, { expected: 'a lowercase word of 1 to 32 characters' })
)

export const LanguageSchema = literals(Language)
export const RuntimeKindSchema = literals(RuntimeKind)
export const LevelSchema = literals(Level)

export const FacetsSchema = Schema.Struct({
  language: LanguageSchema,
  framework: withDefault(Schema.Array(SlugSchema), []),
  library: withDefault(Schema.Array(SlugSchema), []),
  paradigm: withDefault(Schema.Array(literals(Paradigm)), []),
  topic: Schema.NonEmptyArray(TopicSchema),
  level: LevelSchema,
  useCase: withDefault(Schema.Array(literals(UseCase)), []),
})

export const RuntimeSchema = Schema.Struct({
  kind: RuntimeKindSchema,
  entry: RelativePathSchema,
})

export const CommandsSchema = Schema.Struct({
  start: Schema.optionalKey(RelativePathSchema),
  test: Schema.optionalKey(Schema.Literals(Object.values(TEST_RUNNER_OF_RUNTIME))),
})

export const TestsSchema = Schema.Struct({
  include: Schema.optionalKey(Schema.Array(GlobSchema)),
  exclude: Schema.optionalKey(Schema.Array(GlobSchema)),
})

export const TourStepPathSchema = Schema.String.check(
  Schema.makeFilter((path: string) => isRelativePath(path) && path.startsWith('tour/') && path.endsWith('.md'), {
    expected: 'a Markdown file under tour/',
  })
)

export const TourSchema = Schema.Struct({
  steps: Schema.Array(TourStepPathSchema).check(
    Schema.isMinLength(1, { expected: '1 to 12 steps' }),
    Schema.isMaxLength(12, { expected: '1 to 12 steps' })
  ),
})

export const BaseSchema = Schema.Struct({
  template: Schema.String,
  focus: Schema.optionalKey(Schema.Array(GlobSchema)),
})

export const VariantsSchema = Schema.Struct({
  typescript: Schema.optionalKey(Schema.String),
  javascript: Schema.optionalKey(Schema.String),
  go: Schema.optionalKey(Schema.String),
  kotlin: Schema.optionalKey(Schema.String),
})

export const ExerciseKind = {
  FIX: 'fix',
  REFACTOR: 'refactor',
} as const

export type ExerciseKind = (typeof ExerciseKind)[keyof typeof ExerciseKind]

export const ExerciseSchema = Schema.Struct({
  name: SlugSchema,
  kind: literals(ExerciseKind),
  title: lengthBetween(1, 80),
  level: Schema.optionalKey(LevelSchema),
  from: withDefault(Schema.Literals(['self', 'base']), 'self'),
  failing: Schema.NonEmptyArray(RelativePathSchema),
  solutionFrom: withDefault(Schema.Literals(['start', 'self']), 'start'),
  hints: withDefault(Schema.Array(RelativePathSchema), []),
})

export type Exercise = typeof ExerciseSchema.Type

export const AUTHOR = /^github:[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/

export const ManifestSchema = Schema.Struct({
  schema: Schema.Literals(SUPPORTED_SCHEMA_VERSIONS),
  name: Schema.String.check(
    Schema.isPattern(SLUG, { expected: 'a kebab-case slug of 3 to 64 characters' }),
    Schema.isMinLength(3, { expected: 'a kebab-case slug of 3 to 64 characters' }),
    Schema.isMaxLength(64, { expected: 'a kebab-case slug of 3 to 64 characters' })
  ),
  title: lengthBetween(1, 80),
  summary: lengthBetween(1, 200),
  keywords: withDefault(
    Schema.Array(KeywordSchema).check(Schema.isMaxLength(10, { expected: 'at most 10 keywords' })),
    []
  ),
  license: Schema.String,
  authors: Schema.NonEmptyArray(Schema.String.check(Schema.isPattern(AUTHOR, { expected: '"github:<login>"' }))),
  role: withDefault(Schema.Literals(['template', 'base']), 'template'),
  parent: Schema.optionalKey(Schema.String),
  facets: FacetsSchema,
  runtime: RuntimeSchema,
  commands: Schema.optionalKey(CommandsSchema),
  tests: Schema.optionalKey(TestsSchema),
  tour: Schema.optionalKey(TourSchema),
  base: Schema.optionalKey(BaseSchema),
  variants: Schema.optionalKey(VariantsSchema),
  exercises: withDefault(Schema.Array(ExerciseSchema), []),
})

export type Manifest = typeof ManifestSchema.Type & {
  readonly extensions: Readonly<Record<string, Readonly<Record<string, unknown>>>>
}
