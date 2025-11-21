import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
} from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { LabTestStatusBadge } from "@/components/lab-test-status-badge";
import { TokenButton, TokenButtonTitle } from "@/components/token-button";
import TopBar from "@/components/topbar";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
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
		icon: FlaskConical,
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
	const caseList = Object.values(caseGroups);

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
					{caseList.length === 0 && (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<FlaskConical />
								</EmptyMedia>
								<EmptyTitle>No pending lab reports</EmptyTitle>
								<EmptyDescription>
									When someone requests lab tests, they will appear here.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
					{caseList.map((group) => (
						<Link
							to="/lab/$caseId"
							params={{ caseId: group.caseId.toString() }}
							key={group.caseId}
						>
							<TokenButton
								token={group.token.toString()}
								selected={caseId === group.caseId}
							>
								<div className="flex flex-col items-stretch text-base gap-1.5">
									<TokenButtonTitle>{group.patientName}</TokenButtonTitle>
									<div className="text-muted-foreground text-left text-xs italic">
										<span className="text-base/1 font-semibold not-italic mr-1.5">
											{group.doctorName}
										</span>
										requested{" "}
										{group.tests.length === 1 ? "this test:" : "these tests:"}
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
							</TokenButton>
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
