import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { EMBED_PATH_PREFIX } from '../../core/domain/embed.domain-model.ts'

export type EmbedSnippetProps = {
  readonly name: string
  readonly isCopied: boolean
  readonly onCopy: () => void
}

export const EmbedSnippet = ({ name, isCopied, onCopy }: EmbedSnippetProps) => {
  const { t } = useTranslation('hub')
  return (
    <div className="space-y-2">
      <code className="block font-mono text-xs break-all">
        {EMBED_PATH_PREFIX}
        {name}
      </code>
      <div className="flex items-center gap-2">
        <Button onClick={onCopy}>
          <span aria-hidden="true">⧉</span>
          {t('template.copyEmbed')}
        </Button>
        <span role="status" className="text-xs text-neutral-600 dark:text-neutral-400">
          {isCopied ? t('template.embedCopied') : ''}
        </span>
      </div>
    </div>
  )
}
