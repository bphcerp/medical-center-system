import { createFileRoute, redirect } from "@tanstack/react-router";
import TopBar from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client } from "../api/$";

export const Route = createFileRoute("/history/$patientId/$caseId")({
	loader: async ({
		params,
	}: {
		params: { patientId: string; caseId: string };
	}) => {
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

		return {
			user,
			patientId: params.patientId,
			caseId: params.caseId,
		};
	},
	component: CaseDetailsPage,
});

function CaseDetailsPage() {
	const { patientId, caseId } = Route.useLoaderData();

	return (
		<>
			<TopBar title="Case Details" />
			<div className="container mx-auto p-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold">Case Details</h1>
					<p className="text-muted-foreground mt-2">
						Patient ID: {patientId} | Case ID: {caseId}
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Case Information</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Detailed case information to be done bruh
						</p>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
