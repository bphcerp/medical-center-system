import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
	useRouter,
} from "@tanstack/react-router";
import { Beaker } from "lucide-react";
import TopBar from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, handleUnauthorized } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/lab")({
	loader: async () => {
		const res = await client.api.lab.pending.$get();
		handleUnauthorized(res.status);

		return await res.json();
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

	const getStatusColor = (
		status: (typeof Route.types.loaderData.reports)[number]["status"],
	) => {
		switch (status) {
			case "Requested":
				return "bg-yellow-100 text-yellow-800";
			case "Sample Collected":
				return "bg-blue-100 text-blue-800";
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
					token: report.token,
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
				token: number;
				tests: typeof reports;
			}
		>,
	);

	const caseId = useParams({
		from: "/lab/$caseId",
		shouldThrow: false,
		select: (p) => Number(p.caseId),
	});

	return (
		<div className="h-screen flex flex-col">
			<TopBar title="Lab Dashboard" />
			<div className="flex items-stretch divide-x divide-border grow min-h-0">
				<div className="flex flex-col flex-2 p-4 gap-4 overflow-y-scroll bottom-0 min-h-0 z-10">
					{Object.values(caseGroups).map((group) => (
						<Link
							to="/lab/$caseId"
							params={{ caseId: group.caseId.toString() }}
							key={group.caseId}
						>
							<Button
								variant="ghost"
								key={group.caseId}
								className={cn(
									"flex gap-3 p-0 rounded-lg border-2 items-stretch overflow-clip bg-card h-auto w-full",
									caseId === group.caseId && "border-primary",
								)}
							>
								<span
									className={cn(
										"content-center min-w-13 px-2 text-center",
										"font-semibold tabular-nums tracking-tight text-lg transition-colors",
										caseId === group.caseId
											? "bg-primary text-primary-foreground"
											: "bg-accent text-accent-foreground",
									)}
								>
									{group.token}
								</span>
								<div className="flex grow flex-col items-start text-base py-2 pr-2">
									<span className="whitespace-normal text-left">
										{group.patientName}
									</span>
									<span className="text-muted-foreground font-medium text-left text-sm">
										Requested by {group.doctorName}
									</span>
									<div className="flex flex-col">
										{group.tests.map((test) => (
											<div className="flex gap-2" key={test.labTestReportId}>
												<span>{test.testName}</span>{" "}
												<Badge>{test.status}</Badge>
											</div>
										))}
									</div>
								</div>
							</Button>
						</Link>
					))}
				</div>
				<div className="flex-5">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
