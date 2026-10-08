import * as Option from 'effect/Option'

import { isRelativePath } from '../domain/manifest.domain-model.ts'
import type { TemplateRef } from '../domain/template-ref.domain-model.ts'

const TEMPLATE_REF =
  /^github:([A-Za-z0-9](?:-?[A-Za-z0-9]){0,38})\/([A-Za-z0-9._-]{1,100})(?:\/([^@]+))?(?:@([^@\s]+))?$/

export const parseTemplateRef = (input: string): Option.Option<TemplateRef> => {
  const match = TEMPLATE_REF.exec(input)
  if (match === null) return Option.none()
  const [, owner = '', repo = '', path, ref] = match
  if (repo === '.' || repo === '..') return Option.none()
  if (path !== undefined && !isRelativePath(path)) return Option.none()
  return Option.some({
    owner,
    repo,
    ...(path === undefined ? {} : { path }),
    ...(ref === undefined ? {} : { ref }),
  })
}

export const formatTemplateRef = ({ owner, repo, path, ref }: TemplateRef): string =>
  `github:${owner}/${repo}${path === undefined ? '' : `/${path}`}${ref === undefined ? '' : `@${ref}`}`
