import { Label } from "@radix-ui/react-label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import DiagnosisCard from "@/components/diagnosis-card";
import {
	OTPVerificationDialog,
	useOTP,
} from "@/components/otp-verification-dialog";
import TopBar from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import VitalField from "@/components/vital-field";
import VitalsCard from "@/components/vitals-card";
import useAuth from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/history/$patientId/$caseId")({
	component: CaseDetailsPage,
});

function CaseDetailsPage() {
	useAuth(["doctor"]);
	const { caseId, patientId } = Route.useParams();
	const navigate = useNavigate();
	const {
		caseRecord,
		isSendingOtp,
		isOtpDialogOpen,
		handleVerifyOtp,
		handleOverride,
		isVerifying,
		setIsOtpDialogOpen,
		otpError,
	} = useOTP(caseId);

	// OTP verification state
	const { caseDetail, prescriptions, diseases } = caseRecord || {
		caseDetail: null,
		prescriptions: [],
		diseases: [],
	};

	if (!caseDetail) {
		return (
			<>
				<TopBar title="Case Details" />
				<div className="container mx-auto p-6">
					<h1 className="text-3xl font-bold">Case Details</h1>
					<p className="text-muted-foreground mt-2">Case ID: {caseId}</p>
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
								navigate({
									to: "/history/$patientId",
									params: { patientId },
								});
							}
							setIsOtpDialogOpen(open);
						}}
						onVerify={handleVerifyOtp}
						onOverride={handleOverride}
						patientName="the patient"
						isVerifying={isVerifying}
						error={otpError}
					/>
				</div>
			</>
		);
	}

	const finalizedStateLabel =
		caseDetail.cases.finalizedState === "opd"
			? "OPD"
			: caseDetail.cases.finalizedState === "admitted"
				? "Admitted"
				: caseDetail.cases.finalizedState === "referred"
					? "Referred"
					: "Unknown";

	return (
		<>
			<TopBar title={`Consultation History`} />
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-3xl font-bold">
							Case History - {caseDetail.patient.name}
						</h1>
						<p className="text-muted-foreground my-2">
							Case ID: {caseDetail.cases.id}
						</p>
						<div className="flex gap-2 items-center mt-2">
							<span className="text-sm font-semibold">Status:</span>
							<Badge
								variant={
									caseDetail.cases.finalizedState === "opd"
										? "default"
										: caseDetail.cases.finalizedState === "admitted"
											? "secondary"
											: "outline"
								}
							>
								{finalizedStateLabel}
							</Badge>
						</div>
					</div>
					<Button
						onClick={() =>
							navigate({
								to: "/history/$patientId",
								params: { patientId: String(caseDetail.patient.id) },
							})
						}
					>
						Back to History
					</Button>
				</div>

				<Card className="mb-2">
					<div className="flex gap-4 mx-3">
						<VitalField label="Patient Name" value={caseDetail?.patient.name} />
						<VitalField label="Age" value={caseDetail?.patient.age} />
						<VitalField label="ID/PSRN/Phone" value={caseDetail?.identifier} />
					</div>
				</Card>

				<Card className="mb-4 p-0">
					<VitalsCard vitals={caseDetail.cases} condensed />
				</Card>

				<div className="grid grid-cols-3 mb-2">
					<Card className="col-span-1 row-span-2 rounded-r-none rounded-bl-none px-2 pt-4 pb-2">
						<Label className="font-semibold text-lg">
							Clinical Examination
						</Label>
						<Textarea
							value={caseDetail?.cases.consultationNotes || "No notes recorded"}
							readOnly
							className="h-full -mt-3.5 resize-none bg-muted"
						/>
					</Card>

					<DiagnosisCard
						diseases={diseases}
						diagnosisItems={diseases}
						setDiagnosisItems={() => {}}
						readonly
					/>

					<Card className="col-span-2 gap-4 row-span-1 rounded-none min-h-52">
						<div className="flex items-center w-full gap-2 px-4 pt-2">
							<Label className="font-semibold text-lg">Prescription</Label>
						</div>
						{prescriptions.length === 0 ? (
							<div className="px-4 pb-4 text-muted-foreground text-center">
								No prescriptions recorded
							</div>
						) : (
							<div className="px-4 pb-4 space-y-4">
								{prescriptions.map((item) => (
									<div
										key={item.medicines.id}
										className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
									>
										<div className="flex items-start justify-between gap-3 mb-3">
											<div className="flex-1">
												<div className="flex items-center gap-2 flex-wrap mb-1">
													<span className="font-semibold text-base">
														{item.medicines.company} {item.medicines.brand}
													</span>
													<Badge variant="default" className="text-xs">
														{item.medicines.type}
													</Badge>
												</div>
												<div className="text-sm text-muted-foreground">
													{item.medicines.drug} • {item.medicines.strength}
												</div>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
											{item.case_prescriptions.dosage && (
												<div className="flex items-start gap-2">
													<span className="font-medium text-muted-foreground min-w-20">
														Dosage:
													</span>
													<span className="flex-1">
														{item.case_prescriptions.dosage}
													</span>
												</div>
											)}
											{item.case_prescriptions.frequency && (
												<div className="flex items-start gap-2">
													<span className="font-medium text-muted-foreground min-w-20">
														Frequency:
													</span>
													<span className="flex-1">
														{item.case_prescriptions.frequency}
													</span>
												</div>
											)}
											{item.case_prescriptions.duration &&
												item.case_prescriptions.durationUnit && (
													<div className="flex items-start gap-2">
														<span className="font-medium text-muted-foreground min-w-20">
															Duration:
														</span>
														<span className="flex-1">
															{item.case_prescriptions.duration}{" "}
															{item.case_prescriptions.durationUnit}
														</span>
													</div>
												)}

											{item.case_prescriptions.categoryData &&
												"mealTiming" in item.case_prescriptions.categoryData &&
												item.case_prescriptions.categoryData.mealTiming && (
													<div className="flex items-start gap-2">
														<span className="font-medium text-muted-foreground min-w-20">
															Meal Timing:
														</span>
														<span className="flex-1">
															{item.case_prescriptions.categoryData.mealTiming}
														</span>
													</div>
												)}
											{item.case_prescriptions.categoryData &&
												"applicationArea" in
													item.case_prescriptions.categoryData &&
												item.case_prescriptions.categoryData
													.applicationArea && (
													<div className="flex items-start gap-2">
														<span className="font-medium text-muted-foreground min-w-20">
															Application:
														</span>
														<span className="flex-1">
															{
																item.case_prescriptions.categoryData
																	.applicationArea
															}
														</span>
													</div>
												)}
											{item.case_prescriptions.categoryData &&
												"injectionRoute" in
													item.case_prescriptions.categoryData && (
													<div className="flex items-start gap-2">
														<span className="font-medium text-muted-foreground min-w-20">
															Route:
														</span>
														<span className="flex-1">
															{
																item.case_prescriptions.categoryData
																	.injectionRoute
															}
														</span>
													</div>
												)}
											{item.case_prescriptions.categoryData &&
												"mealTiming" in
													item.case_prescriptions.categoryData && (
													<div className="flex items-start gap-2">
														<span className="font-medium text-muted-foreground min-w-20">
															Liquid Timing:
														</span>
														<span className="flex-1">
															{item.case_prescriptions.categoryData.mealTiming}
														</span>
													</div>
												)}
										</div>

										{item.case_prescriptions.comment && (
											<div className="mt-3 pt-3 border-t">
												<span className="font-medium text-sm text-muted-foreground">
													Notes:{" "}
												</span>
												<span className="text-sm">
													{item.case_prescriptions.comment}
												</span>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</Card>
				</div>
			</div>
		</>
	);
}
