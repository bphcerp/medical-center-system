import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { PatientDetails } from "@/components/patient-details";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import useAuth from "@/lib/hooks/useAuth";
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/history/$patientId/")({
	loader: async ({ params }: { params: { patientId: string } }) => {
		const historyRes = await client.api.patientHistory[":patientId"].$get({
			param: { patientId: params.patientId },
		});
		const history = await handleErrors(historyRes);
		if (!history) {
			return { patientId: params.patientId, patient: null, cases: [] };
		}
		return {
			patientId: params.patientId,
			patient: history.patient,
			cases: history.cases,
		};
	},
	component: HistoryPage,
});

function HistoryPage() {
	useAuth(["doctor"]);
	const { patient, cases, patientId } = Route.useLoaderData();
	const navigate = useNavigate();

	const sortedCases = [...cases].sort((a, b) => {
		const dateA = new Date(a.updatedAt).getTime();
		const dateB = new Date(b.updatedAt).getTime();
		return dateB - dateA;
	});

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const latestCase = sortedCases.length > 0 ? sortedCases[0] : null;

	return (
		<>
			<TopBar title="Patient History" />
			<div className="container mx-auto p-6">
				<div className="mb-6 flex justify-between items-start">
					<div>
						{patient && (
							<PatientDetails patient={patient} label="Case history of" />
						)}
					</div>
					{latestCase && (
						<Button
							onClick={() =>
								navigate({
									to: "/consultation/$id",
									params: { id: String(latestCase.caseId) },
								})
							}
						>
							Back to Consultation
						</Button>
					)}
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Case History</CardTitle>
					</CardHeader>
					<CardContent>
						{sortedCases.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-muted-foreground">
									No cases found for this patient
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Case ID</TableHead>
										<TableHead>Finalized State</TableHead>
										<TableHead>Created</TableHead>
										<TableHead>Last Updated</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sortedCases
										.filter((caseItem) => caseItem.finalizedState)
										.map((caseItem) => (
											<TableRow
												key={caseItem.caseId}
												className="cursor-pointer hover:bg-muted/50"
												onClick={() =>
													navigate({
														to: `/history/${patientId}/${caseItem.caseId}`,
													})
												}
											>
												<TableCell>{caseItem.caseId}</TableCell>
												<TableCell>{caseItem.finalizedState || "—"}</TableCell>
												<TableCell>{formatDate(caseItem.createdAt)}</TableCell>
												<TableCell>{formatDate(caseItem.updatedAt)}</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
			<Outlet />
		</>
	);
}
