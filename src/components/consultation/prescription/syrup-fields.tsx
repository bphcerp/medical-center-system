import { Input } from "@/components/ui/input";
import {
	DosageSelector,
	DurationInput,
	MealTimeSelector,
	PrescriptionFrequencySelector,
} from "./selectors";
import type { PrescriptionItemProps } from "./types";

export default function PrescriptionSyrupFields({
	item,
	handleUpdate,
}: PrescriptionItemProps) {
	if (item.medicines.category !== "Liquids/Syrups") {
		return null;
	}

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

			<Input
				placeholder="Notes (e.g., dilute in water)..."
				value={item.case_prescriptions.comment || ""}
				onChange={(e) =>
					handleUpdate(item.medicines.id, "comment", e.target.value)
				}
				className="h-8 flex-1 min-w-[150px]"
			/>
		</div>
	);
}
