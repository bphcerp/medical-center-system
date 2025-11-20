import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { mealTimings } from "@/db/case";
import type { PrescriptionItemProps } from "./types";

interface MealTimeSelectorProps extends PrescriptionItemProps {
	category: "Capsule/Tablet" | "Liquids/Syrups";
}

const MealTimeSelector = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
	category,
}: MealTimeSelectorProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== category
	) {
		return null;
	}

	return (
		<Select
			value={item.case_prescriptions.categoryData.mealTiming}
			onValueChange={(value: (typeof mealTimings)[number]) =>
				handleUpdatePrescriptionItem(item.medicines.id, "categoryData", {
					category: category,
					mealTiming: value,
				})
			}
		>
			<SelectTrigger className="h-8 flex-1 min-w-[100px]">
				<SelectValue placeholder="Meal Timing" />
			</SelectTrigger>
			<SelectContent>
				{mealTimings.map((timing) => (
					<SelectItem key={timing} value={timing}>
						{timing}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

export default MealTimeSelector;
