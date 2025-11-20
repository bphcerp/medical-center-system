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

const PrescriptionInjectionFields = ({
	item,
	handleUpdatePrescriptionItem,
}: PrescriptionItemProps) => {
	if (
		!item.case_prescriptions.categoryData ||
		item.case_prescriptions.categoryData.category !== "Injection"
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
				placeholder="Dosage (mg/mL/units)"
				className="h-10 flex-1 min-w-[120px]"
			/>
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
			<Select
				value={item.case_prescriptions.categoryData.injectionRoute}
				onValueChange={(
					value:
						| "Subcutaneous (SC)"
						| "Intramuscular (IM)"
						| "Intravenous (IV)",
				) =>
					handleUpdatePrescriptionItem(item.medicines.id, "categoryData", {
						category: "Injection",
						injectionRoute: value,
					})
				}
			>
				<SelectTrigger className="h-8 flex-1 min-w-[120px]">
					<SelectValue placeholder="Route" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="Subcutaneous (SC)">Subcutaneous (SC)</SelectItem>
					<SelectItem value="Intramuscular (IM)">Intramuscular (IM)</SelectItem>
					<SelectItem value="Intravenous (IV)">Intravenous (IV)</SelectItem>
				</SelectContent>
			</Select>
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

export default PrescriptionInjectionFields;
