import Markdown, { type Components } from 'react-markdown'

import { resolveContentLink } from '../../core/domain/content-link.domain-model.ts'

export type ContentMarkdownProps = {
  readonly markdown: string
  readonly embeddedTemplates: ReadonlyArray<string>
}

const LINK = 'text-link underline underline-offset-2 hover:text-link-hover'

const components = (embeddedTemplates: ReadonlyArray<string>): Components => ({
  p: ({ node: _node, ...props }) => <p className="my-3" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-3 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-3 list-decimal space-y-1 pl-5" {...props} />,
  h1: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 font-bold" {...props} />,
  h2: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 font-bold" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 className="mt-5 mb-2 font-bold" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="my-3 border-l-[3px] border-accent pl-4 text-fg-muted" {...props} />
  ),
  code: ({ node: _node, ...props }) => (
    <code className="rounded-sm bg-surface-muted px-1 py-0.5 font-mono text-compact" {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded-sm border border-border bg-surface-sunken p-4 font-mono text-compact leading-6 [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  a: ({ href, children }) => {
    const link = resolveContentLink(href, embeddedTemplates)
    if (link._tag === 'Text') return <span>{children}</span>
    return (
      <a
        href={link.href}
        target="_blank"
        rel={link._tag === 'External' ? 'noopener noreferrer' : 'noopener'}
        className={LINK}
      >
        {children}
      </a>
    )
  },
})

export const ContentMarkdown = ({ markdown, embeddedTemplates }: ContentMarkdownProps) => (
  <Markdown
    skipHtml
    disallowedElements={['img']}
    urlTransform={(url) => url}
    components={components(embeddedTemplates)}
  >
    {markdown}
  </Markdown>
)
