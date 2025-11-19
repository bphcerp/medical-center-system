import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
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
import { client } from "../api/$";

export const Route = createFileRoute("/history/$patientId/")({
	loader: async ({ params }: { params: { patientId: string } }) => {
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

		// Fetch patient history directly without OTP
		const historyRes = await client.api.patientHistory[":patientId"].$get({
			param: { patientId: params.patientId },
		});

		if (historyRes.status === 404) {
			throw new Error("Patient not found");
		}

		if (historyRes.status !== 200) {
			throw new Error("Failed to fetch patient history");
		}

		const { patient, cases } = await historyRes.json();

		return {
			user,
			patient,
			cases,
			patientId: params.patientId,
		};
	},
	component: HistoryPage,
});

function HistoryPage() {
	const { patient, cases, patientId } = Route.useLoaderData();
	const navigate = useNavigate();

	const sortedCases =
		cases.length > 0
			? [...cases].sort((a, b) => {
					const dateA = new Date(a.updatedAt).getTime();
					const dateB = new Date(b.updatedAt).getTime();
					return dateB - dateA;
				})
			: [];

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
						<h1 className="text-3xl font-bold">Patient History</h1>
						<div className="mt-2 space-y-1">
							<p className="text-lg">
								<span className="font-semibold">Name:</span> {patient.name}
							</p>
							<p className="text-muted-foreground">
								<span className="font-semibold">Age:</span> {patient.age} |{" "}
								<span className="font-semibold">Sex:</span> {patient.sex} |{" "}
								<span className="font-semibold">Type:</span> {patient.type}
							</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() =>
								navigate({
									to: "/doctor",
								})
							}
						>
							Back to Dashboard
						</Button>
						{latestCase && (
							<Button
								onClick={() =>
									navigate({
										to: "/consultation/$id",
										params: { id: String(latestCase.caseId) },
									})
								}
							>
								View Latest Case
							</Button>
						)}
					</div>
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
									{sortedCases.map((caseItem) => (
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
