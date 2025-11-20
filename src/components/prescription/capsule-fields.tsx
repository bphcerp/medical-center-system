import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import Comment from "./comment";
import DurationInput from "./duration-input";
import PrescriptionFrequencySelector from "./frequency-selector";
import MealTimeSelector from "./meal-time";
import type { PrescriptionItemProps } from "./types";

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
			<MealTimeSelector
				item={item}
				handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
				category="Capsule/Tablet"
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
			<Comment
				item={item}
				handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
			/>
		</div>
	);
};

export default PrescriptionCapsuleFields;
