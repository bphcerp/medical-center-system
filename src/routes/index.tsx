import { createFileRoute, redirect } from "@tanstack/react-router";
import { client } from "./api/$";

export const Route = createFileRoute("/")({
	loader: async () => {
		const res = await client.api.user.$get();
		if (res.status !== 200) {
			throw redirect({
				to: "/login",
			});
		}
		const user = await res.json();
		if ("error" in user) {
			throw redirect({
				to: "/login",
			});
		}

		let check = { message: "You don't have the permission" };
		const perms = await client.api.rbac.$get();
		if (perms.status === 200) {
			check = await perms.json();
		}
		return { check, user };
	},
	component: App,
});

function App() {
	const user = Route.useLoaderData();
	return (
		<div className="p-2">
			<h3>{JSON.stringify(user)}</h3>
		</div>
	);
}
