import type { InferResponseType } from "hono/client";
import { client } from "@/routes/api/$";

const caseDetailsResponse = client.api.doctor.consultation[":caseId"].$get;
export type PrescriptionItem = InferResponseType<
	typeof caseDetailsResponse,
	200
>["data"]["prescriptions"][number];

const medicinesResponse = client.api.doctor.medicines.$get;
export type MedicineItem = InferResponseType<
	typeof medicinesResponse,
	200
>["data"]["medicines"][number];

export interface PrescriptionItemProps {
	item: PrescriptionItem;
	handleUpdate: (
		id: number,
		field: keyof Omit<
			PrescriptionItem["case_prescriptions"],
			"id" | "medicine"
		>,
		value: string | PrescriptionItem["case_prescriptions"]["categoryData"],
	) => void;
}
