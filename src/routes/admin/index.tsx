import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
	component: RouteComponent,
	beforeLoad: () => {
		throw redirect({ to: "/admin/user" });
	},
});

function RouteComponent() {
	return <div>Hello "/admin/"!</div>;
}
