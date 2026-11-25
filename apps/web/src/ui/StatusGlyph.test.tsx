import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusGlyph } from './StatusGlyph.tsx'

const glyphOf = (tone: Parameters<typeof StatusGlyph>[0]['tone']) => {
  const { container } = render(<StatusGlyph tone={tone} />)
  return container.firstElementChild
}

describe('StatusGlyph', () => {
  it('marks a problem with "!", a note with "i" and a success with "✓"', () => {
    expect(glyphOf('danger')?.textContent).toBe('!')
    expect(glyphOf('warning')?.textContent).toBe('!')
    expect(glyphOf('info')?.textContent).toBe('i')
    expect(glyphOf('neutral')?.textContent).toBe('i')
    expect(glyphOf('success')?.textContent).toBe('✓')
  })

  it('stays out of what screen readers announce, since the text already says it', () => {
    expect(glyphOf('danger')?.getAttribute('aria-hidden')).toBe('true')
  })
})
