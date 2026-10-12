import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ComparePage } from '../../features/compare/compare.page.tsx'

type CompareSearch = { readonly a?: string; readonly b?: string }

const CompareRoute = () => {
  const { name } = Route.useParams()
  const { a, b } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <ComparePage
      key={`${name}?${a ?? ''}&${b ?? ''}`}
      name={name}
      a={a}
      b={b}
      onChoose={(left, right) =>
        void navigate({
          search: { ...(left === undefined ? {} : { a: left }), ...(right === undefined ? {} : { b: right }) },
        })
      }
    />
  )
}

export const Route = createFileRoute('/compare/$name')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): CompareSearch => ({
    ...(typeof search.a === 'string' ? { a: search.a } : {}),
    ...(typeof search.b === 'string' ? { b: search.b } : {}),
  }),
  component: CompareRoute,
})
