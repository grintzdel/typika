import { parseTemplateRef } from '@typika/manifest'
import type { IndexTemplate, RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ArgsInvalidError } from '../domain/errors/args-invalid.error.ts'
import { TemplateNotFoundError } from '../domain/errors/template-not-found.error.ts'

export type LocatedTemplate = { readonly ref: string; readonly entry: IndexTemplate | undefined }

const REF_PREFIX = 'github:'
const PINNED_ON_SHA = /@[0-9a-f]{7,40}$/

export const isRef = (template: string): boolean => template.startsWith(REF_PREFIX)

export const isPinnedOnSha = (ref: string): boolean => PINNED_ON_SHA.test(ref)

const unpinned = (ref: string) => ref.replace(/@[^@]*$/, '')

export const entryOfRef = (index: RegistryIndex | undefined, ref: string): IndexTemplate | undefined =>
  index?.templates.find((template) => unpinned(template.ref) === unpinned(ref))

export const pinnedVia = (index: RegistryIndex | undefined, ref: string): LocatedTemplate => {
  const entry = entryOfRef(index, ref)
  return { ref: entry?.ref ?? ref, entry }
}

export const locateTemplate = (
  template: string,
  index: RegistryIndex | undefined
): Effect.Effect<LocatedTemplate, ArgsInvalidError | TemplateNotFoundError> => {
  if (isRef(template))
    return Option.isNone(parseTemplateRef(template))
      ? Effect.fail(new ArgsInvalidError({ message: `"${template}" is not a valid github:owner/repo/path@ref ref.` }))
      : Effect.succeed({ ref: template, entry: undefined })
  const entry = index?.templates.find(({ name }) => name === template)
  return entry === undefined
    ? Effect.fail(new TemplateNotFoundError({ template }))
    : Effect.succeed({ ref: entry.ref, entry })
}
