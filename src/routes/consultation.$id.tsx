import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CloudCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import DiagnosisCard, { type DiagnosisItem } from "@/components/diagnosis-card";
import FinalizeCaseCard, {
	type FinalizeButtonValue,
} from "@/components/finalize-case-card";
import LabRequestModal from "@/components/lab-request-modal";
import { OTPVerificationDialog } from "@/components/otp-verification-dialog";
import PrescriptionCard, {
	type PrescriptionItem,
} from "@/components/prescription-card";
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
			const errorData = await consultationRes.json();
			// Check if OTP is required
			if ("requiresOtp" in errorData && errorData.requiresOtp) {
				// Return special state to indicate OTP is required
				return {
					user,
					requiresOtp: true,
					caseId: params.id,
					caseDetail: null,
					medicines: [],
					diseases: [],
					tests: [],
					prescriptions: [],
					diagnosesFromCase: [],
				};
			}
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

		if (caseDetail.finalizedState !== null) {
			// Case is finalized, show it in readonly mode
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

			return {
				user,
				requiresOtp: false,
				caseId: params.id,
				caseDetail,
				medicines,
				diseases,
				tests: [],
				prescriptions,
				diagnosesFromCase,
			};
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
			requiresOtp: false,
			caseId: params.id,
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
	const loaderData = Route.useLoaderData();
	const {
		requiresOtp,
		caseDetail,
		medicines,
		diseases,
		tests,
		prescriptions,
		diagnosesFromCase,
	} = loaderData;
	const navigate = useNavigate();
	const { id } = Route.useParams();

	// OTP verification state
	const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(requiresOtp || false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [otpError, setOtpError] = useState<string | null>(null);

	const [finalizeButtonValue, setFinalizeButtonValue] =
		useState<FinalizeButtonValue>("Finalize (OPD)");
	const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>(
		diagnosesFromCase || [],
	);
	const [consultationNotes, setConsultationNotes] = useState<string>(
		caseDetail?.consultationNotes || "",
	);
	const [prescriptionItems, setPrescriptionItems] = useState<
		PrescriptionItem[]
	>(
		prescriptions?.map((p) => {
			// TODO: Improve this parsing logic by standardizing categoryData structure in zod
			const categoryData =
				typeof p.categoryData === "string"
					? JSON.parse(p.categoryData)
					: p.categoryData;
			return {
				id: p.medicineId,
				drug: p.drug,
				company: p.company,
				brand: p.brand,
				strength: p.strength,
				type: p.type,
				category: p.category,
				dosage: p.dosage?.replace(/\s*tablets?$/, "") || "",
				frequency: p.frequency || "",
				duration: p.duration?.match(/^\d+/)?.[0] || "",
				durationUnit: p.duration?.match(/\s+(\w+)$/)?.[1] || "days",
				comments: p.comments || "",
				mealTiming: categoryData?.mealTiming,
				applicationArea: categoryData?.applicationArea,
				injectionRoute: categoryData?.injectionRoute,
				liquidTiming: categoryData?.liquidTiming,
			};
		}) || [],
	);
	const [labTestModalOpen, setLabTestModalOpen] = useState<boolean>(false);
	const [autosaved, setAutoSaved] = useState<boolean>(false);
	const [autosaveError, setAutosaveError] = useState<string | null>(null);
	const debouncedConsultationNotes = useDebounce(consultationNotes, 500);
	const debouncedPrescriptionItems = useDebounce(prescriptionItems, 500);
	const prevAutosaveRef = useRef<AutosaveState | null>(null);
	const otpSentRef = useRef<boolean>(false);

	const sendOtp = useCallback(async () => {
		setIsSendingOtp(true);
		setOtpError(null);
		try {
			const response = await client.api.doctor.consultation[":caseId"][
				"send-otp"
			].$post({
				param: { caseId: id },
			});

			if (response.status === 200) {
				setIsOtpDialogOpen(true);
				setOtpError(null);
			} else if (response.status === 404) {
				setOtpError(
					"Patient email not found. Use emergency override to access this case.",
				);
				setIsOtpDialogOpen(true);
			} else {
				const errorData = await response.json();
				setOtpError(
					`Failed to send OTP: ${(errorData as { error?: string })?.error || "Unknown error"}. Use emergency override if needed.`,
				);
				setIsOtpDialogOpen(true);
			}
		} catch (error) {
			console.error("Failed to send OTP:", error);
			setOtpError(
				"Failed to send OTP due to network error. Use emergency override if needed.",
			);
			setIsOtpDialogOpen(true);
		} finally {
			setIsSendingOtp(false);
		}
	}, [id]);

	// Auto-send OTP when OTP is required (only once)
	useEffect(() => {
		if (requiresOtp && !otpSentRef.current && !isSendingOtp) {
			otpSentRef.current = true;
			sendOtp();
		}
	}, [requiresOtp, isSendingOtp, sendOtp]);

	const handleVerifyOtp = async (otp: string) => {
		setIsVerifying(true);
		setOtpError(null);
		try {
			const response = await client.api.doctor.consultation[":caseId"][
				"verify-otp"
			].$post({
				param: { caseId: id },
				json: { otp: Number(otp) },
			});

			if (response.status === 200) {
				setIsOtpDialogOpen(false);
				// Reload the page to fetch case details
				window.location.reload();
			} else if (response.status === 400) {
				setOtpError("Invalid OTP. Please try again.");
			} else {
				setOtpError("Failed to verify OTP. Please try again.");
			}
		} catch (error) {
			console.error("Failed to verify OTP:", error);
			setOtpError("Failed to verify OTP. Please try again.");
		} finally {
			setIsVerifying(false);
		}
	};

	const handleOverride = async (reason: string) => {
		setOtpError(null);
		try {
			const response = await client.api.doctor.consultation[":caseId"][
				"override-otp"
			].$post({
				param: { caseId: id },
				json: { reason },
			});

			if (response.status === 200) {
				setIsOtpDialogOpen(false);
				// Reload the page to fetch case details
				window.location.reload();
			} else {
				const errorData = await response.json();
				setOtpError(
					(errorData as { error?: string })?.error ||
						"Failed to process override",
				);
			}
		} catch (error) {
			console.error("Failed to override:", error);
			setOtpError("Failed to process override. Please try again.");
		}
	};

	const autosave = useCallback(async () => {
		// Don't autosave if case is finalized (readonly mode)
		if (caseDetail?.finalizedState !== null) {
			return;
		}

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
								: item.category === "External Application" &&
										item.applicationArea
									? { applicationArea: item.applicationArea }
									: item.category === "Injection" && item.injectionRoute
										? { injectionRoute: item.injectionRoute }
										: item.category === "Liquids/Syrups" && item.liquidTiming
											? { liquidTiming: item.liquidTiming }
											: undefined,
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
		caseDetail?.finalizedState,
	]);

	useEffect(() => {
		// Skip autosave for finalized cases
		if (caseDetail?.finalizedState !== null) {
			return;
		}

		autosave().catch(() => {
			console.error("Autosave failed");
		});
		const interval = setInterval(() => {
			autosave().catch(() => {
				console.error("Autosave failed");
			});
		}, 3000);
		return () => clearInterval(interval);
	}, [autosave, caseDetail]);

	if (!caseDetail) {
		return (
			<>
				<TopBar title="Consultation Page" />
				<div className="container mx-auto p-6">
					<h1 className="text-3xl font-bold">Consultation Page</h1>
					<p className="text-muted-foreground mt-2">Case ID: {id}</p>
					{requiresOtp ? (
						<>
							<p className="mt-4">
								{isSendingOtp
									? "Sending OTP to patient's email..."
									: "Waiting for OTP verification..."}
							</p>
							<OTPVerificationDialog
								open={isOtpDialogOpen}
								onOpenChange={(open) => {
									if (!open) {
										// If user closes dialog without verifying, redirect back
										navigate({ to: "/doctor" });
									}
									setIsOtpDialogOpen(open);
								}}
								onVerify={handleVerifyOtp}
								onOverride={handleOverride}
								patientName="the patient"
								isVerifying={isVerifying}
								error={otpError}
							/>
						</>
					) : (
						<p className="mt-4">No consultation details found for this case.</p>
					)}
				</div>
			</>
		);
	}

	const isReadOnly = caseDetail.finalizedState !== null;

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
			<TopBar title={`Consultation ${isReadOnly ? "History" : "Page"}`} />
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-3xl font-bold">
							{isReadOnly ? "Case History - " : "Consultation for "}
							{caseDetail.patientName}
						</h1>
						<div className="flex gap-4 items-center text-muted-foreground ">
							<p className="my-2">
								{isReadOnly
									? `Case ID: ${caseDetail.caseId}`
									: `Token Number: ${caseDetail.token}`}
							</p>
							{!isReadOnly && (
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
							)}
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
						{!isReadOnly && (
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
						)}
					</div>
				</div>
				{!isReadOnly && (
					<LabRequestModal
						id={id}
						labTestModalOpen={labTestModalOpen}
						setLabTestModalOpen={setLabTestModalOpen}
						tests={tests}
					/>
				)}
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
							placeholder={
								isReadOnly ? "No notes recorded" : "Write notes here..."
							}
							readOnly={isReadOnly}
						/>
					</Card>
					<DiagnosisCard
						diseases={diseases}
						diagnosisItems={diagnosisItems}
						setDiagnosisItems={setDiagnosisItems}
						readonly={isReadOnly}
					/>
					<PrescriptionCard
						medicines={medicines}
						prescriptionItems={prescriptionItems}
						setPrescriptionItems={setPrescriptionItems}
					/>
					{!isReadOnly && (
						<FinalizeCaseCard
							setLabTestModalOpen={setLabTestModalOpen}
							handleFinalize={handleFinalize}
							finalizeButtonValue={finalizeButtonValue}
							setFinalizeButtonValue={setFinalizeButtonValue}
						/>
					)}
				</div>
			</div>
		</>
	);
}
