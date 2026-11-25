export type StatusTone = 'danger' | 'warning' | 'info' | 'neutral' | 'success'

const GLYPHS: Readonly<Record<StatusTone, string>> = {
  danger: '!',
  warning: '!',
  info: 'i',
  neutral: 'i',
  success: '✓',
}

export const StatusGlyph = ({ tone }: { readonly tone: StatusTone }) => (
  <span aria-hidden="true" className="w-4 shrink-0 text-center font-bold">
    {GLYPHS[tone]}
  </span>
)
