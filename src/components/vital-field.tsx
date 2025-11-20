import { type HTMLInputTypeAttribute, useId } from "react";
import { Field, FieldLabel } from "./ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";

interface VitalFieldProps {
	label: string;
	placeholder?: string;
	type?: HTMLInputTypeAttribute;
	name?: string;
	value?: string | number | null;
	unit?: string | null;
	readonly?: boolean;
}

const VitalField = ({
	label,
	placeholder,
	type = "number",
	name,
	value,
	unit = null,
	readonly = false,
}: VitalFieldProps) => {
	const fieldId = useId();
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
			<InputGroup>
				<InputGroupInput
					id={fieldId}
					type={type}
					placeholder={placeholder}
					name={name}
					value={value ?? "—"}
					readOnly={readonly}
				/>
				<InputGroupAddon align="inline-end">{unit}</InputGroupAddon>
			</InputGroup>
		</Field>
	);
};

export default VitalField;
