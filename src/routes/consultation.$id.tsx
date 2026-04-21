import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CloudCheck,
	History,
	RefreshCw,
	TriangleAlert,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import DiagnosisCard from "@/components/diagnosis-card";
import FinalizeCaseCard, {
	type FinalizeButtonValue,
} from "@/components/finalize-case-card";
import FinalizeCaseDialog from "@/components/finalize-case-dialog";
import { PatientDetails } from "@/components/patient-details";
import PrescriptionCard from "@/components/prescription/prescription-card";
import PrescriptionPrintout from "@/components/prescription-printout";
import TestsCard from "@/components/tests-card";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
				testsFromCase: [],
			};
		}
		const {
			caseDetail,
			prescriptions,
			diseases: diagnosesFromCase,
			tests: testsFromCase,
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
			testsFromCase,

			medicines: medicines,
			diseases: diseases,
			tests: tests,
		};
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	const { user } = useAuth(["doctor"]);
	const {
		caseDetail,
		medicines,
		diseases,
		tests,
		prescriptions,
		diagnosesFromCase,
		testsFromCase,
	} = Route.useLoaderData();
	const navigate = useNavigate();
	const { id } = Route.useParams();

	const [finalizeButtonValue, setFinalizeButtonValue] =
		useState<FinalizeButtonValue>("Finalize (OPD)");

	// Modal state for prescription preview
	const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

	const {
		consultationNotes,
		chiefComplaints,
		clinicalRemarks,
		diagnosisItems,
		prescriptionItems,
		testItems,
		setConsultationNotes,
		setChiefComplaints,
		setClinicalRemarks,
		setDiagnosisItems,
		setPrescriptionItems,
		setTestItems,
		autosaved,
		autosaveError,
		autosave,
	} = useAutosave({
		id,
		diagnosesFromCase,
		caseDetail,
		prescriptions,
		tests: testsFromCase,
	});

	const contentRef = useRef<HTMLDivElement>(null);
	const reactToPrintFn = useReactToPrint({
		contentRef,
	});
	const [openFinalizeDialog, setOpenFinalizeDialog] = useState(false);

	const hasPrescriptionContent = prescriptionItems.some((item) => {
		const prescription = item.case_prescriptions;
		const categoryData = prescription.categoryData;

		return (
			prescription.dosage.trim() !== "" ||
			prescription.frequency.trim() !== "" ||
			prescription.duration.trim() !== "" ||
			(prescription.comment?.trim() ?? "") !== "" ||
			(categoryData &&
				"applicationArea" in categoryData &&
				categoryData.applicationArea.trim() !== "")
		);
	});

	const isFinalizeDisabled =
		consultationNotes.trim() === "" &&
		diagnosisItems.length === 0 &&
		!hasPrescriptionContent &&
		testItems.length === 0 &&
		chiefComplaints.trim() === "" &&
		clinicalRemarks.trim() === "";

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
			await autosave(true);
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

	// Open prescription preview modal instead of auto-printing
	function handleOpenPrescriptionPreview() {
		setPrescriptionModalOpen(true);
	}

	return (
		<div className="flex flex-col h-full">
			<TopBar title="Consultation Page" />
			<div className="flex flex-col px-6 py-4 h-full">
				<div className="flex justify-between items-start mb-4">
					<div className="flex gap-4 items-end">
						<PatientDetails
							patient={caseDetail.patient}
							token={caseDetail.cases.token}
							label={
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										onClick={() =>
											navigate({
												to: "/doctor",
											})
										}
										size="sm"
									>
										<ArrowLeft className="text-muted-foreground" />
									</Button>
									Consultation for
								</div>
							}
						/>
						<span
							className={`py-2 flex items-center gap-2 ${autosaveError ? "text-destructive" : "text-muted-foreground"}`}
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
					<Button
						onClick={() =>
							navigate({
								to: "/history/$patientId",
								params: { patientId: String(caseDetail.patient.id) },
							})
						}
						variant="outline"
					>
						<History />
						<span className="hidden md:inline">View History</span>
					</Button>
				</div>

				{/* Chief Complaints textarea */}
				<Card className="mb-4 p-4">
					<Label className="font-semibold text-lg">Chief Complaints</Label>
					<Textarea
						value={chiefComplaints}
						onChange={(e) => setChiefComplaints(e.target.value)}
						className="mt-2 resize-none min-h-20"
						placeholder="Enter patient's chief complaints (e.g., fever for 3 days, headache, cough)..."
					/>
				</Card>

				<Card className="mb-4 p-0">
					<VitalsCard vitals={caseDetail.cases} condensed />
				</Card>
				<div className="flex grow shrink basis-auto">
					<div className="grid xl:grid-cols-2 grid-cols-1 w-full">
						<Card className="col-span-1 row-span-2 xl:rounded-tl-xl xl:rounded-r-none xl:rounded-bl-none rounded-t-xl rounded-b-none px-4 pt-3 pb-2">
							<Label className="font-semibold text-lg">
								Clinical Examination
							</Label>
							<Textarea
								value={consultationNotes}
								onChange={(e) => setConsultationNotes(e.target.value)}
								className="h-full -mt-3.5 -mb-3.5 resize-none min-h-48"
								placeholder="Write notes here..."
							/>
							<TestsCard
								tests={tests}
								testItems={testItems}
								setTestItems={setTestItems}
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
					</div>
				</div>

				{/* Clinical Remarks / Addendum textarea */}
				<Card className="mt-4 p-4">
					<Label className="font-semibold text-lg">
						History, Assessment and Plan
					</Label>
					<Textarea
						value={clinicalRemarks}
						onChange={(e) => setClinicalRemarks(e.target.value)}
						className="mt-2 resize-none min-h-24"
						placeholder="Relevant history, assessment, plan, follow-up instructions, referral details, or other clinical notes..."
					/>
				</Card>

				<FinalizeCaseDialog
					open={openFinalizeDialog}
					onOpenChange={setOpenFinalizeDialog}
					onConfirm={handleFinalize}
				/>

				<FinalizeCaseCard
					handleFinalize={handleOpenPrescriptionPreview}
					finalizeButtonValue={finalizeButtonValue}
					setFinalizeButtonValue={setFinalizeButtonValue}
					disabled={isFinalizeDisabled}
				/>

				{/* Printable content kept offscreen so print styles still apply. */}
				<div className="fixed -left-[10000px] top-0 w-[210mm] bg-white">
					<div ref={contentRef}>
						<PrescriptionPrintout
							caseDetail={caseDetail}
							prescriptionItems={prescriptionItems}
							diagnosisItems={diagnosisItems}
							consultationNotes={consultationNotes}
							chiefComplaints={chiefComplaints}
							clinicalRemarks={clinicalRemarks}
							testItems={testItems}
							finalizeValue={finalizeButtonValue}
							doctor={user}
						/>
					</div>
				</div>
			</div>

			{/* Prescription Preview Modal */}
			<Dialog
				open={prescriptionModalOpen}
				onOpenChange={setPrescriptionModalOpen}
			>
				<DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between">
							Prescription Preview
						</DialogTitle>
					</DialogHeader>
					<div className="border rounded bg-white text-black">
						<PrescriptionPrintout
							caseDetail={caseDetail}
							prescriptionItems={prescriptionItems}
							diagnosisItems={diagnosisItems}
							consultationNotes={consultationNotes}
							chiefComplaints={chiefComplaints}
							clinicalRemarks={clinicalRemarks}
							testItems={testItems}
							finalizeValue={finalizeButtonValue}
							doctor={user}
						/>
					</div>
					<DialogFooter className="flex gap-2 sm:justify-between">
						<Button
							variant="outline"
							onClick={() => setPrescriptionModalOpen(false)}
						>
							<X className="mr-1 size-4" />
							Close
						</Button>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => {
									reactToPrintFn();
								}}
							>
								Print / Save as PDF
							</Button>
							<Button
								onClick={() => {
									setPrescriptionModalOpen(false);
									setOpenFinalizeDialog(true);
								}}
							>
								{finalizeButtonValue}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
