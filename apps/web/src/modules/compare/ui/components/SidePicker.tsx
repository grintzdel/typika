import { useTranslation } from 'react-i18next'

import type { VariantLink } from '../../core/domain/compare.domain-model.ts'

export type SidePickerProps = {
  readonly variants: ReadonlyArray<VariantLink & { readonly languageName: string }>
  readonly a: string | undefined
  readonly b: string | undefined
  readonly onChoose: (a: string | undefined, b: string | undefined) => void
}

const SELECT =
  'h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-900'

export const SidePicker = ({ variants, a, b, onChoose }: SidePickerProps) => {
  const { t } = useTranslation('compare')
  const isKnown = (language: string | undefined) => variants.some((variant) => variant.language === language)

  const select = (label: string, value: string | undefined, onChange: (language: string) => void) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <select
        className={SELECT}
        value={isKnown(value) ? value : ''}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {isKnown(value) ? null : (
          <option value="" disabled>
            {t('choose')}
          </option>
        )}
        {variants.map((variant) => (
          <option key={variant.language} value={variant.language}>
            {variant.languageName}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">{t('sides')}</legend>
      {select(t('left'), a, (language) => onChoose(language, b))}
      {select(t('right'), b, (language) => onChoose(a, language))}
    </fieldset>
  )
}
