import type { JWTPayload } from "@/lib/types/api";
import Logo from "@/styles/logo.svg";
import type { DiagnosisItem } from "./consultation/diagnosis-section";
import type { FinalizeButtonValue } from "./consultation/finalize-case-section";
import type { PrescriptionItem } from "./consultation/prescription/types";
import type { TestItem } from "./consultation/tests-section";
import type { CaseDetail } from "./vitals-list";

const PrescriptionPrintout = ({
	caseDetail,
	prescriptionItems,
	diagnosisItems,
	consultationNotes,
	chiefComplaints,
	clinicalRemarks,
	testItems,
	finalizeValue,
	doctor,
}: {
	caseDetail: CaseDetail["data"]["caseDetail"];
	prescriptionItems: PrescriptionItem[];
	diagnosisItems: DiagnosisItem[];
	consultationNotes: string;
	chiefComplaints: string;
	clinicalRemarks: string;
	testItems: TestItem[];
	finalizeValue: FinalizeButtonValue;
	doctor: JWTPayload | undefined;
}) => {
	const now = new Date();
	const timestamp = now.toLocaleString("en-IN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	return (
		<div className="relative w-full bg-white text-black font-serif">
			<div className="relative w-full text-black bg-white">
				<img
					src={Logo}
					alt="BITS Pilani Logo"
					className="absolute size-20 top-0 left-19"
					style={{ filter: "grayscale(100%)" }}
				/>
				<h1 className="text-xl font-bold uppercase underline my-8 w-full text-center pt-8 text-black ml-[120px] pr-8">
					Medical Center, BITS Pilani Hyderabad Campus
				</h1>
			</div>
			<div className="border border-black divide-solid divide-y divide-black mx-4 flex flex-col text-black bg-white">
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Date:</span> {timestamp}
					</span>
					<span>
						<span className="font-bold">Case No.:</span> {caseDetail.cases.id}
					</span>
					<span>
						<span className="font-bold">Patient Type:</span>{" "}
						{caseDetail.patient.type.toUpperCase()}
					</span>
					<span>
						<span className="font-bold">PSRN/ID:</span> {caseDetail.identifier}
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

			{/* Chief Complaints */}
			{chiefComplaints && (
				<div className="border border-black border-t-0 mx-4 px-4 py-2 text-black bg-white">
					<h2 className="text-base font-bold underline mb-1">
						Chief Complaints
					</h2>
					<p className="whitespace-pre-wrap">{chiefComplaints}</p>
				</div>
			)}

			<div className="m-4 mt-0 border border-black border-t-0 grid grid-cols-2 divide-x divide-black divide-solid text-black bg-white">
				<div className="flex flex-col divide-y divide-black divide-solid px-4">
					<div>
						<h2 className="text-lg font-bold underline mb-2 mt-2">
							Clinical Examination
						</h2>
						<p className="whitespace-pre-wrap min-h-36">
							{consultationNotes || "No notes provided."}
						</p>
					</div>
					{testItems.length > 0 && (
						<div className="pt-3">
							<h2 className="text-lg font-bold underline mb-2">
								Investigations Advised
							</h2>
							<ul className="flex flex-col list-inside divide-y divide-black divide-solid gap-2">
								{testItems.map((item) => (
									<li key={item.id} className="pb-2 list-disc">
										<span>
											{item.name} ({item.category})
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
				<div className="flex flex-col divide-y divide-black divide-solid px-4">
					<div>
						<h2 className="text-lg font-bold underline mb-2 mt-2">Diagnosis</h2>
						{diagnosisItems.length > 0 ? (
							<ul className="flex flex-col list-inside divide-y divide-black divide-solid gap-2 min-h-36">
								{diagnosisItems.map((item) => (
									<li key={item.id} className="pb-2 list-disc">
										<span>
											{item.name} ({item.icd})
										</span>
									</li>
								))}
							</ul>
						) : (
							<p>No diagnosis recorded.</p>
						)}
					</div>
					{prescriptionItems.length > 0 && (
						<div className="min-h-52 pt-3">
							<h2 className="text-lg font-bold underline mb-2">
								Rx - Prescription
							</h2>
							<div className="pb-4 space-y-2">
								{prescriptionItems.map((item) => (
									<div
										key={item.medicines.id}
										className="border border-black rounded p-2"
									>
										<div className="flex items-start justify-between gap-3 mb-2">
											<div className="flex-1">
												<div className="flex items-center gap-2 flex-wrap mb-1">
													<span className="font-semibold text-base text-black">
														{item.medicines.company} {item.medicines.brand}
													</span>
													<span className="text-xs border border-black rounded-full px-2 py-0.5">
														{item.medicines.type}
													</span>
												</div>
												<div className="text-sm text-black">
													{item.medicines.drug} • {item.medicines.strength}
												</div>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-black">
											{item.case_prescriptions.dosage && (
												<div className="flex items-start gap-2">
													<span className="font-medium min-w-20">Dosage:</span>
													<span className="flex-1">
														{item.case_prescriptions.dosage}
													</span>
												</div>
											)}
											{item.case_prescriptions.frequency && (
												<div className="flex items-start gap-2">
													<span className="font-medium min-w-20">
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
														<span className="font-medium min-w-20">
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
														<span className="font-medium min-w-20">
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
														<span className="font-medium min-w-20">
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
														<span className="font-medium min-w-20">Route:</span>
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
											<div className="mt-2 pt-2 border-t border-black">
												<span className="font-medium text-sm text-black">
													Notes:{" "}
												</span>
												<span className="text-sm text-black">
													{item.case_prescriptions.comment}
												</span>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* History, Assessment and Plan */}
			{clinicalRemarks && (
				<div className="border border-black border-t-0 mx-4 px-4 py-2 text-black bg-white">
					<h2 className="text-base font-bold underline mb-1">
						History, Assessment and Plan
					</h2>
					<p className="whitespace-pre-wrap">{clinicalRemarks}</p>
				</div>
			)}

			{/* Final Decision */}
			<div className="border border-black border-t-0 mx-4 flex flex-col mb-4 text-black bg-white">
				<div className="flex gap-4 justify-between px-4 py-2">
					<span>
						<span className="font-bold">Final Decision:</span> {finalizeValue}
					</span>
				</div>
			</div>

			{/* Footer */}
			<div className="px-4 w-full flex justify-between text-black bg-white pb-4">
				<div className="flex gap-2 items-center">
					<img
						src={Logo}
						alt="BITS Pilani Logo"
						className="size-16"
						style={{ filter: "grayscale(100%)" }}
					/>
					<div className="flex flex-col text-sm text-black">
						<span>Birla Institute of Technology &amp; Science Pilani</span>
						<span>Hyderabad Campus</span>
						<span>Jawahar Nagar, Shameerpet Mandal</span>
						<span>Hyderabad - 500078, Telangana, India</span>
					</div>
				</div>
				<div className="text-sm text-black self-end">
					<p className="text-xs italic">
						This prescription is computer generated and is valid without a
						physical signature.
					</p>
				</div>
			</div>

			{/* Emergency Contact */}
			<div className="border border-black mx-4 px-4 py-3 mb-4 text-black bg-white">
				<h2 className="text-base font-bold underline mb-2">
					Emergency Contacts
				</h2>
				<div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
					<div className="flex justify-between">
						<span className="font-medium">Medical Centre:</span>
						<span>9010202850</span>
					</div>
					<div className="flex justify-between">
						<span className="font-medium">Ambulance:</span>
						<span>9640921921</span>
					</div>
					<div className="flex justify-between">
						<span className="font-medium">Lab:</span>
						<span>9010208400</span>
					</div>
				</div>
				<div className="mt-3 pt-2 border-t border-black text-sm">
					<span className="font-medium">Patient Emergency Contact:</span>{" "}
					<span className="border-b border-black inline-block min-w-64">
						&nbsp;
					</span>
					&nbsp;&nbsp;
					<span className="font-medium">Relation:</span>{" "}
					<span className="border-b border-black inline-block min-w-32">
						&nbsp;
					</span>
				</div>
			</div>
		</div>
	);
};

export default PrescriptionPrintout;
