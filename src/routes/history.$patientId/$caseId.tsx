import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import DiagnosisCard from "@/components/diagnosis-card";
import TopBar from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import VitalField from "@/components/vital-field";
import { client } from "../api/$";

export const Route = createFileRoute("/history/$patientId/$caseId")({
	loader: async ({
		params,
	}: {
		params: { patientId: string; caseId: string };
	}) => {
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

		const historyRes = await client.api.patientHistory[":patientId"][
			":caseId"
		].$get({
			param: { patientId: params.patientId, caseId: params.caseId },
		});

		if (historyRes.status !== 200) {
			throw new Error("Failed to fetch case details");
		}

		const { caseDetail, prescriptions, diseases } = await historyRes.json();

		return {
			user,
			caseDetail,
			prescriptions,
			diseases,
		};
	},
	component: CaseDetailsPage,
});

function CaseDetailsPage() {
	const { caseDetail, prescriptions, diseases } = Route.useLoaderData();
	const navigate = useNavigate();

	if (!caseDetail) {
		return (
			<>
				<TopBar title="Case Details" />
				<div className="container mx-auto p-6">
					<h1 className="text-3xl font-bold">Case Details</h1>
					<p className="mt-4">No case details found.</p>
				</div>
			</>
		);
	}

	const finalizedStateLabel =
		caseDetail.finalizedState === "opd"
			? "OPD"
			: caseDetail.finalizedState === "admitted"
				? "Admitted"
				: caseDetail.finalizedState === "referred"
					? "Referred"
					: "Unknown";

	return (
		<>
			<TopBar title={`Consultation History`} />
			<div className="p-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-3xl font-bold">
							Case History - {caseDetail.patientName}
						</h1>
						<p className="text-muted-foreground my-2">
							Case ID: {caseDetail.caseId}
						</p>
						<div className="flex gap-2 items-center mt-2">
							<span className="text-sm font-semibold">Status:</span>
							<Badge
								variant={
									caseDetail.finalizedState === "opd"
										? "default"
										: caseDetail.finalizedState === "admitted"
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
								params: { patientId: String(caseDetail.patientId) },
							})
						}
					>
						Back to History
					</Button>
				</div>

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
							value={caseDetail.consultationNotes || "No notes recorded"}
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
										key={item.id}
										className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
									>
										<div className="flex items-start justify-between gap-3 mb-3">
											<div className="flex-1">
												<div className="flex items-center gap-2 flex-wrap mb-1">
													<span className="font-semibold text-base">
														{item.company} {item.brand}
													</span>
													<Badge variant="default" className="text-xs">
														{item.type}
													</Badge>
												</div>
												<div className="text-sm text-muted-foreground">
													{item.drug} • {item.strength}
												</div>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
											{item.dosage && (
												<div className="flex items-start gap-2">
													<span className="font-medium text-muted-foreground min-w-20">
														Dosage:
													</span>
													<span className="flex-1">{item.dosage}</span>
												</div>
											)}
											{item.frequency && (
												<div className="flex items-start gap-2">
													<span className="font-medium text-muted-foreground min-w-20">
														Frequency:
													</span>
													<span className="flex-1">{item.frequency}</span>
												</div>
											)}
											{item.duration && (
												<div className="flex items-start gap-2">
													<span className="font-medium text-muted-foreground min-w-20">
														Duration:
													</span>
													<span className="flex-1">{item.duration}</span>
												</div>
											)}
											{item.categoryData &&
												(() => {
													try {
														const categoryData =
															typeof item.categoryData === "string"
																? JSON.parse(item.categoryData)
																: item.categoryData;
														return (
															<>
																{categoryData.mealTiming && (
																	<div className="flex items-start gap-2">
																		<span className="font-medium text-muted-foreground min-w-20">
																			Meal Timing:
																		</span>
																		<span className="flex-1">
																			{categoryData.mealTiming === "before"
																				? "Before meal"
																				: "After meal"}
																		</span>
																	</div>
																)}
																{categoryData.applicationArea && (
																	<div className="flex items-start gap-2">
																		<span className="font-medium text-muted-foreground min-w-20">
																			Application:
																		</span>
																		<span className="flex-1">
																			{categoryData.applicationArea}
																		</span>
																	</div>
																)}
																{categoryData.injectionRoute && (
																	<div className="flex items-start gap-2">
																		<span className="font-medium text-muted-foreground min-w-20">
																			Route:
																		</span>
																		<span className="flex-1">
																			{categoryData.injectionRoute}
																		</span>
																	</div>
																)}
																{categoryData.liquidTiming && (
																	<div className="flex items-start gap-2">
																		<span className="font-medium text-muted-foreground min-w-20">
																			Meal Timing:
																		</span>
																		<span className="flex-1">
																			{categoryData.liquidTiming === "before"
																				? "Before meal"
																				: "After meal"}
																		</span>
																	</div>
																)}
															</>
														);
													} catch {
														return null;
													}
												})()}
										</div>

										{item.comments && (
											<div className="mt-3 pt-3 border-t">
												<span className="font-medium text-sm text-muted-foreground">
													Notes:{" "}
												</span>
												<span className="text-sm">{item.comments}</span>
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
