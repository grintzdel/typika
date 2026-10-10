import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <Navigate to="/play/$templateName" params={{ templateName: 'strategy-ts' }} />,
})
