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
>["data"][number];

export type CasePrescription = PrescriptionItem["case_prescriptions"];

export type PrescriptionUpdateField = keyof Omit<
	CasePrescription,
	"id" | "medicine"
>;

export type PrescriptionUpdateValue<F extends PrescriptionUpdateField> =
	CasePrescription[F];

export type PrescriptionHandleUpdate = <F extends PrescriptionUpdateField>(
	id: number,
	field: F,
	value: PrescriptionUpdateValue<F>,
) => void;

type PrescriptionCategoryData = NonNullable<CasePrescription["categoryData"]>;

export type PrescriptionCategory = PrescriptionCategoryData["category"];

export type PrescriptionItemByCategory<C extends PrescriptionCategory> =
	PrescriptionItem & {
		case_prescriptions: PrescriptionItem["case_prescriptions"] & {
			categoryData: Extract<PrescriptionCategoryData, { category: C }>;
		};
	};

export const isPrescriptionCategory = <C extends PrescriptionCategory>(
	item: PrescriptionItem,
	category: C,
): item is PrescriptionItemByCategory<C> => {
	return item.case_prescriptions.categoryData?.category === category;
};

export interface PrescriptionItemProps<
	TItem extends PrescriptionItem = PrescriptionItem,
> {
	item: TItem;
	handleUpdate: PrescriptionHandleUpdate;
}

export type CategoryPrescriptionItemProps<C extends PrescriptionCategory> =
	PrescriptionItemProps<PrescriptionItemByCategory<C>>;

export type CapsulePrescriptionItemProps =
	CategoryPrescriptionItemProps<"Capsule/Tablet">;

export type ExternalPrescriptionItemProps =
	CategoryPrescriptionItemProps<"External Application">;

export type InjectionPrescriptionItemProps =
	CategoryPrescriptionItemProps<"Injection">;

export type SyrupPrescriptionItemProps =
	CategoryPrescriptionItemProps<"Liquids/Syrups">;
