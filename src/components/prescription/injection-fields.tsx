import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { injectionRoutes } from "@/db/case";
import Comment from "./comment";
import DurationInput from "./duration-input";
import PrescriptionFrequencySelector from "./frequency-selector";
import type { PrescriptionItemProps } from "./types";

const PrescriptionInjectionFields = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
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
				handleUpdate={handleUpdatePrescriptionItem}
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
				onValueChange={(value: (typeof injectionRoutes)[number]) =>
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
					{injectionRoutes.map((route) => (
						<SelectItem key={route} value={route}>
							{route}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Comment item={item} handleUpdate={handleUpdatePrescriptionItem} />
		</div>
	);
};

export default PrescriptionInjectionFields;
