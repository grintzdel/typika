import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TourMarkdown } from './TourMarkdown.tsx'

const renderMarkdown = (markdown: string, embeddedTemplates: ReadonlyArray<string> = ['observer-ts']) =>
  render(<TourMarkdown markdown={markdown} embeddedTemplates={embeddedTemplates} />)

describe('TourMarkdown', () => {
  it('renders paragraphs, emphasis, code and lists', () => {
    const { container } = renderMarkdown('Some **bold** and `code`.\n\n- one\n- two\n\n```ts\nconst a = 1\n```\n')

    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('p code')?.textContent).toBe('code')
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['one', 'two'])
    expect(container.querySelector('pre code')?.textContent).toBe('const a = 1\n')
  })

  it('leaves raw HTML out', () => {
    const { container } = renderMarkdown('Before <b>bold</b> <script>alert(1)</script>after.')

    expect(container.querySelector('b')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })

  it('opens an embedded template in a new tab', () => {
    renderMarkdown('See [Observer](typika:observer-ts).')

    const link = screen.getByRole('link', { name: 'Observer' })
    expect(link.getAttribute('href')).toBe('/play/observer-ts')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('keeps a template that is not embedded as text', () => {
    const { container } = renderMarkdown('See [Open-closed](typika:open-closed-ts).')

    expect(screen.queryByRole('link')).toBeNull()
    expect(container.textContent).toBe('See Open-closed.')
  })

  it('opens web links in a new tab without the opener', () => {
    renderMarkdown('Read [the article](https://example.com/strategy).')

    const link = screen.getByRole('link', { name: 'the article' })
    expect(link.getAttribute('href')).toBe('https://example.com/strategy')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('keeps a script link as text', () => {
    renderMarkdown('[Click](javascript:alert(1))')

    expect(screen.queryByRole('link')).toBeNull()
  })
})
