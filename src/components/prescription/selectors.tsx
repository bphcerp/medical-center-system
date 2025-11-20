import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { mealTimings } from "@/db/case";
import { Input } from "../ui/input";
import type { PrescriptionItemProps } from "./types";

const PrescriptionFrequencySelector = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
}: PrescriptionItemProps) => {
	return (
		<Select
			value={item.case_prescriptions.frequency}
			onValueChange={(value) =>
				handleUpdatePrescriptionItem(item.medicines.id, "frequency", value)
			}
		>
			<SelectTrigger className="h-8 flex-1 min-w-[100px]">
				<SelectValue placeholder="Frequency" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="Five times a day">Five times a day</SelectItem>
				<SelectItem value="Four times a day">Four times a day</SelectItem>
				<SelectItem value="Thrice a day">Thrice a day</SelectItem>
				<SelectItem value="Twice a day">Twice a day</SelectItem>
				<SelectItem value="Once a day">Once a day</SelectItem>
				<SelectItem value="Alternate days">Alternate days</SelectItem>
				<SelectItem value="Thrice a week">Thrice a week</SelectItem>
				<SelectItem value="Twice a week">Twice a week</SelectItem>
				<SelectItem value="Once a week">Once a week</SelectItem>
				<SelectItem value="One time">One time</SelectItem>
				<SelectItem value="As needed">As needed</SelectItem>
			</SelectContent>
		</Select>
	);
};

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

const DurationInput = ({
	duration,
	durationUnit,
	onDurationChange,
	onDurationUnitChange,
}: {
	duration: string;
	durationUnit?: string;
	onDurationChange: (value: string) => void;
	onDurationUnitChange: (value: string) => void;
}) => {
	return (
		<>
			<Input
				type="number"
				value={duration}
				onChange={(e) => onDurationChange(e.target.value)}
				placeholder="0"
				className="h-10 w-15"
			/>
			<Select
				value={durationUnit || "days"}
				onValueChange={onDurationUnitChange}
			>
				<SelectTrigger className="h-8 w-28">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="days">days</SelectItem>
					<SelectItem value="weeks">weeks</SelectItem>
					<SelectItem value="months">months</SelectItem>
				</SelectContent>
			</Select>
		</>
	);
};

interface DosageSelectorProps extends PrescriptionItemProps {
	values: string[];
}

const DosageSelector = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
	values,
}: DosageSelectorProps) => {
	return (
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
				{values.map((val) => (
					<SelectItem key={val} value={val}>
						{val}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

export {
	MealTimeSelector,
	PrescriptionFrequencySelector,
	DurationInput,
	DosageSelector,
};
