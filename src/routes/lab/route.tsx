import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
} from "@tanstack/react-router";
import { Beaker } from "lucide-react";
import { LabTestStatusBadge } from "@/components/lab-test-status-badge";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import type { statusEnums } from "@/db/lab";
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
	const { reports } = Route.useLoaderData();
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
				<div
					className={cn(
						"flex flex-col flex-2 p-4 gap-4 overflow-y-scroll bottom-0 min-h-0",
						caseId !== undefined && "hidden lg:flex",
					)}
				>
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
									"flex gap-3 p-0 rounded-lg border-2 items-stretch overflow-clip bg-card h-auto w-full group",
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
									{group.token}{" "}
								</span>
								<div className="flex grow flex-col items-stretch text-base py-2 pr-2 gap-1.5 whitespace-normal text-left">
									<span className="whitespace-normal text-lg font-semibold">
										{group.patientName}
									</span>
									<div className="text-muted-foreground text-left text-xs italic">
										<span className="text-base/1 font-semibold not-italic mr-1.5">
											{group.doctorName}
										</span>
										requested these tests:
									</div>
									<div className="flex flex-col gap-1 pl-2">
										{group.tests.map((test) => (
											<div
												className="flex gap-2 items-center text-sm/1 font-normal"
												key={test.labTestReportId}
											>
												{test.testName}
												<span
													className={cn(
														"h-0 border-t-3 grow border-dotted transition-colors",
														getBorderColor(test.status),
													)}
												/>
												<LabTestStatusBadge status={test.status} />
											</div>
										))}
									</div>
								</div>
							</Button>
						</Link>
					))}
				</div>
				<div className={cn("flex-5", !caseId && "hidden lg:block")}>
					<Outlet />
				</div>
			</div>
		</div>
	);
}

function getBorderColor(status: (typeof statusEnums)[number]) {
	switch (status) {
		case "Requested":
			return "group-hover:border-bits-red";
		case "Sample Collected":
			return "group-hover:border-bits-blue";
		case "Complete":
			return "group-hover:border-bits-green";
	}
}
