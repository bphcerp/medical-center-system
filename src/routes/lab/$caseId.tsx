import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LabTestStatusBadge } from "@/components/lab-test-status-badge";
import LabTestUpdateSheet from "@/components/lab-test-update-sheet";
import { NotFound } from "@/components/not-found";
import { PatientDetails } from "@/components/patient-details";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { statusEnums } from "@/db/lab";
import useAuth from "@/lib/hooks/useAuth";
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/lab/$caseId")({
	loader: async ({ params: { caseId } }) => {
		const res = await client.api.lab.details[":caseId"].$get({
			param: { caseId: caseId },
		});
		const caseDetails = await handleErrors(res);
		if (res.status === 404 || !caseDetails) {
			throw notFound();
		}

		return { ...caseDetails };
	},
	notFoundComponent: () => <NotFound title="Lab case not found" />,
	component: TestEntry,
});

function TestEntry() {
	useAuth(["lab"]);
	const { patient, doctorName, token, tests } = Route.useLoaderData();

	return (
		<div className="p-4 pb-0 lg:p-12 lg:pb-0 flex flex-col gap-6 h-full min-h-0 overflow-y-scroll">
			<PatientDetails
				patient={patient}
				token={token}
				label={
					<>
						Lab tests requested by{" "}
						<span className="font-semibold">{doctorName}</span>
					</>
				}
			/>

			<div className="grow flex flex-col gap-4">
				{tests
					.sort(
						(a, b) =>
							statusEnums.indexOf(a.status) - statusEnums.indexOf(b.status),
					)
					.map((test) => (
						<Sheet key={test.id}>
							<SheetTrigger className="cursor-pointer group">
								<div className="flex gap-2 py-4 justify-between px-4 items-center font-normal border-2 rounded-lg overflow-clip hover:bg-accent transition cursor-pointer">
									<span className="line-clamp-1 text-left w-fit">
										{test.testName}
									</span>
									<div className="flex items-center gap-2">
										<LabTestStatusBadge status={test.status} />
										<ChevronRight className="text-muted-foreground" />
									</div>
								</div>
							</SheetTrigger>
							<LabTestUpdateSheet test={test} />
						</Sheet>
					))}
			</div>
		</div>
	);
}
