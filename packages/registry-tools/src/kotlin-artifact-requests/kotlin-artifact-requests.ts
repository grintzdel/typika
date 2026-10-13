import { RuntimeKind, withoutExercises } from '@typika/manifest'
import {
  compileCacheKey,
  DEFAULT_TEST_GLOBS,
  KotlinCompileMode,
  kotlinCompileRequest,
  kotlinSources,
  type KotlinCompileRequest,
} from '@typika/runtime-kotlin'

import type { RegisteredTemplate } from '../check-registry/check-registry.ts'

export type KotlinArtifactRequest = {
  readonly template: string
  readonly key: string
  readonly request: KotlinCompileRequest
}

const MODES = [KotlinCompileMode.TEST, KotlinCompileMode.RUN]

export const kotlinArtifactRequests = (
  templates: ReadonlyArray<RegisteredTemplate>
): Promise<ReadonlyArray<KotlinArtifactRequest>> =>
  Promise.all(
    templates
      .filter(({ manifest }) => manifest.runtime.kind === RuntimeKind.KOTLIN)
      .flatMap(({ manifest, files }) =>
        MODES.map(async (mode) => {
          const sources = kotlinSources(withoutExercises(files), mode, manifest.tests?.include ?? DEFAULT_TEST_GLOBS)
          const request = kotlinCompileRequest(mode, sources)
          return { template: manifest.name, key: await compileCacheKey(request), request }
        })
      )
  )
