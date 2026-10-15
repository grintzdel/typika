import { makeIssue, ManifestIssueCode, type Manifest, type ManifestIssue } from '@typika/manifest'

export type TourIdsAt = (ref: string) => ReadonlyArray<string> | undefined

const REFERENCE_LANGUAGE = 'typescript'

export const checkTourOrder = (
  manifest: Manifest,
  tourIds: ReadonlyArray<string>,
  tourIdsAt: TourIdsAt
): ReadonlyArray<ManifestIssue> => {
  if (manifest.facets.language === REFERENCE_LANGUAGE) return []
  const ref = manifest.variants?.[REFERENCE_LANGUAGE]
  const referenceIds = ref === undefined ? undefined : tourIdsAt(ref)
  if (referenceIds === undefined) return []

  const shared = tourIds.filter((id) => referenceIds.includes(id))
  const expected = referenceIds.filter((id) => shared.includes(id))
  const misplaced = shared.filter((id, index) => expected[index] !== id)
  if (misplaced.length === 0) return []

  return [
    makeIssue(
      ManifestIssueCode.TOUR_ORDER_DIVERGES,
      'tour.steps',
      `Tour steps ${misplaced.map((id) => `"${id}"`).join(', ')} are not in the same order as the reference variant.`
    ),
  ]
}
