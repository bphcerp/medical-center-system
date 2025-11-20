import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import DurationInput from "../duration-input";
import PrescriptionFrequencySelector, {
	type PrescriptionItemProps,
} from "./frequency-selector";

const PrescriptionCapsuleFields = ({
	item,
	handleUpdatePrescriptionItem,
}: PrescriptionItemProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== "Capsule/Tablet"
	) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 items-center w-full">
			<Select
				value={item.case_prescriptions.dosage}
				onValueChange={(value) =>
					handleUpdatePrescriptionItem(item.medicines.id, "dosage", value)
				}
			>
				<SelectTrigger className="h-8 flex-1 min-w-20">
					<SelectValue placeholder="Dosage" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="1/4 tablet">1/4 tablet</SelectItem>
					<SelectItem value="1/2 tablet">1/2 tablet</SelectItem>
					<SelectItem value="1 tablet">1 tablet</SelectItem>
					<SelectItem value="2 tablets">2 tablets</SelectItem>
				</SelectContent>
			</Select>
			<PrescriptionFrequencySelector
				item={item}
				handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
			/>
			<Select
				value={item.case_prescriptions.categoryData.mealTiming}
				onValueChange={(value: "Before Meal" | "After Meal") =>
					handleUpdatePrescriptionItem(item.medicines.id, "categoryData", {
						category: "Capsule/Tablet",
						mealTiming: value,
					})
				}
			>
				<SelectTrigger className="h-8 flex-1 min-w-[100px]">
					<SelectValue placeholder="Meal Timing" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="Before Meal">Before meal</SelectItem>
					<SelectItem value="After Meal">After meal</SelectItem>
				</SelectContent>
			</Select>
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
			<Input
				value={item.case_prescriptions.comment || ""}
				onChange={(e) =>
					handleUpdatePrescriptionItem(
						item.medicines.id,
						"comment",
						e.target.value,
					)
				}
				placeholder="Notes"
				className="h-10 flex-1 min-w-[120px]"
			/>
		</div>
	);
};

export default PrescriptionCapsuleFields;
