import { Input } from "@/components/ui/input";
import Comment from "./comment";
import {
	DosageSelector,
	DurationInput,
	PrescriptionFrequencySelector,
} from "./selectors";
import type { PrescriptionItemProps } from "./types";

const PrescriptionExternalFields = ({
	item,
	handleUpdate,
}: PrescriptionItemProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== "External Application"
	) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 items-center w-full">
			<DosageSelector
				item={item}
				handleUpdate={handleUpdate}
				values={[
					"Thin layer",
					"Thick layer",
					"Pea-sized",
					"Coin-sized",
					"As needed",
				]}
			/>
			<PrescriptionFrequencySelector item={item} handleUpdate={handleUpdate} />
			<DurationInput
				duration={item.case_prescriptions.duration}
				durationUnit={item.case_prescriptions.durationUnit}
				onDurationChange={(value) =>
					handleUpdate(item.medicines.id, "duration", value)
				}
				onDurationUnitChange={(value) =>
					handleUpdate(item.medicines.id, "durationUnit", value)
				}
			/>
			<Input
				value={item.case_prescriptions.categoryData.applicationArea}
				onChange={(e) =>
					handleUpdate(item.medicines.id, "categoryData", {
						category: "External Application",
						applicationArea: e.target.value,
					})
				}
				placeholder="Application area"
				className="h-10 flex-1 min-w-[120px]"
			/>
			<Comment item={item} handleUpdate={handleUpdate} />
		</div>
	);
};

export default PrescriptionExternalFields;
