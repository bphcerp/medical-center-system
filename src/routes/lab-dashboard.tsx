import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { Beaker } from "lucide-react";
import { z } from "zod";
import TopBar from "@/components/topbar";
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

const labRequestSchema = z.object({
	reportId: z.number(),
	caseId: z.number(),
	patientName: z.string(),
	doctorName: z.string(),
	testsRequested: z.string(),
});

const pendingRequestsSchema = z.object({
	success: z.boolean(),
	reports: z.array(labRequestSchema),
});

export const Route = createFileRoute("/lab-dashboard")({
	loader: async () => {
		const res = await client.api.lab.pending.$get();
		switch (res.status) {
			case 401:
				throw redirect({
					to: "/login",
				});
			case 403:
				alert("You don't have the permission to access Doctor Dashboard.");
				throw redirect({
					to: "/",
				});
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

	return (
		<>
			<TopBar title="Lab Dashboard" />
			<div className="min-h-screen w-full px-8 py-4">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-semibold mb-4">Pending Lab Requests</h2>
					<Button onClick={handleRefresh}>Refresh</Button>
				</div>

				<div className="border rounded-lg overflow-hidden bg-white">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[120px]">Case ID</TableHead>
								<TableHead>Patient Name</TableHead>
								<TableHead>Requesting Doctor</TableHead>
								<TableHead>Tests Requested</TableHead>
								<TableHead>Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{reports.length > 0 ? (
								reports.map((req) => (
									<TableRow key={req.reportId}>
										<TableCell>{req.caseId}</TableCell>
										<TableCell>{req.patientName}</TableCell>
										<TableCell>{req.doctorName}</TableCell>
										<TableCell>{req.testsRequested}</TableCell>
										<TableCell>
											<Link
												to="/result-entry/$reportId"
												params={{ reportId: String(req.reportId) }}
											>
												<Button variant="outline">Enter Results</Button>
											</Link>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center text-muted-foreground py-8"
									>
										No pending lab requests.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</>
	);
}
