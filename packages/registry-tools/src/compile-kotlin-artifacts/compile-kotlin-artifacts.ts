import type { KotlinCompilation, KotlinCompilerClient } from '@typika/runtime-kotlin'
import * as Effect from 'effect/Effect'

import { KotlinArtifactFailedError } from '../domain/errors/kotlin-artifact-failed.error.ts'
import type { KotlinArtifactRequest } from '../kotlin-artifact-requests/kotlin-artifact-requests.ts'

export type KotlinArtifactFile = { readonly key: string; readonly compilation: KotlinCompilation }

export const compileKotlinArtifacts = (
  requests: ReadonlyArray<KotlinArtifactRequest>,
  compiler: KotlinCompilerClient
) =>
  Effect.forEach(requests, ({ template, key, request }) =>
    compiler
      .compile(request.mode, request.files)
      .pipe(
        Effect.flatMap((compilation) =>
          compilation._tag === 'Failed'
            ? Effect.fail(
                new KotlinArtifactFailedError({ template, mode: request.mode, diagnostics: compilation.diagnostics })
              )
            : Effect.succeed<KotlinArtifactFile>({ key, compilation })
        )
      )
  )
