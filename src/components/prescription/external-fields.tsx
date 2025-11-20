import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import DurationInput from "./duration-input";
import PrescriptionFrequencySelector, {
	type PrescriptionItemProps,
} from "./frequency-selector";

const PrescriptionExternalFields = ({
	item,
	handleUpdatePrescriptionItem,
}: PrescriptionItemProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== "External Application"
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
				<SelectTrigger className="h-8 flex-1 min-w-[100px]">
					<SelectValue placeholder="Amount" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="Thin layer">Thin layer</SelectItem>
					<SelectItem value="Thick layer">Thick layer</SelectItem>
					<SelectItem value="Pea-sized">Pea-sized</SelectItem>
					<SelectItem value="Coin-sized">Coin-sized</SelectItem>
					<SelectItem value="As needed">As needed</SelectItem>
				</SelectContent>
			</Select>
			<PrescriptionFrequencySelector
				item={item}
				handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
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
			<Input
				value={item.case_prescriptions.categoryData.applicationArea}
				onChange={(e) =>
					handleUpdatePrescriptionItem(item.medicines.id, "categoryData", {
						category: "External Application",
						applicationArea: e.target.value,
					})
				}
				placeholder="Application area"
				className="h-10 flex-1 min-w-[120px]"
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

export default PrescriptionExternalFields;
