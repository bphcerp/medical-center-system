import { Input } from "../ui/input";
import type { PrescriptionItemProps } from "./types";

const Comment = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
}: PrescriptionItemProps) => {
	return (
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
	);
};

export default Comment;
