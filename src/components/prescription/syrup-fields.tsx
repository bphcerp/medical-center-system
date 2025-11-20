import { Input } from "@/components/ui/input";
import Comment from "./comment";
import DurationInput from "./duration-input";
import PrescriptionFrequencySelector from "./frequency-selector";
import MealTimeSelector from "./meal-time";
import type { PrescriptionItemProps } from "./types";

const PrescriptionSyrupFields = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
}: PrescriptionItemProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== "Liquids/Syrups"
	) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 items-center w-full">
			<Input
				value={item.case_prescriptions.dosage}
				onChange={(e) =>
					handleUpdatePrescriptionItem(
						item.medicines.id,
						"dosage",
						e.target.value,
					)
				}
				placeholder="Dosage (mL/teaspoon/mg)"
				className="h-10 flex-1 min-w-[120px]"
			/>
			<PrescriptionFrequencySelector
				item={item}
				handleUpdate={handleUpdatePrescriptionItem}
			/>
			<MealTimeSelector
				item={item}
				handleUpdate={handleUpdatePrescriptionItem}
				category="Liquids/Syrups"
			/>
			<DurationInput
				duration={item.case_prescriptions.duration}
				durationUnit={item.case_prescriptions.durationUnit}
				onDurationChange={(value) =>
					handleUpdatePrescriptionItem(item.medicines.id, "duration", value)
				}
				onDurationUnitChange={(value) =>
					handleUpdatePrescriptionItem(item.medicines.id, "durationUnit", value)
				}
			/>
			<Comment item={item} handleUpdate={handleUpdatePrescriptionItem} />
		</div>
	);
};

export default PrescriptionSyrupFields;
