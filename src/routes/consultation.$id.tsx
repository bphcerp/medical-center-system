import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CloudCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import DiagnosisCard, { type DiagnosisItem } from "@/components/diagnosis-card";
import FinalizeCaseCard, {
	type FinalizeButtonValue,
} from "@/components/finalize-case-card";
import LabRequestModal from "@/components/lab-request-modal";
import PrescriptionCard, {
	type PrescriptionItem,
} from "@/components/prescription/prescription-card";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import VitalField from "@/components/vital-field";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { client } from "./api/$";

type AutosaveState = {
	consultationNotes: string;
	diagnosis: DiagnosisItem[];
	prescriptions: PrescriptionItem[];
};

export const Route = createFileRoute("/consultation/$id")({
	gcTime: 0,
	loader: async ({ params }: { params: { id: string } }) => {
		// Check if user is authenticated
		const res = await client.api.user.$get();
		if (res.status !== 200) {
			throw redirect({
				to: "/login",
			});
		}
		const user = await res.json();
		if ("error" in user) {
			throw redirect({
				to: "/login",
			});
		}
		const consultationRes = await client.api.doctor.consultation[
			":caseId"
		].$get({
			param: { caseId: params.id },
		});

		if (consultationRes.status === 403) {
			throw redirect({
				to: "/doctor",
			});
		}

		if (consultationRes.status !== 200) {
			throw new Error("Failed to fetch consultation details");
		}

		const {
			caseDetail,
			prescriptions,
			diseases: diagnosesFromCase,
		} = await consultationRes.json();

		if (caseDetail.cases.finalizedState !== null) {
			throw redirect({
				to: "/history/$patientId/$caseId",
				params: {
					patientId: String(caseDetail.patient.id),
					caseId: params.id,
				},
			});
		}

		const medicinesRes = await client.api.doctor.medicines.$get();

		if (medicinesRes.status !== 200) {
			throw new Error("Failed to fetch medicines details");
		}

		const { medicines } = await medicinesRes.json();

		const diseasesRes = await client.api.doctor.diseases.$get();

		if (diseasesRes.status !== 200) {
			throw new Error("Failed to fetch diseases details");
		}

		const { diseases } = await diseasesRes.json();

		const testsRes = await client.api.doctor.tests.$get();

		if (testsRes.status !== 200) {
			throw new Error("Failed to fetch lab tests details");
		}

		const { tests } = await testsRes.json();

		return {
			user,
			caseDetail,
			medicines,
			diseases,
			tests,
			prescriptions,
			diagnosesFromCase,
		};
	},
	component: ConsultationPage,
});

function ConsultationPage() {
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
	const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>(
		diagnosesFromCase || [],
	);
	const [consultationNotes, setConsultationNotes] = useState<string>(
		caseDetail?.cases.consultationNotes || "",
	);
	const [prescriptionItems, setPrescriptionItems] = useState(
		prescriptions || [],
	);
	const [labTestModalOpen, setLabTestModalOpen] = useState<boolean>(false);
	const [autosaved, setAutoSaved] = useState<boolean>(false);
	const [autosaveError, setAutosaveError] = useState<string | null>(null);
	const debouncedConsultationNotes = useDebounce(consultationNotes, 500);
	const debouncedPrescriptionItems = useDebounce(prescriptionItems, 500);
	const prevAutosaveRef = useRef<AutosaveState | null>(null);

	const autosave = useCallback(async () => {
		if (
			prevAutosaveRef.current &&
			prevAutosaveRef.current.consultationNotes ===
				debouncedConsultationNotes &&
			prevAutosaveRef.current.diagnosis.length === diagnosisItems.length &&
			prevAutosaveRef.current.diagnosis.every(
				(d, i) => d.id === diagnosisItems[i]?.id,
			) &&
			JSON.stringify(prevAutosaveRef.current.prescriptions) ===
				JSON.stringify(debouncedPrescriptionItems)
		) {
			// No changes since last autosave
			return;
		}
		setAutoSaved(false);
		setAutosaveError(null);
		try {
			await client.api.doctor.autosave.$post({
				json: {
					caseId: Number(id),
					consultationNotes: debouncedConsultationNotes,
					diagnosis: diagnosisItems.map((d) => d.id),
					prescriptions: debouncedPrescriptionItems.map((item) => ({
						...item.case_prescriptions,
						caseId: Number(id),
						medicineId: item.medicines.id,
					})),
				},
			});
		} catch (error) {
			setAutosaveError("Failed to save");
			setAutoSaved(false);
			console.error("Autosave failed:", error);
			throw error;
		}
		setAutoSaved(true);
		prevAutosaveRef.current = {
			consultationNotes: debouncedConsultationNotes,
			diagnosis: diagnosisItems,
			prescriptions: debouncedPrescriptionItems,
		};
	}, [
		id,
		diagnosisItems,
		debouncedConsultationNotes,
		debouncedPrescriptionItems,
	]);

	useEffect(() => {
		autosave().catch(() => {
			console.error("Autosave failed");
		});
		const interval = setInterval(() => {
			autosave().catch(() => {
				console.error("Autosave failed");
			});
		}, 3000);
		return () => clearInterval(interval);
	}, [autosave]);

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
				console.error(
					"Finalized state not matching any of the types Finalize (OPD), Admit, or Referral",
				);
				return;
		}

		// autosave endpoint -> finalize the case
		try {
			await autosave();
		} catch (_error) {
			alert("Failed to save case data");
			return;
		}

		const finalizeRes = await client.api.doctor.finalizeCase.$post({
			json: {
				caseId: Number(id),
				finalizedState: finalizedState,
			},
		});

		if (finalizeRes.status !== 200) {
			const error = await finalizeRes.json();
			alert("error" in error ? error.error : "Failed to finalize case");
			return;
		}

		navigate({
			to: "/doctor",
		});
	}

	return (
		<>
			<TopBar title={`Consultation Page`} />
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
						<VitalField label="Patient Name" value={caseDetail?.patient.name} />
						<VitalField label="Age" value={caseDetail?.patient.age} />
						<VitalField label="ID/PSRN/Phone" value={caseDetail?.identifier} />
					</div>
				</Card>
				<Card className="mb-2">
					<div className="flex gap-4 mx-3">
						<VitalField
							label="Temperature"
							value={caseDetail?.cases.temperature}
						/>
						<VitalField
							label="Heart Rate"
							value={caseDetail?.cases.heartRate}
						/>
						<VitalField
							label="Respiratory Rate"
							value={caseDetail?.cases.respiratoryRate}
						/>
					</div>
					<div className="flex gap-4 mx-3">
						<VitalField
							label="Blood Pressure Systolic"
							value={caseDetail?.cases.bloodPressureSystolic}
						/>
						<VitalField
							label="Blood Pressure Diastolic"
							value={caseDetail?.cases.bloodPressureDiastolic}
						/>
					</div>
					<div className="flex gap-4 mx-3">
						<VitalField
							label="Blood Sugar"
							value={caseDetail?.cases.bloodSugar}
						/>
						<VitalField label="SpO2" value={caseDetail?.cases.spo2} />
						<VitalField label="Weight" value={caseDetail?.cases.weight} />
					</div>
				</Card>
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
