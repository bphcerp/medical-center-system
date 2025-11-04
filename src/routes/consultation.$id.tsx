import { createFileRoute, redirect } from "@tanstack/react-router";
import { client } from "./api/$";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";

export const Route = createFileRoute("/consultation/$id")({
	loader: async ({ params }: { params: { id: string } }) => {
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
		const consultationRes = await client.api.doctor.consultation[
			":caseId"
		].$get({
			param: { caseId: params.id },
		});

		if (consultationRes.status !== 200) {
			throw new Error("Failed to fetch consultation details");
		}

		const { caseDetail } = await consultationRes.json();

		return { user, caseDetail };
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	const { user, caseDetail } = Route.useLoaderData();
	const { id } = Route.useParams();

	if (!caseDetail) {
		return (
			<div className="container mx-auto p-6">
				<h1 className="text-3xl font-bold">Consultation Page</h1>
				<p className="text-muted-foreground mt-2">Case ID: {id}</p>
				<p className="mt-4">No consultation details found for this case.</p>
			</div>
		);
	}

	return (
		<div className="container p-6">
			<h1 className="text-3xl font-bold">
				Consultation for {caseDetail.patientName}
			</h1>
			<p className="text-muted-foreground my-2">Case ID: {id}</p>
			<Card>
				<div className="flex gap-4 mx-3">
					<Field>
						<FieldLabel className="font-semibold">Patient Name</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.patientName || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">Age</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.patientAge || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">Gender</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.patientSex || "—"}
						</div>
					</Field>
				</div>
			</Card>
		</div>
	);
}
