import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/")({
	component: RouteComponent,
	loader: async (c) => {
		const x = await c.parentMatchPromise;
		const caseId = x.loaderData?.reports.at(0)?.caseId;

		if (caseId !== undefined) {
			return redirect({
				to: "/lab/$caseId",
				params: { caseId: caseId.toString() },
			});
		}
	},
});

function RouteComponent() {
	return <div>No lab reports here</div>;
}
