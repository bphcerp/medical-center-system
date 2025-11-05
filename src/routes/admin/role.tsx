import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/role')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/role"!</div>
}
