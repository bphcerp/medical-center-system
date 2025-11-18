import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import DiagnosisCard, { type DiagnosisItem } from "@/components/diagnosis-card";
import FinalizeCaseCard, {
	type FinalizeButtonValue,
} from "@/components/finalize-case-card";
import LabRequestModal from "@/components/lab-request-modal";
import PrescriptionCard, {
	type PrescriptionItem,
} from "@/components/prescription-card";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import VitalField from "@/components/vital-field";
import { client } from "./api/$";

export const Route = createFileRoute("/consultation/$id")({
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

		if (consultationRes.status !== 200) {
			throw new Error("Failed to fetch consultation details");
		}

		const { caseDetail } = await consultationRes.json();

		const medicinesRes = await client.api.doctor.medicines.$get();

		if (medicinesRes.status !== 200) {
			throw new Error("Failed to fetch medicines details");
		}

		const { medicines } = await medicinesRes.json();
		// console.log(medicines);

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

		return { user, caseDetail, medicines, diseases, tests };
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	const { caseDetail, medicines, diseases, tests } = Route.useLoaderData();
	const navigate = useNavigate();
	const { id } = Route.useParams();

	const [finalizeButtonValue, setFinalizeButtonValue] =
		useState<FinalizeButtonValue>("Finalize (OPD)");
	const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([]);
	const [consultationNotes, setConsultationNotes] = useState<string>("");
	const [prescriptionItems, setPrescriptionItems] = useState<
		PrescriptionItem[]
	>([]);
	const [labTestModalOpen, setLabTestModalOpen] = useState<boolean>(false);
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
		const caseRes = await client.api.doctor.finalizeCase.$post({
			json: {
				caseId: Number(id),
				finalizedState: finalizedState,
				consultationNotes: consultationNotes,
				diagnosis: diagnosisItems.map((d) => d.id),
				prescriptions: prescriptionItems.map((item) => ({
					medicineId: item.id,
					dosage:
						item.category === "Capsule/Tablet" && item.dosage
							? `${item.dosage} tablet${item.dosage === "1" ? "" : "s"}`
							: item.dosage,
					frequency: item.frequency,
					duration:
						(item.category === "Capsule/Tablet" ||
							item.category === "External Application" ||
							item.category === "Injection" ||
							item.category === "Liquids/Syrups") &&
						item.duration &&
						item.durationUnit
							? `${item.duration} ${item.durationUnit}`
							: item.duration,
					comment: item.comments,
					categoryData:
						item.category === "Capsule/Tablet" && item.mealTiming
							? { mealTiming: item.mealTiming }
							: item.category === "External Application" && item.applicationArea
								? { applicationArea: item.applicationArea }
								: item.category === "Injection" && item.injectionRoute
									? { injectionRoute: item.injectionRoute }
									: item.category === "Liquids/Syrups" && item.liquidTiming
										? { liquidTiming: item.liquidTiming }
										: undefined,
				})),
			},
		});

		if (caseRes.status !== 200) {
			const error = await caseRes.json();
			alert("error" in error ? error.error : "Failed to save case data");
			return;
		}
		navigate({
			to: "/doctor",
		});
	}

	return (
		<>
			<TopBar title={`Consultation for ${caseDetail.patientName}`} />
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-3xl font-bold">
							Consultation for {caseDetail.patientName}
						</h1>
						<p className="text-muted-foreground my-2">
							Token Number: {caseDetail.token}
						</p>
					</div>
					<Button
						onClick={() =>
							navigate({
								to: "/history/$patientId",
								params: { patientId: String(caseDetail.patientId) },
							})
						}
					>
						View History
					</Button>
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
						<VitalField label="Patient Name" value={caseDetail?.patientName} />
						<VitalField label="Age" value={caseDetail?.patientAge} />
						<VitalField label="ID/PSRN/Phone" value={caseDetail?.identifier} />
					</div>
				</Card>
				<Card className="mb-2">
					<div className="flex gap-4 mx-3">
						<VitalField label="Temperature" value={caseDetail?.temperature} />
						<VitalField label="Heart Rate" value={caseDetail?.heartRate} />
						<VitalField
							label="Respiratory Rate"
							value={caseDetail?.respiratoryRate}
						/>
					</div>
					<div className="flex gap-4 mx-3">
						<VitalField
							label="Blood Pressure Systolic"
							value={caseDetail?.bloodPressureSystolic}
						/>
						<VitalField
							label="Blood Pressure Diastolic"
							value={caseDetail?.bloodPressureDiastolic}
						/>
					</div>
					<div className="flex gap-4 mx-3">
						<VitalField label="Blood Sugar" value={caseDetail?.bloodSugar} />
						<VitalField label="SpO2" value={caseDetail?.spo2} />
						<VitalField label="Weight" value={caseDetail?.weight} />
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
