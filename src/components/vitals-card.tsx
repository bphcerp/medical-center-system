import type { InferResponseType } from "hono/client";
import { client } from "@/routes/api/$";
import VitalField from "./vital-field";

const caseDetailsResponse =
	client.api.patientHistory.otp[":caseId"].verify.$post;
export type CaseDetail = InferResponseType<typeof caseDetailsResponse, 200>;

const VitalsCard = ({
	vitals,
	condensed = false,
}: {
	vitals?: CaseDetail["data"]["caseDetail"]["cases"];
	condensed?: boolean;
}) => {
	return (
		<div className="flex flex-col lg:flex-row gap-4">
			<div className="flex flex-col gap-4 w-full">
				<div
					className={`grid items-baseline-last p-4 rounded-lg gap-4 flex-2 ${condensed ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-7" : "bg-pink-700/5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"}`}
				>
					<VitalField
						label="Body Temperature"
						unit="° F"
						name="bodyTemperature"
						placeholder="Body Temperature"
						value={vitals?.temperature}
					/>
					<VitalField
						label="Heart Rate"
						unit="bpm"
						name="heartRate"
						placeholder="Heart Rate"
						value={vitals?.heartRate}
					/>
					<VitalField
						label="Respiratory Rate"
						unit="per min"
						name="respiratoryRate"
						placeholder="Respiratory Rate"
						value={vitals?.respiratoryRate}
					/>
					<VitalField
						label="SpO2"
						unit="%"
						name="spo2"
						placeholder="SpO2"
						value={vitals?.spo2}
					/>
					{condensed ? (
						<VitalField
							label="Blood Pressure"
							unit="mmHg"
							name="bloodPressure"
							placeholder="Blood Pressure"
							type="text"
							value={`${vitals?.bloodPressureSystolic ?? "—"}/${vitals?.bloodPressureDiastolic ?? "—"}`}
						/>
					) : (
						<>
							<VitalField
								label="Blood Pressure (Systolic)"
								unit="mmHg"
								name="bloodPressureSystolic"
								placeholder="Blood Pressure (Systolic)"
								value={vitals?.bloodPressureSystolic}
							/>
							<VitalField
								label="Blood Pressure (Diastolic)"
								unit="mmHg"
								name="bloodPressureDiastolic"
								placeholder="Blood Pressure (Diastolic)"
								value={vitals?.bloodPressureDiastolic}
							/>
						</>
					)}
					{condensed && (
						<>
							<VitalField
								label="Weight"
								unit="kg"
								name="weight"
								placeholder="Weight"
								value={vitals?.weight}
							/>
							<VitalField
								label="Blood Sugar"
								unit="mg/dL"
								name="bloodSugar"
								placeholder="Blood Sugar"
								value={vitals?.bloodSugar}
							/>
						</>
					)}
				</div>
			</div>
			{condensed ? null : (
				<div className="grid grid-cols-1 gap-4 p-4 rounded-lg bg-purple-700/5 lg:max-w-64 w-full">
					<VitalField
						label="Weight"
						unit="kg"
						name="weight"
						placeholder="Weight"
						value={vitals?.weight}
					/>
					<VitalField
						label="Blood Sugar"
						unit="mg/dL"
						name="bloodSugar"
						placeholder="Blood Sugar"
						value={vitals?.bloodSugar}
					/>
				</div>
			)}
		</div>
	);
};

export default VitalsCard;
