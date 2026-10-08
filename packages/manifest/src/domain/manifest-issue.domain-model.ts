import * as Schema from 'effect/Schema'

import { ManifestIssueCode } from './constants/issue-code.constant.ts'

export const ManifestIssueSchema = Schema.Struct({
  code: Schema.Literals(Object.values(ManifestIssueCode)),
  path: Schema.String,
  message: Schema.String,
})

export type ManifestIssue = typeof ManifestIssueSchema.Type

export const isWarning = (issue: ManifestIssue): boolean => issue.code.startsWith('W_')

export const makeIssue = (code: ManifestIssueCode, path: string, message: string): ManifestIssue => ({
  code,
  path,
  message,
})
