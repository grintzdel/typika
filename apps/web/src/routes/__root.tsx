import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { AppProviders } from '../modules/app/ui/AppProviders.tsx'

import styles from '../styles.css?url'

const RootDocument = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body className="bg-bg font-sans text-fg antialiased">
      {children}
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Typika' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  shellComponent: RootDocument,
  component: () => (
    <AppProviders>
      <Outlet />
    </AppProviders>
  ),
})
