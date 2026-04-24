import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, History, RefreshCw, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import DiagnosisSection from "src/components/consultation/diagnosis-card";
import FinalizeCase, {
	type FinalizeButtonValue,
} from "src/components/consultation/finalize-case-card";
import TestsSection from "src/components/consultation/tests-card";
import PrescriptionSection from "@/components/consultation/prescription/prescription-card";
import FinalizeCaseDialog from "@/components/finalize-case-dialog";
import { PatientDetails } from "@/components/patient-details";
import PrescriptionPrintout from "@/components/prescription-printout";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import VitalsList from "@/components/vitals-card";
import useAuth from "@/lib/hooks/useAuth";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { cn, handleErrors } from "@/lib/utils";
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
		autosaveError,
		isSaving,
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
	const [showAutosaveIndicator, setShowAutosaveIndicator] = useState(false);

	useEffect(() => {
		if (autosaveError) {
			setShowAutosaveIndicator(false);
			return;
		}

		if (!isSaving) {
			setShowAutosaveIndicator(false);
			return;
		}

		const timeout = window.setTimeout(() => {
			setShowAutosaveIndicator(true);
		}, 1000);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [autosaveError, isSaving]);

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
			<TopBar
				title="Consultation"
				actionButton={
					<Button
						onClick={() =>
							navigate({
								to: "/doctor",
							})
						}
						variant="ghost"
						className="p-4 aspect-square"
					>
						<ArrowLeft
							className="text-muted-foreground size-5"
							strokeWidth={2}
						/>
					</Button>
				}
			>
				<div className="flex gap-2 items-stretch">
					<PatientDetails
						patient={caseDetail.patient}
						token={caseDetail.cases.token}
						size="sm"
					/>
					<div className="w-px ms-2 bg-border" />
					<div className="flex gap-2 items-center">
						<Button
							onClick={() =>
								navigate({
									to: "/history/$patientId",
									params: { patientId: String(caseDetail.patient.id) },
								})
							}
							variant="ghost"
							size="sm"
						>
							<History />
							<span className="hidden md:inline">View History</span>
						</Button>
						{(autosaveError || showAutosaveIndicator) && (
							<span
								className={cn(
									autosaveError ? "text-destructive" : "text-muted-foreground",
									"flex gap-1 items-center h-fit text-xs mt-1.5",
								)}
							>
								{autosaveError ? (
									<>
										<TriangleAlert className="size-4 stroke-destructive" />
										{autosaveError}
									</>
								) : (
									<>
										<RefreshCw className="animate-spin size-3" />
										Saving...
									</>
								)}
							</span>
						)}
					</div>
				</div>
			</TopBar>
			<div className="grid h-full grid-rows-[auto_auto_1fr_auto] grid-cols-1 gap-px *:p-4 bg-border *:bg-background md:grid-cols-2">
				<div className="col-span-1 md:col-span-2">
					<div className="flex flex-col xl:flex-row items-stretch gap-4">
						<span className="text-xs font-semibold uppercase text-muted-foreground xl:[writing-mode:vertical-lr] xl:rotate-180 xl:border-l xl:pl-4">
							Vitals
						</span>
						<div className="min-w-0 flex-1">
							<VitalsList vitals={caseDetail.cases} condensed />
						</div>
					</div>
				</div>

				<div className="col-span-1 flex flex-col gap-2 md:col-span-2">
					<Label className="font-semibold text-lg">Chief Complaints</Label>
					<Textarea
						value={chiefComplaints}
						onChange={(e) => setChiefComplaints(e.target.value)}
						className="resize-none min-h-20"
						placeholder="Enter patient's chief complaints (e.g., fever for 3 days, headache, cough)"
					/>
				</div>

				<div className="col-span-1 md:col-span-2 p-0!">
					<div className="h-full grid grid-cols-1 gap-px bg-border! *:py-4 *:px-4 *:bg-background xl:grid-cols-2">
						<div className="col-span-1 row-span-1 flex flex-col gap-2">
							<Label className="font-semibold text-lg">
								Clinical Examination
							</Label>
							<Textarea
								value={consultationNotes}
								onChange={(e) => setConsultationNotes(e.target.value)}
								className="flex-1 resize-none"
								placeholder="Write notes here..."
							/>
						</div>
						<div className="col-span-1 row-span-1">
							<DiagnosisSection
								diseases={diseases}
								diagnosisItems={diagnosisItems}
								setDiagnosisItems={setDiagnosisItems}
							/>
						</div>
						<div className="col-span-1 row-span-1">
							<TestsSection
								tests={tests}
								testItems={testItems}
								setTestItems={setTestItems}
							/>
						</div>
						<div className="col-span-1 row-span-1">
							<PrescriptionSection
								medicines={medicines}
								prescriptionItems={prescriptionItems}
								setPrescriptionItems={setPrescriptionItems}
							/>
						</div>
					</div>
				</div>
				<div className="col-span-1 text-card-foreground md:col-span-2">
					<Label className="font-semibold text-lg">
						History, Assessment and Plan
					</Label>
					<Textarea
						value={clinicalRemarks}
						onChange={(e) => setClinicalRemarks(e.target.value)}
						className="mt-2 resize-none min-h-24"
						placeholder="Relevant history, assessment, plan, follow-up instructions, referral details, or other clinical notes..."
					/>
				</div>

				<FinalizeCaseDialog
					open={openFinalizeDialog}
					onOpenChange={setOpenFinalizeDialog}
					onConfirm={handleFinalize}
				/>

				<div className="col-span-1 md:col-span-2">
					<FinalizeCase
						handleFinalize={handleOpenPrescriptionPreview}
						finalizeButtonValue={finalizeButtonValue}
						setFinalizeButtonValue={setFinalizeButtonValue}
						disabled={isFinalizeDisabled}
					/>
				</div>

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
