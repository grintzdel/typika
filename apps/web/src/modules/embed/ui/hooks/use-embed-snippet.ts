import { useState } from 'react'

import { embedSnippetOf } from '../../core/domain/embed.domain-model.ts'

export const useEmbedSnippet = (name: string, title: string) => {
  const [isCopied, setCopied] = useState(false)
  return {
    isCopied,
    handleCopy: () => {
      navigator.clipboard.writeText(embedSnippetOf(window.location.origin, name, title)).then(
        () => setCopied(true),
        () => setCopied(false)
      )
    },
  }
}
