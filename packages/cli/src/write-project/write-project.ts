import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'

import { TargetNotEmptyError } from '../domain/errors/target-not-empty.error.ts'

const isAbsent = (cause: unknown) => cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'

const entriesOf = (dir: string) =>
  Effect.tryPromise(() => readdir(dir)).pipe(
    Effect.catch((error) =>
      isAbsent(error.cause) ? Effect.succeed([]) : Effect.fail(new TargetNotEmptyError({ dir }))
    )
  )

const writeAll = (dir: string, files: TemplateFiles) =>
  Effect.promise(() =>
    Promise.all(
      [...files].map(async ([path, content]) => {
        const target = join(dir, path)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, content)
      })
    )
  )

export const writeProject = (dir: string, files: TemplateFiles, { force }: { readonly force: boolean }) =>
  Effect.flatMap(entriesOf(dir), (entries) =>
    !force && entries.length > 0 ? Effect.fail(new TargetNotEmptyError({ dir })) : Effect.asVoid(writeAll(dir, files))
  )
