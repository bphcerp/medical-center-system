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
import useAuth from "@/lib/hooks/useAuth";
import { cn, handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/lab")({
	loader: async () => {
		const res = await client.api.lab.pending.$get();
		const cases = await handleErrors(res);
		if (!cases) {
			return { cases: [] };
		}
		return { cases };
	},
	component: LabDashboard,
	staticData: {
		requiredPermissions: ["lab"],
		icon: FlaskConical,
		name: "Lab Dashboard",
	},
});

function LabDashboard() {
	useAuth(["lab"]);
	const { cases } = Route.useLoaderData();

	const caseId = useParams({
		from: "/lab/$caseId",
		shouldThrow: false,
		select: (p) => Number(p.caseId),
	});

	return (
		<div className="h-dvh flex flex-col">
			<TopBar title="Lab Dashboard" />
			<div className="flex items-stretch divide-x divide-border grow min-h-0 h-after-topbar">
				<div
					className={cn(
						"flex flex-col flex-2 p-4 gap-4 overflow-y-scroll bottom-0 min-h-0",
						caseId !== undefined && "hidden lg:flex",
					)}
				>
					{cases.length === 0 && (
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
					{cases.map((group) => (
						<Link
							to="/lab/$caseId"
							replace
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
									<div className="flex flex-col gap-2 pl-2 text-sm">
										{group.tests.slice(0, 3).map((test) => (
											<div
												className="flex gap-2 items-center font-normal"
												key={test.id}
											>
												<span className="line-clamp-2">{test.name}</span>
												<span
													className={cn(
														"h-0 min-w-10 border-t grow transition-colors",
														getBorderColor(test.status),
													)}
												/>
												<LabTestStatusBadge status={test.status} />
											</div>
										))}
										{group.tests.length > 3 && (
											<div className="text-muted-foreground italic">
												and{" "}
												<span className="font-semibold">
													{group.tests.length - 3}
												</span>{" "}
												more test{group.tests.length - 3 !== 1 ? "s" : ""}...
											</div>
										)}
									</div>
								</div>
							</TokenButton>
						</Link>
					))}
				</div>
				<div
					className={cn("flex-5", caseId === undefined && "hidden lg:block")}
				>
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
