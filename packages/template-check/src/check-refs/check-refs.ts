import { makeIssue, ManifestIssueCode, type Manifest, type ManifestIssue } from '@typika/manifest'

export type ResolveManifest = (ref: string) => Manifest | undefined

const unresolvable = (path: string, ref: string) =>
  makeIssue(ManifestIssueCode.REF_UNRESOLVABLE, path, `Cannot resolve "${ref}": no template at this path.`)

const checkBase = (manifest: Manifest, resolve: ResolveManifest): ReadonlyArray<ManifestIssue> => {
  if (manifest.base === undefined) return []
  const ref = manifest.base.template
  const base = resolve(ref)
  if (base === undefined) return [unresolvable('base.template', ref)]
  const { language } = manifest.facets
  const { kind } = manifest.runtime
  return [
    ...(base.role === 'base'
      ? []
      : [
          makeIssue(
            ManifestIssueCode.BASE_NOT_BASE_ROLE,
            'base.template',
            `Base "${ref}" does not declare role = "base".`
          ),
        ]),
    ...(base.facets.language === language && base.runtime.kind === kind
      ? []
      : [
          makeIssue(
            ManifestIssueCode.BASE_MISMATCH,
            'base.template',
            `Base "${ref}" must use language "${language}" and runtime "${kind}".`
          ),
        ]),
  ]
}

const checkVariant = (
  manifest: Manifest,
  selfRef: string,
  key: string,
  ref: string,
  resolve: ResolveManifest
): ReadonlyArray<ManifestIssue> => {
  const path = `variants.${key}`
  const variant = resolve(ref)
  if (variant === undefined) return [unresolvable(path, ref)]
  const pointsBack = Object.values(variant.variants ?? {}).some((other) => other.replace(/@.*$/, '') === selfRef)
  return [
    ...(variant.facets.language === key
      ? []
      : [
          makeIssue(
            ManifestIssueCode.VARIANT_LANGUAGE_MISMATCH,
            path,
            `Variant "${key}" points to a "${variant.facets.language}" template.`
          ),
        ]),
    ...(pointsBack
      ? []
      : [
          makeIssue(
            ManifestIssueCode.VARIANT_NOT_SYMMETRIC,
            path,
            `"${ref}" does not list this template as a variant.`
          ),
        ]),
    ...(variant.facets.topic[0] === manifest.facets.topic[0]
      ? []
      : [makeIssue(ManifestIssueCode.VARIANT_TOPIC_DIVERGES, path, `Variant "${key}" has a different primary topic.`)]),
  ]
}

export const checkRefs = (
  manifest: Manifest,
  selfRef: string,
  resolve: ResolveManifest
): ReadonlyArray<ManifestIssue> => [
  ...checkBase(manifest, resolve),
  ...Object.entries(manifest.variants ?? {}).flatMap(([key, ref]) =>
    ref === undefined ? [] : checkVariant(manifest, selfRef, key, ref, resolve)
  ),
]
