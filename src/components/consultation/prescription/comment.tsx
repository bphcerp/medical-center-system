import type React from "react";
import { Input } from "@/components/ui/input";
import type { PrescriptionItemProps } from "./types";

const Comment = ({
	item,
	handleUpdate: handleUpdatePrescriptionItem,
	...props
}: PrescriptionItemProps & React.ComponentProps<typeof Input>) => {
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
			{...props}
		/>
	);
};

export default Comment;
