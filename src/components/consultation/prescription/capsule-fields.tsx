import Comment from "./comment";
import {
	DosageSelector,
	DurationInput,
	MealTimeSelector,
	PrescriptionFrequencySelector,
} from "./selectors";
import type { PrescriptionItemProps } from "./types";

const PrescriptionCapsuleFields = ({
	item,
	handleUpdate,
}: PrescriptionItemProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== "Capsule/Tablet"
	) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 items-center w-full">
			<DosageSelector
				item={item}
				handleUpdate={handleUpdate}
				values={["1/4 tablet", "1/2 tablet", "1 tablet", "2 tablets"]}
			/>
			<PrescriptionFrequencySelector item={item} handleUpdate={handleUpdate} />
			<MealTimeSelector
				item={item}
				handleUpdate={handleUpdate}
				category="Capsule/Tablet"
			/>
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
			<Comment item={item} handleUpdate={handleUpdate} />
		</div>
	);
};

export default PrescriptionCapsuleFields;
