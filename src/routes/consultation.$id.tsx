import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CloudCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DiagnosisCard from "@/components/diagnosis-card";
import FinalizeCaseCard, {
	type FinalizeButtonValue,
} from "@/components/finalize-case-card";
import LabRequestModal from "@/components/lab-request-modal";
import PrescriptionCard from "@/components/prescription/prescription-card";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import VitalField from "@/components/vital-field";
import VitalsCard from "@/components/vitals-card";
import useAuth from "@/lib/hooks/useAuth";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { handleErrors } from "@/lib/utils";
import { client } from "./api/$";

export const Route = createFileRoute("/consultation/$id")({
	gcTime: 0,
	loader: async ({ params }: { params: { id: string } }) => {
		const consultationRes = await client.api.doctor.consultation[
			":caseId"
		].$get({
			param: { caseId: params.id },
		});
		const medicinesRes = await client.api.doctor.medicines.$get();
		const diseasesRes = await client.api.doctor.diseases.$get();
		const testsRes = await client.api.doctor.tests.$get();
		const consultation = await handleErrors(consultationRes);
		const medicines = await handleErrors(medicinesRes);
		const diseases = await handleErrors(diseasesRes);
		const tests = await handleErrors(testsRes);
		if (!consultation || !medicines || !diseases || !tests) {
			return {
				caseDetail: null,
				medicines: [],
				diseases: [],
				tests: [],
				prescriptions: [],
				diagnosesFromCase: [],
			};
		}
		const {
			caseDetail,
			prescriptions,
			diseases: diagnosesFromCase,
		} = consultation;

		if (caseDetail.cases.finalizedState !== null) {
			throw redirect({
				to: "/history/$patientId/$caseId",
				params: {
					patientId: String(caseDetail.patient.id),
					caseId: params.id,
				},
			});
		}

		return {
			caseDetail,
			prescriptions,
			diagnosesFromCase,

			medicines: medicines,
			diseases: diseases,
			tests: tests,
		};
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	useAuth(["doctor"]);
	const {
		caseDetail,
		medicines,
		diseases,
		tests,
		prescriptions,
		diagnosesFromCase,
	} = Route.useLoaderData();
	const navigate = useNavigate();
	const { id } = Route.useParams();

	const [finalizeButtonValue, setFinalizeButtonValue] =
		useState<FinalizeButtonValue>("Finalize (OPD)");
	const [labTestModalOpen, setLabTestModalOpen] = useState<boolean>(false);
	const {
		consultationNotes,
		diagnosisItems,
		prescriptionItems,
		setConsultationNotes,
		setDiagnosisItems,
		setPrescriptionItems,
		autosaved,
		autosaveError,
		autosave,
	} = useAutosave({
		id,
		diagnosesFromCase,
		caseDetail,
		prescriptions,
	});

	if (!caseDetail) {
		return (
			<div className="container mx-auto p-6">
				<h1 className="text-3xl font-bold">Consultation Page</h1>
				<p className="text-muted-foreground mt-2">Case ID: {id}</p>
				<p className="mt-4">No consultation details found for this case.</p>
			</div>
		);
	}

	async function handleFinalize() {
		let finalizedState: "opd" | "admitted" | "referred";
		switch (finalizeButtonValue) {
			case "Finalize (OPD)":
				finalizedState = "opd";
				break;
			case "Admit":
				finalizedState = "admitted";
				break;
			case "Referral":
				finalizedState = "referred";
				break;
			default:
				toast.error(
					"Finalized state not matching any of the types Finalize (OPD), Admit, or Referral",
				);
				return;
		}

		// autosave endpoint -> finalize the case
		try {
			await autosave();
		} catch (error) {
			toast.error("Failed to save case data");
			console.error("Error saving case data:", error);
			return;
		}

		const finalizeRes = await client.api.doctor.finalizeCase.$post({
			json: {
				caseId: Number(id),
				finalizedState: finalizedState,
			},
		});
		const finalizeData = await handleErrors(finalizeRes);
		if (!finalizeData) {
			return;
		}
		navigate({
			to: "/doctor",
		});
	}

	return (
		<>
			<TopBar title="Consultation Page" />
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-3xl font-bold">
							Consultation for {caseDetail.patient.name}
						</h1>
						<div className="flex gap-4 items-center text-muted-foreground ">
							<p className="my-2">Token Number: {caseDetail.cases.token}</p>
							<span
								className={`my-2 flex items-center gap-2 ${autosaveError ? "text-destructive" : ""}`}
							>
								{autosaveError ? (
									<>
										<TriangleAlert className="size-4" />
										{autosaveError}
									</>
								) : autosaved ? (
									<CloudCheck className="size-4" />
								) : (
									<>
										<RefreshCw className="animate-spin size-4" />
										Saving...
									</>
								)}
							</span>
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
						<Button
							onClick={() =>
								navigate({
									to: "/history/$patientId",
									params: { patientId: String(caseDetail.patient.id) },
								})
							}
						>
							View History
						</Button>
					</div>
				</div>
				<LabRequestModal
					id={id}
					labTestModalOpen={labTestModalOpen}
					setLabTestModalOpen={setLabTestModalOpen}
					tests={tests}
				/>
				{/* TODO: Standardize this vitals layout and make it a component also used in the vitals page */}
				<Card className="mb-2">
					<div className="flex gap-4 mx-3">
						<VitalField
							label="Patient Name"
							type="text"
							value={caseDetail?.patient.name}
							readonly
						/>
						<VitalField label="Age" value={caseDetail?.patient.age} readonly />
						<VitalField
							label="ID/PSRN/Phone"
							type="text"
							value={caseDetail?.identifier}
							readonly
						/>
					</div>
				</Card>
				<VitalsCard vitals={caseDetail.cases} />
				<div className="grid grid-cols-3 mb-2">
					<Card className="col-span-1 row-span-2 rounded-r-none rounded-bl-none px-2 pt-4 pb-2">
						<Label className="font-semibold text-lg">
							Clinical Examination
						</Label>
						<Textarea
							value={consultationNotes}
							onChange={(e) => setConsultationNotes(e.target.value)}
							className="h-full -mt-3.5 resize-none"
							placeholder="Write notes here..."
						/>
					</Card>
					<DiagnosisCard
						diseases={diseases}
						diagnosisItems={diagnosisItems}
						setDiagnosisItems={setDiagnosisItems}
					/>
					<PrescriptionCard
						medicines={medicines}
						prescriptionItems={prescriptionItems}
						setPrescriptionItems={setPrescriptionItems}
					/>
					<FinalizeCaseCard
						setLabTestModalOpen={setLabTestModalOpen}
						handleFinalize={handleFinalize}
						finalizeButtonValue={finalizeButtonValue}
						setFinalizeButtonValue={setFinalizeButtonValue}
					/>
				</div>
			</div>
		</>
	);
}
