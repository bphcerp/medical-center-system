import { Input } from "@/components/ui/input";
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
import type { PrescriptionItemProps } from "./types";

const PrescriptionSyrupFields = ({
	item,
	handleUpdatePrescriptionItem,
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
				handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
			/>
			<Select
				value={item.case_prescriptions.categoryData.liquidTiming}
				onValueChange={(value: "Before Meal" | "After Meal") =>
					handleUpdatePrescriptionItem(item.medicines.id, "categoryData", {
						category: "Liquids/Syrups",
						liquidTiming: value,
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
			<Comment
				item={item}
				handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
			/>
		</div>
	);
};

export default PrescriptionSyrupFields;
