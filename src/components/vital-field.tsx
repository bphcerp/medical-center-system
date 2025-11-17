import { Field, FieldLabel } from "./ui/field";

const VitalField = ({
	label,
	value,
}: {
	label: string;
	value: string | number | null;
}) => {
	return (
		<Field>
			<FieldLabel className="font-semibold">{label}</FieldLabel>
			<div className="border rounded-md bg-muted text-sm px-2 py-1">
				{value || "—"}
			</div>
		</Field>
	);
};

export default VitalField;
