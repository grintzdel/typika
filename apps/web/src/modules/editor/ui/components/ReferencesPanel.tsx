import { useTranslation } from 'react-i18next'

import type { ReferenceSearch, SymbolReference } from '../../core/domain/language-service.domain-model.ts'

export type ReferencesPanelProps = {
  readonly search: ReferenceSearch | undefined
  readonly onOpen: (reference: SymbolReference) => void
}

export const ReferencesPanel = ({ search, onOpen }: ReferencesPanelProps) => {
  const { t } = useTranslation('editor')
  return (
    <section aria-label={t('references.label')} className="h-full p-3 text-compact">
      {search === undefined ? (
        <p className="text-fg-muted">{t('references.empty')}</p>
      ) : (
        <>
          <h2 className="mb-3 font-semibold">
            {t('references.title', { count: search.references.length, symbol: search.symbol })}
          </h2>
          {[...Map.groupBy(search.references, (reference) => reference.path)].map(([path, references]) => (
            <div key={path} className="mb-3">
              <h3 className="font-mono text-sm text-fg-muted">{path}</h3>
              <ul>
                {references.map((reference) => (
                  <li key={reference.from}>
                    <button
                      type="button"
                      aria-label={t('references.item', { path, line: reference.line, text: reference.lineText })}
                      className="flex min-h-target w-full items-center gap-3 rounded-sm px-2 text-left hover:bg-surface-muted"
                      onClick={() => onOpen(reference)}
                    >
                      <span className="w-16 shrink-0 text-sm text-fg-subtle tabular-nums">
                        {t('references.line', { line: reference.line })}
                      </span>
                      <code className="min-w-0 truncate font-mono">{reference.lineText}</code>
                      {reference.isDefinition ? (
                        <span className="ml-auto shrink-0 rounded-full bg-surface-muted px-3 text-sm">
                          {t('references.declaration')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}
