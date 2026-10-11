const TEMPLATE_LINK_PREFIX = 'typika:'

export type ContentLink =
  | { readonly _tag: 'Template'; readonly href: string }
  | { readonly _tag: 'External'; readonly href: string }
  | { readonly _tag: 'Text' }

export const resolveContentLink = (href: string | undefined, embedded: ReadonlyArray<string>): ContentLink => {
  if (href === undefined) return { _tag: 'Text' }
  if (href.startsWith(TEMPLATE_LINK_PREFIX)) {
    const name = href.slice(TEMPLATE_LINK_PREFIX.length)
    return embedded.includes(name) ? { _tag: 'Template', href: `/play/${name}` } : { _tag: 'Text' }
  }
  return /^https?:\/\//.test(href) ? { _tag: 'External', href } : { _tag: 'Text' }
}
