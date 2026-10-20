import { resolve } from 'node:path'

import { isWarning, type Manifest } from '@typika/manifest'
import { loadTemplateRunners } from '@typika/template-check'
import * as Effect from 'effect/Effect'

import packageJson from '../../package.json' with { type: 'json' }
import { createProject } from '../create-project/create-project.ts'
import { ExitCode } from '../domain/constants/exit-code.constant.ts'
import { nextSteps } from '../next-steps/next-steps.ts'
import { parseCliArgs, USAGE, type CliCommand, type SourceArgs } from '../parse-args/parse-args.ts'
import { readProject } from '../read-project/read-project.ts'
import { makeTemplateSource } from '../template-source/template-source.ts'
import { validateProject } from '../validate-project/validate-project.ts'
import { writeProject } from '../write-project/write-project.ts'

export type CliIo = {
  readonly cwd: string
  readonly stdout: (line: string) => void
  readonly stderr: (line: string) => void
  readonly fetch?: typeof globalThis.fetch
}

type Failure = { readonly code: ExitCode; readonly error: string; readonly message: string }

type CreateFailure = Effect.Error<ReturnType<typeof createProject> | ReturnType<typeof writeProject>>

const failureOf = (error: CreateFailure): Failure => {
  const fail = (code: ExitCode, message: string) => ({ code, error: error._tag, message })
  switch (error._tag) {
    case 'ArgsInvalidError':
      return fail(ExitCode.ARGS_INVALID, error.message)
    case 'TemplateNotFoundError':
      return fail(ExitCode.TEMPLATE_NOT_FOUND, `Template "${error.template}" was not found.`)
    case 'ExerciseBaseMissingError':
      return fail(ExitCode.TEMPLATE_NOT_FOUND, `The base of exercise "${error.exercise}" was not found.`)
    case 'VariantNotFoundError':
      return fail(ExitCode.VARIANT_OR_EXERCISE_NOT_FOUND, `${error.template} has no ${error.language} variant.`)
    case 'ExerciseNotFoundError':
      return fail(ExitCode.VARIANT_OR_EXERCISE_NOT_FOUND, `${error.template} has no exercise "${error.exercise}".`)
    case 'ManifestInvalidError':
      return fail(
        ExitCode.MANIFEST_INVALID,
        [
          'The manifest of the template is invalid:',
          ...error.issues.map((issue) => `  ${issue.code} ${issue.path}: ${issue.message}`),
        ].join('\n')
      )
    case 'ManifestNotFoundError':
      return fail(ExitCode.MANIFEST_INVALID, 'The template has no typika.toml.')
    case 'TargetNotEmptyError':
      return fail(ExitCode.TARGET_NOT_EMPTY, `${error.dir} is not empty: choose another directory or pass --force.`)
    case 'NetworkError':
      return fail(ExitCode.NETWORK, `Cannot download ${error.url}: ${error.reason}.`)
  }
  return fail(ExitCode.UNEXPECTED, `${error.url} is not a Typika registry index.`)
}

const sourceOf = (args: SourceArgs, io: CliIo) =>
  makeTemplateSource({
    indexUrl: args.registry,
    archiveUrlTemplate: args.archiveUrl,
    ...(io.fetch === undefined ? {} : { fetch: io.fetch }),
  })

const create = (command: Extract<CliCommand, { _tag: 'Create' }>, io: CliIo) =>
  Effect.gen(function* () {
    const plan = yield* createProject(sourceOf(command, io), {
      template: command.template,
      keepTour: command.keepTour,
      ...(command.variant === undefined ? {} : { variant: command.variant }),
      ...(command.exercise === undefined ? {} : { exercise: command.exercise }),
    })
    const dir = command.dir ?? plan.manifest.name
    yield* writeProject(resolve(io.cwd, dir), plan.files, { force: command.force })
    return { ...plan, dir, next: nextSteps(dir, plan.manifest.facets.language) }
  }).pipe(
    Effect.match({
      onFailure: (error) => {
        const failure = failureOf(error)
        if (command.json) io.stdout(JSON.stringify({ ok: false, ...failure }))
        else io.stderr(failure.message)
        return failure.code
      },
      onSuccess: ({ manifest, ref, dir, files, warnings, next }) => {
        if (command.json)
          io.stdout(
            JSON.stringify({ ok: true, code: 0, template: manifest.name, ref, dir, files: files.size, warnings, next })
          )
        else {
          for (const warning of warnings) io.stderr(`warning: ${warning}`)
          io.stdout(`Created ${manifest.name} in ${dir} from ${ref}.`)
          io.stdout(['', 'Next steps:', ...next.map((step) => `  ${step}`)].join('\n'))
        }
        return ExitCode.SUCCESS
      },
    })
  )

const validate = (command: Extract<CliCommand, { _tag: 'Validate' }>, io: CliIo) =>
  Effect.gen(function* () {
    const source = sourceOf(command, io)
    const index = yield* Effect.option(source.index)
    const runners = command.run
      ? yield* Effect.promise(() =>
          loadTemplateRunners(command.kotlinCompiler === undefined ? {} : { kotlinCompilerUrl: command.kotlinCompiler })
        )
      : {}
    const report = yield* validateProject({
      files: yield* Effect.promise(() => readProject(resolve(io.cwd, command.dir))),
      index: index._tag === 'Some' ? index.value : undefined,
      source,
      run: command.run,
      runnerOf: (manifest: Manifest) => runners[manifest.runtime.kind],
    })
    const errors = report.issues.filter((issue) => !isWarning(issue))
    const code = errors.length === 0 ? ExitCode.SUCCESS : ExitCode.MANIFEST_INVALID
    if (command.json) io.stdout(JSON.stringify({ ok: code === ExitCode.SUCCESS, code, ...report }))
    else {
      for (const issue of report.issues) io.stdout(`${issue.code} ${issue.path}: ${issue.message}`)
      for (const note of report.notes) io.stdout(note)
      const warnings = report.issues.length - errors.length
      io.stdout(`${report.name ?? command.dir}: ${errors.length} errors, ${warnings} warnings.`)
    }
    return code
  })

export const runCli = (args: ReadonlyArray<string>, io: CliIo): Promise<ExitCode> =>
  Effect.runPromise(
    parseCliArgs(args).pipe(
      Effect.matchEffect({
        onFailure: (error) =>
          Effect.sync(() => {
            io.stderr(`${error.message}\n\n${USAGE}`)
            return ExitCode.ARGS_INVALID
          }),
        onSuccess: (command) => {
          switch (command._tag) {
            case 'Help':
              return Effect.sync(() => {
                io.stdout(USAGE)
                return ExitCode.SUCCESS
              })
            case 'Version':
              return Effect.sync(() => {
                io.stdout(packageJson.version)
                return ExitCode.SUCCESS
              })
            case 'Create':
              return create(command, io)
          }
          return validate(command, io)
        },
      })
    )
  ).catch((cause: unknown) => {
    io.stderr(`Unexpected error: ${cause instanceof Error ? cause.message : String(cause)}`)
    return ExitCode.UNEXPECTED
  })
