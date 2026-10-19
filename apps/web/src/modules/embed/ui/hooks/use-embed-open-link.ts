import { useEffect } from 'react'

import { useShareLink } from '../../../project/ui/hooks/use-share-link.ts'

export const useEmbedOpenLink = (
  projectKey: string,
  template: { readonly name: string; readonly templateFiles: ReadonlyMap<string, string> } | undefined,
  editedFiles: ReadonlyMap<string, string>
) => {
  const share = useShareLink(projectKey)
  const templateFiles = template?.templateFiles

  useEffect(() => {
    if (templateFiles !== undefined) share.handleCreate(new Map([...templateFiles, ...editedFiles]))
  }, [templateFiles, editedFiles])

  if (share.link?._tag === 'Ready') return share.link.url
  return new URL(template === undefined ? '/' : `/play/${template.name}`, window.location.origin).href
}
