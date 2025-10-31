import {
	createFileRoute,
	Link,
	useRouter,
	redirect,
} from "@tanstack/react-router";
import { z } from "zod";
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
	reports: z.array(labRequestSchema),
});

export const Route = createFileRoute("/lab-dashboard")({
	loader: async () => {
		// const res = await client.api["lab-reports"].pending.$get();

		// switch (res.status) {
		//   case 401:
		//     throw redirect({
		//       to: "/login",
		//     });
		//   case 403:
		//     throw redirect({
		//       to: "/",
		//     });
		// }

		// const json = await res.json();
		// const data = pendingRequestsSchema.parse(json);
		return 0;
	},
	component: LabDashboard,
});

function LabDashboard() {
	const router = useRouter();

	const { reports } = Route.useLoaderData();

	const handleRefresh = () => {
		router.invalidate();
		console.log("Refreshing pending requests...");
	};

	return (
		<div className="min-h-screen w-full p-8">
			<div className="max-w-6xl mx-auto bg-transparent">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold">Lab Dashboard</h1>
					<Button onClick={handleRefresh}>Refresh</Button>
				</div>

				<h2 className="text-2xl font-semibold mb-4">Pending Lab Requests</h2>

				<div className="border rounded-lg overflow-hidden bg-white">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[120px]">Case ID</TableHead>
								<TableHead>Patient Name</TableHead>
								<TableHead>Requesting Doctor</TableHead>
								<TableHead>Tests Requested</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{/* {reports.map((req) => (
                <TableRow key={req.reportId}>
                  <TableCell>
                    <Link
                      to="/result-entry"
                        params={{
                          reportId: req.reportId,
                        }}
                    >
                      <Button variant="outline">{req.caseId}</Button>
                    </Link>
                  </TableCell>
                  <TableCell>{req.patientName}</TableCell>
                  <TableCell>{req.doctorName}</TableCell>
                  <TableCell>{req.testsRequested}</TableCell>
                </TableRow>
              ))} */}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}
