import { parseArgs } from 'node:util'

import { Language } from '@typika/manifest'
import * as Effect from 'effect/Effect'

import { ArgsInvalidError } from '../domain/errors/args-invalid.error.ts'
import { DEFAULT_ARCHIVE_URL_TEMPLATE, DEFAULT_INDEX_URL } from '../template-source/template-source.ts'

export type SourceArgs = { readonly registry: string; readonly archiveUrl: string; readonly json: boolean }

export type CliCommand =
  | { readonly _tag: 'Help' }
  | { readonly _tag: 'Version' }
  | (SourceArgs & {
      readonly _tag: 'Create'
      readonly template: string
      readonly dir: string | undefined
      readonly variant: Language | undefined
      readonly exercise: string | undefined
      readonly keepTour: boolean
      readonly force: boolean
    })
  | (SourceArgs & {
      readonly _tag: 'Validate'
      readonly dir: string
      readonly run: boolean
      readonly kotlinCompiler: string | undefined
    })

export const USAGE = `Usage:
  typika create <template> [dir] [--variant <language>] [--exercise <name>] [--keep-tour] [--no-install]
                [--registry <index.json url>] [--archive-url <url template>] [--force] [--json]
  typika validate [dir] [--run] [--kotlin-compiler <url>] [--registry <index.json url>] [--archive-url <url template>] [--json]
  typika --version | --help

<template> is a registry name (strategy-ts) or a ref (github:owner/repo/path@sha).
--archive-url takes {owner}, {repo} and {ref}; it defaults to ${DEFAULT_ARCHIVE_URL_TEMPLATE}.`

const LANGUAGES: ReadonlyArray<string> = Object.values(Language)
const isLanguage = (value: string): value is Language => LANGUAGES.includes(value)

const SOURCE_OPTIONS = {
  registry: { type: 'string', default: DEFAULT_INDEX_URL },
  'archive-url': { type: 'string', default: DEFAULT_ARCHIVE_URL_TEMPLATE },
  json: { type: 'boolean', default: false },
} as const

const parse = <const O extends NonNullable<Parameters<typeof parseArgs>[0]>['options']>(
  args: ReadonlyArray<string>,
  options: O
) =>
  Effect.try({
    try: () => parseArgs({ args: [...args], options, allowPositionals: true, strict: true }),
    catch: (cause) => new ArgsInvalidError({ message: cause instanceof Error ? cause.message : String(cause) }),
  })

const parseCreate = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const { values, positionals } = yield* parse(args, {
      ...SOURCE_OPTIONS,
      variant: { type: 'string' },
      exercise: { type: 'string' },
      'keep-tour': { type: 'boolean', default: false },
      'no-install': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    })
    const [template, dir, ...rest] = positionals
    if (template === undefined) return yield* new ArgsInvalidError({ message: 'create needs a <template>.' })
    if (rest.length > 0) return yield* new ArgsInvalidError({ message: `Unexpected argument "${rest.join(' ')}".` })
    const { variant } = values
    if (variant !== undefined && !isLanguage(variant))
      return yield* new ArgsInvalidError({
        message: `--variant must be one of ${LANGUAGES.join(', ')}, got "${variant}".`,
      })
    return {
      _tag: 'Create',
      template,
      dir,
      variant,
      exercise: values.exercise,
      keepTour: values['keep-tour'],
      force: values.force,
      registry: values.registry,
      archiveUrl: values['archive-url'],
      json: values.json,
    } satisfies CliCommand
  })

const parseValidate = (args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const { values, positionals } = yield* parse(args, {
      ...SOURCE_OPTIONS,
      run: { type: 'boolean', default: false },
      'kotlin-compiler': { type: 'string' },
    })
    const [dir = '.', ...rest] = positionals
    if (rest.length > 0) return yield* new ArgsInvalidError({ message: `Unexpected argument "${rest.join(' ')}".` })
    return {
      _tag: 'Validate',
      dir,
      run: values.run,
      kotlinCompiler: values['kotlin-compiler'],
      registry: values.registry,
      archiveUrl: values['archive-url'],
      json: values.json,
    } satisfies CliCommand
  })

export const parseCliArgs = (args: ReadonlyArray<string>): Effect.Effect<CliCommand, ArgsInvalidError> => {
  const [command, ...rest] = args
  if (command === '--help' || command === '-h') return Effect.succeed({ _tag: 'Help' })
  if (command === '--version' || command === '-v') return Effect.succeed({ _tag: 'Version' })
  if (command === 'create') return parseCreate(rest)
  if (command === 'validate') return parseValidate(rest)
  return Effect.fail(
    new ArgsInvalidError({ message: command === undefined ? 'Missing command.' : `Unknown command "${command}".` })
  )
}
