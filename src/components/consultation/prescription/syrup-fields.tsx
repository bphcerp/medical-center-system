import Comment from "./comment";
import {
	DosageSelector,
	DurationInput,
	MealTimeSelector,
	PrescriptionFrequencySelector,
} from "./selectors";
import type { SyrupPrescriptionItemProps } from "./types";

export default function PrescriptionSyrupFields({
	item,
	handleUpdate,
}: SyrupPrescriptionItemProps) {
	return (
		<div className="flex flex-wrap gap-2 w-full">
			<DosageSelector
				item={item}
				handleUpdate={handleUpdate}
				values={["2.5ml", "5ml", "10ml", "15ml", "20ml"]}
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

			<MealTimeSelector
				item={item}
				handleUpdate={handleUpdate}
				category="Liquids/Syrups"
			/>

			<Comment
				placeholder="Notes (e.g., dilute in water)..."
				item={item}
				handleUpdate={handleUpdate}
				className="h-8 flex-1 min-w-[150px]"
			/>
		</div>
	);
}
