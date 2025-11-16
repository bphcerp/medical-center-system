import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/inventory')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/inventory"!</div>
}
