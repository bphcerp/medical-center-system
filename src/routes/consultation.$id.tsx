import { createFileRoute, redirect } from "@tanstack/react-router";
import { client } from "./api/$";

export const Route = createFileRoute("/consultation/$id")({
	loader: async () => {
		// Check if user is authenticated
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

		return { user };
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	const { id } = Route.useParams();

	return (
		<div className="container mx-auto p-6">
			<h1 className="text-3xl font-bold">Consultation Page</h1>
			<p className="text-muted-foreground mt-2">Case ID: {id}</p>
			<p className="mt-4">This page will be implemented later.</p>
		</div>
	);
}
