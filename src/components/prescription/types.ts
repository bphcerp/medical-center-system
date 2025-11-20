import type { InferResponseType } from "hono/client";
import { client } from "@/routes/api/$";

const caseDetailsResponse = client.api.doctor.consultation[":caseId"].$get;
export type PrescriptionItem = InferResponseType<
	typeof caseDetailsResponse,
	200
>["prescriptions"][number];

const medicinesResponse = client.api.doctor.medicines.$get;
export type MedicineItem = InferResponseType<
	typeof medicinesResponse,
	200
>["medicines"][number];

export interface PrescriptionItemProps {
	item: PrescriptionItem;
	handleUpdatePrescriptionItem: (
		id: number,
		field: keyof Omit<
			PrescriptionItem["case_prescriptions"],
			"id" | "medicine"
		>,
		value: string | PrescriptionItem["case_prescriptions"]["categoryData"],
	) => void;
}
