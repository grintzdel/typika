import { parseTemplateRef, validateTemplate, type TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import type { RegisteredTemplate } from '../check-registry/check-registry.ts'
import { RegistryCategory } from '../domain/constants/registry-category.constant.ts'
import { makeGitResolver } from '../resolve-ref/resolve-ref.ts'
import { REPO_ROOT } from './registry.factory.ts'

export const STRATEGY_KOTLIN_REF = 'github:typika-app/templates/strategy/kotlin@df0fc9164336'
export const STRATEGY_BASE_KOTLIN_REF = 'github:typika-app/templates/strategy-base/kotlin@df0fc9164336'
export const STRATEGY_TS_REF = 'github:typika-app/templates/strategy/ts@df0fc9164336'

const resolve = makeGitResolver({ 'typika-app/templates': { repo: REPO_ROOT, prefix: 'templates' } })

export const registeredTemplate = (
  ref: string,
  edit: (files: TemplateFiles) => TemplateFiles = (files) => files
): Promise<RegisteredTemplate> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const parsed = Option.getOrThrow(parseTemplateRef(ref))
      const files = edit(yield* resolve({ ...parsed, ref: parsed.ref ?? 'HEAD' }))
      const { manifest, tourSteps } = yield* validateTemplate(files)
      return {
        file: `templates/official/${manifest.name}.toml`,
        entry: { ref, maintainers: ['github:maoudin'], category: RegistryCategory.OFFICIAL, added: '2026-10-08' },
        manifest,
        tourSteps,
        files,
      }
    })
  )
