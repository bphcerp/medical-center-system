import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

export default PrescriptionFrequencySelector;
