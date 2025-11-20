import type { InferResponseType } from "hono/client";
import { client } from "@/routes/api/$";
import { Card } from "./ui/card";
import VitalField from "./vital-field";

const caseDetailsResponse =
	client.api.patientHistory.otp[":caseId"].verify.$post;
export type CaseDetail = InferResponseType<typeof caseDetailsResponse, 200>;

const VitalsCard = ({
	caseDetail,
}: {
	caseDetail: CaseDetail["caseDetail"];
}) => {
	return (
		<Card className="mb-2">
			<div className="flex gap-4 mx-3">
				<VitalField
					label="Temperature"
					value={caseDetail?.cases.temperature}
					unit="° F"
					readonly
				/>
				<VitalField
					label="Heart Rate"
					value={caseDetail?.cases.heartRate}
					unit="bpm"
					readonly
				/>
				<VitalField
					label="Respiratory Rate"
					value={caseDetail?.cases.respiratoryRate}
					unit="per min"
					readonly
				/>
			</div>
			<div className="flex gap-4 mx-3">
				<VitalField
					label="Blood Pressure Systolic"
					value={caseDetail?.cases.bloodPressureSystolic}
					unit="mm Hg"
					readonly
				/>
				<VitalField
					label="Blood Pressure Diastolic"
					value={caseDetail?.cases.bloodPressureDiastolic}
					unit="mm Hg"
					readonly
				/>
			</div>
			<div className="flex gap-4 mx-3">
				<VitalField
					label="Blood Sugar"
					value={caseDetail?.cases.bloodSugar}
					unit="mg/dL"
					readonly
				/>
				<VitalField
					label="SpO2"
					value={caseDetail?.cases.spo2}
					unit="%"
					readonly
				/>
				<VitalField
					label="Weight"
					value={caseDetail?.cases.weight}
					unit="kg"
					readonly
				/>
			</div>
		</Card>
	);
};

export default VitalsCard;
