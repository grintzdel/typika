import { Language } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'

import { fetchPublicConfig } from '../../../shared/core/adapters/app-config.fetch.adapter.ts'
import type { HiddenLanguages } from '../domain/hidden-languages.domain-model.ts'

const NOTHING_HIDDEN: HiddenLanguages = []

export const hiddenLanguagesAtom = Atom.make(
  fetchPublicConfig('/config.json').pipe(
    Effect.map((config): HiddenLanguages => (config.kotlinCompilerUrl === undefined ? [Language.KOTLIN] : [])),
    Effect.catch(() => Effect.succeed(NOTHING_HIDDEN))
  )
)
