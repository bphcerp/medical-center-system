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

interface PrescriptionFrequencySelectorProps extends PrescriptionItemProps {
	disabled?: boolean;
}

const PrescriptionFrequencySelector = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
	disabled,
}: PrescriptionFrequencySelectorProps) => {
	return (
		<Select
			value={item.case_prescriptions.frequency}
			onValueChange={(value) =>
				handleUpdatePrescriptionItem(item.medicines.id, "frequency", value)
			}
			disabled={disabled}
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
	disabled?: boolean;
}

const MealTimeSelector = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
	category,
	disabled,
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
			disabled={disabled}
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
	disabled,
}: {
	duration: string;
	durationUnit?: string;
	onDurationChange: (value: string) => void;
	onDurationUnitChange: (value: string) => void;
	disabled?: boolean;
}) => {
	return (
		<>
			<Input
				type="number"
				value={duration}
				onChange={(e) => onDurationChange(e.target.value)}
				placeholder="0"
				className="h-10 w-15"
				disabled={disabled}
			/>
			<Select
				value={durationUnit || "days"}
				onValueChange={onDurationUnitChange}
				disabled={disabled}
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
	disabled?: boolean;
}

const DosageSelector = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
	values,
	disabled,
}: DosageSelectorProps) => {
	return (
		<Select
			value={item.case_prescriptions.dosage}
			onValueChange={(value) =>
				handleUpdatePrescriptionItem(item.medicines.id, "dosage", value)
			}
			disabled={disabled}
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
