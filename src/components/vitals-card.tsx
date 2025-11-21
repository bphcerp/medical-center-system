import type { InferResponseType } from "hono/client";
import { client } from "@/routes/api/$";
import { Card } from "./ui/card";
import VitalField from "./vital-field";

const caseDetailsResponse =
	client.api.patientHistory.otp[":caseId"].verify.$post;
export type CaseDetail = InferResponseType<typeof caseDetailsResponse, 200>;

const VitalsCard = ({
	vitals,
}: {
	vitals?: CaseDetail["data"]["caseDetail"]["cases"];
}) => {
	return (
		<Card className="mb-2 flex flex-row gap-4 px-6">
			<div className="flex flex-col gap-4 p-4 rounded-lg bg-pink-700/5 max-w-140">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-2">
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
						unit="per minute"
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
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-pink-700/40">
					<VitalField
						label="Blood Pressure (Systolic)"
						unit="mm Hg"
						name="bloodPressureSystolic"
						placeholder="Blood Pressure (Systolic)"
						value={vitals?.bloodPressureSystolic}
					/>
					<VitalField
						label="Blood Pressure (Diastolic)"
						unit="mm Hg"
						name="bloodPressureDiastolic"
						placeholder="Blood Pressure (Diastolic)"
						value={vitals?.bloodPressureDiastolic}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-4 p-4 rounded-lg bg-purple-700/5 max-w-70">
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
		</Card>
	);
};

export default VitalsCard;
