import Markdown, { type Components } from 'react-markdown'

import { resolveTourLink } from '../../core/domain/tour.domain-model.ts'

export type TourMarkdownProps = {
  readonly markdown: string
  readonly embeddedTemplates: ReadonlyArray<string>
}

const LINK = 'text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300'

const components = (embeddedTemplates: ReadonlyArray<string>): Components => ({
  p: ({ node: _node, ...props }) => <p className="my-3 leading-relaxed" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="my-3 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-3 list-decimal space-y-1 pl-5" {...props} />,
  h1: ({ node: _node, ...props }) => <h3 className="mt-4 mb-2 font-semibold" {...props} />,
  h2: ({ node: _node, ...props }) => <h3 className="mt-4 mb-2 font-semibold" {...props} />,
  h3: ({ node: _node, ...props }) => <h4 className="mt-4 mb-2 font-semibold" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="my-3 border-l-2 border-neutral-300 pl-3 dark:border-neutral-700" {...props} />
  ),
  code: ({ node: _node, ...props }) => (
    <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.8125rem] dark:bg-neutral-800" {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-[0.8125rem] leading-snug dark:border-neutral-800 dark:bg-neutral-900 [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  a: ({ href, children }) => {
    const link = resolveTourLink(href, embeddedTemplates)
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

export const TourMarkdown = ({ markdown, embeddedTemplates }: TourMarkdownProps) => (
  <Markdown
    skipHtml
    disallowedElements={['img']}
    urlTransform={(url) => url}
    components={components(embeddedTemplates)}
  >
    {markdown}
  </Markdown>
)
