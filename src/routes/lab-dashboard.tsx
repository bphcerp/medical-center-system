import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { Beaker } from "lucide-react";
import { z } from "zod";
import TopBar from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { client } from "./api/$";

const labTestReportSchema = z.object({
	labTestReportId: z.number(),
	caseId: z.number(),
	testName: z.string(),
	status: z.enum([
		"Requested",
		"Sample Collected",
		"Waiting For Report",
		"Complete",
	]),
	patientName: z.string(),
	doctorName: z.string(),
});

const pendingRequestsSchema = z.object({
	success: z.boolean(),
	reports: z.array(labTestReportSchema),
});

export const Route = createFileRoute("/lab-dashboard")({
	loader: async () => {
		const res = await client.api.lab.pending.$get();
		switch (res.status) {
			case 401:
				throw redirect({ to: "/login" });
			case 403:
				alert("You don't have permission to access Lab Dashboard.");
				throw redirect({ to: "/" });
		}
		const json = await res.json();
		const data = pendingRequestsSchema.parse(json);
		return data;
	},
	component: LabDashboard,
	staticData: {
		requiredPermissions: ["lab"],
		icon: Beaker,
		name: "Lab Dashboard",
	},
});

function LabDashboard() {
	const router = useRouter();
	const { reports } = Route.useLoaderData();

	const handleRefresh = () => {
		void router.invalidate();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "Requested":
				return "bg-yellow-100 text-yellow-800";
			case "Sample Collected":
				return "bg-blue-100 text-blue-800";
			case "Waiting For Report":
				return "bg-purple-100 text-purple-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	// group reports by case
	const caseGroups = reports.reduce(
		(acc, report) => {
			if (!acc[report.caseId]) {
				acc[report.caseId] = {
					caseId: report.caseId,
					patientName: report.patientName,
					doctorName: report.doctorName,
					tests: [],
				};
			}
			acc[report.caseId].tests.push(report);
			return acc;
		},
		{} as Record<
			number,
			{
				caseId: number;
				patientName: string;
				doctorName: string;
				tests: typeof reports;
			}
		>,
	);

	return (
		<>
			<TopBar title="LabDashboard" />
			<div className="container mx-auto p-6">
				<div className="flex justify-end mb-4">
					<Button onClick={handleRefresh} variant="outline">
						Refresh
					</Button>
				</div>
				<h1 className="text-2xl font-bold mb-6">Pending Lab Tests</h1>
				{reports.length === 0 ? (
					<p className="text-muted-foreground">No pending lab tests.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Case ID</TableHead>
								<TableHead>Patient</TableHead>
								<TableHead>Doctor</TableHead>
								<TableHead>Tests & Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Object.values(caseGroups).map((group) => (
								<TableRow key={group.caseId}>
									<TableCell>{group.caseId}</TableCell>
									<TableCell>{group.patientName}</TableCell>
									<TableCell>{group.doctorName}</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											{group.tests.map((test) => (
												<div
													key={test.labTestReportId}
													className="flex items-center gap-2"
												>
													<span className="text-sm">{test.testName}</span>
													<Badge
														className={getStatusColor(test.status)}
														variant="secondary"
													>
														{test.status}
													</Badge>
												</div>
											))}
										</div>
									</TableCell>
									<TableCell>
										<Link
											to="/test-entry/$caseId"
											params={{ caseId: group.caseId.toString() }}
										>
											<Button size="sm">Process</Button>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</>
	);
}
