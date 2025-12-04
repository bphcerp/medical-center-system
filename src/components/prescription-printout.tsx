import { PiIcon } from "lucide-react";
import type { JWTPayload } from "@/lib/types/api";
import type { DiagnosisItem } from "./diagnosis-card";
import type { FinalizeButtonValue } from "./finalize-case-card";
import type { PrescriptionItem } from "./prescription/types";
import type { TestItem } from "./tests-card";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import type { CaseDetail } from "./vitals-card";

const PrescriptionPrintout = ({
	caseDetail,
	prescriptionItems,
	diagnosisItems,
	consultationNotes,
	testItems,
	finalizeValue,
	doctor,
}: {
	caseDetail: CaseDetail["data"]["caseDetail"];
	prescriptionItems: PrescriptionItem[];
	diagnosisItems: DiagnosisItem[];
	consultationNotes: string;
	testItems: TestItem[];
	finalizeValue: FinalizeButtonValue;
	doctor: JWTPayload | undefined;
}) => {
	return (
		<>
			<div className="w-full font-serif">
				<PiIcon className="absolute top-8 left-8" />
				<h1 className="text-xl font-bold uppercase underline my-8 w-full text-center">
					Medical Center, BITS Pilani Hyderabad Campus
				</h1>
			</div>
			<div className="border border-black divide-solid divide-y divide-black mx-4 flex flex-col">
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Date:</span>{" "}
						{new Date().toLocaleDateString()}
					</span>
					<span>
						<span className="font-bold">Patient Type:</span>{" "}
						{caseDetail.patient.type.toUpperCase()}
					</span>
					<span>
						<span className="font-bold">PSRN/ID/Number:</span>{" "}
						{caseDetail.identifier}
					</span>
				</div>
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Name of Patient:</span>{" "}
						{caseDetail.patient.name}
					</span>
					<span>
						<span className="font-bold">Age:</span> {caseDetail.patient.age}
					</span>
					<span>
						<span className="font-bold">Sex:</span>{" "}
						{caseDetail.patient.sex.toUpperCase()}
					</span>
				</div>
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Body Temperature:</span>{" "}
						{caseDetail.cases.temperature ?? "—"} °F
					</span>
					<span>
						<span className="font-bold">Heart Rate:</span>{" "}
						{caseDetail.cases.heartRate ?? "—"} bpm
					</span>
					<span>
						<span className="font-bold">Respiratory Rate:</span>{" "}
						{caseDetail.cases.respiratoryRate ?? "—"} per min
					</span>
				</div>
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">SpO2:</span>{" "}
						{caseDetail.cases.spo2 ?? "—"} %
					</span>
					<span>
						<span className="font-bold">Blood Pressure:</span>{" "}
						{`${caseDetail.cases.bloodPressureSystolic ?? "—"}/${caseDetail.cases.bloodPressureDiastolic ?? "—"}`}{" "}
						mmHg
					</span>
					<span>
						<span className="font-bold">Weight:</span>{" "}
						{caseDetail.cases.weight ?? "—"} kg
					</span>
					<span>
						<span className="font-bold">Blood Sugar:</span>{" "}
						{caseDetail.cases.bloodSugar ?? "—"} mg/dL
					</span>
				</div>
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Physician:</span> {doctor?.name ?? "—"}
					</span>
				</div>
			</div>
			<div className="m-4 grid grid-cols-2 divide-x divide-black divide-solid">
				<div className="flex flex-col divide-y divide-black divide-solid px-4">
					<div>
						<h2 className="text-lg font-bold underline mb-2">
							Clinical Examination
						</h2>
						<p className="whitespace-pre-wrap min-h-36">
							{consultationNotes || "No notes provided."}
						</p>
					</div>
					<div className="pt-3">
						<h2 className="text-lg font-bold underline mb-2">Tests</h2>
						<ul className="flex flex-col list-inside divide-y divide-border divide-solid gap-2">
							{testItems.map((item) => (
								<li key={item.id} className="pb-2 list-disc">
									<span>
										{item.name} ({item.category})
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
				<div className="flex flex-col divide-y divide-black divide-solid px-4">
					<div>
						<h2 className="text-lg font-bold underline mb-2">Diagnosis</h2>
						<ul className="flex flex-col list-inside divide-y divide-border divide-solid gap-2 min-h-36">
							{diagnosisItems.map((item) => (
								<li key={item.id} className="pb-2 list-disc">
									<span>
										{item.name} ({item.icd})
									</span>
								</li>
							))}
						</ul>
					</div>
					<div className="min-h-52 pt-3">
						<Label className="font-semibold text-lg">Prescription</Label>
						{prescriptionItems.length === 0 ? (
							<div className="pb-4 text-muted-foreground text-center">
								No prescriptions recorded
							</div>
						) : (
							<div className="pb-4 space-y-2">
								{prescriptionItems.map((item) => (
									<div
										key={item.medicines.id}
										className="border rounded-lg p-2 bg-card hover:bg-accent/5 transition-colors"
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
					</div>
				</div>
			</div>
			<div className="border border-black divide-solid divide-y divide-black mx-4 mt-4 flex flex-col mb-8">
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Final Decision:</span> {finalizeValue}
					</span>
				</div>
			</div>
			<div className="px-4 w-full flex justify-between">
				<div className="flex gap-2 items-center">
					<PiIcon />
					<div className="flex flex-col text-sm">
						<span>Birla Institute of Technology & Science Pilani</span>
						<span>Hyderabad Campus</span>
						<span>Jawahar Nagar, Shameerpet Mandal</span>
						<span>Hyderabad - 500078, Telangana, India</span>
					</div>
				</div>
				<div className="text-sm">
					<div className="flex justify-between gap-8">
						<span>Medical Centre</span>
						<span>9010202850</span>
					</div>
					<div className="flex justify-between gap-8">
						<span>Ambulance</span>
						<span>9640921921</span>
					</div>
					<div className="flex justify-between gap-8">
						<span>Lab</span>
						<span>9010208400</span>
					</div>
				</div>
			</div>
		</>
	);
};

export default PrescriptionPrintout;
