import { exerciseStates, RuntimeKind, withoutExercises, type TemplateFiles } from '@typika/manifest'
import {
  compileCacheKey,
  DEFAULT_TEST_GLOBS,
  KotlinCompileMode,
  kotlinCompileRequest,
  kotlinSources,
  type KotlinCompileRequest,
} from '@typika/runtime-kotlin'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import type { RegisteredTemplate } from '../check-registry/check-registry.ts'
import { keyOfRef } from '../resolve-ref/resolve-ref.ts'

export type KotlinArtifactRequest = {
  readonly template: string
  readonly key: string
  readonly request: KotlinCompileRequest
}

type KotlinState = {
  readonly label: string
  readonly files: TemplateFiles
  readonly testGlobs: ReadonlyArray<string>
}

const MODES = [KotlinCompileMode.TEST, KotlinCompileMode.RUN]

const exerciseStartsOf = (
  { manifest, files }: RegisteredTemplate,
  baseOf: (ref: string) => RegisteredTemplate | undefined,
  testGlobs: ReadonlyArray<string>
): Effect.Effect<ReadonlyArray<KotlinState>> => {
  const base = manifest.base === undefined ? undefined : baseOf(manifest.base.template)?.files
  return Effect.forEach(manifest.exercises, (exercise) =>
    exerciseStates({ template: files, base, exercise }).pipe(
      Effect.map(({ start }): KotlinState => ({ label: `${manifest.name}/${exercise.name}`, files: start, testGlobs })),
      Effect.option
    )
  ).pipe(Effect.map((starts) => starts.flatMap(Option.toArray)))
}

export const kotlinArtifactRequests = async (
  templates: ReadonlyArray<RegisteredTemplate>
): Promise<ReadonlyArray<KotlinArtifactRequest>> => {
  const byKey = new Map(
    templates.flatMap((template) => Option.toArray(Option.map(keyOfRef(template.entry.ref), (key) => [key, template])))
  )
  const baseOf = (ref: string) =>
    Option.getOrUndefined(Option.flatMap(keyOfRef(ref), (key) => Option.fromNullishOr(byKey.get(key))))
  const kotlin = templates
    .filter(({ manifest }) => manifest.runtime.kind === RuntimeKind.KOTLIN)
    .map((template) => ({ template, testGlobs: template.manifest.tests?.include ?? DEFAULT_TEST_GLOBS }))
  const starts = await Effect.runPromise(
    Effect.forEach(kotlin, ({ template, testGlobs }) => exerciseStartsOf(template, baseOf, testGlobs))
  )
  const states: ReadonlyArray<KotlinState> = [
    ...kotlin.map(({ template, testGlobs }) => ({
      label: template.manifest.name,
      files: withoutExercises(template.files),
      testGlobs,
    })),
    ...starts.flat(),
  ]
  const requests = await Promise.all(
    states.flatMap(({ label, files, testGlobs }) =>
      MODES.map(async (mode) => {
        const request = kotlinCompileRequest(mode, kotlinSources(files, mode, testGlobs))
        return { template: label, key: await compileCacheKey(request), request }
      })
    )
  )
  return requests.filter(({ key }, index) => requests.findIndex((request) => request.key === key) === index)
}
