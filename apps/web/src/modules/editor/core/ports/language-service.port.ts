import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Scope from 'effect/Scope'

import type { EditorLanguageServiceError } from '../domain/errors/editor-language-service.error.ts'
import type { LanguageServiceFiles, TypeScriptProject } from '../domain/language-service.domain-model.ts'

type Remote<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Effect.Effect<R, EditorLanguageServiceError>
    : never
}

export type LanguageServiceSession = Remote<Omit<TypeScriptProject, 'setFiles'>>

export class LanguageServicePort extends Context.Service<
  LanguageServicePort,
  {
    readonly start: (
      files: LanguageServiceFiles
    ) => Effect.Effect<LanguageServiceSession, EditorLanguageServiceError, Scope.Scope>
  }
>()('@typika/web/LanguageServicePort') {}
