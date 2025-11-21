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
}: VitalFieldProps) => {
	const fieldId = useId();
	return (
		<Field>
			<FieldLabel htmlFor={fieldId}>
				{label} {value === undefined ? "(optional)" : null}
			</FieldLabel>
			<InputGroup>
				<InputGroupInput
					id={fieldId}
					type={value === null ? "text" : type}
					placeholder={placeholder}
					name={name}
					value={value === null ? "—" : value}
					disabled={value !== undefined}
				/>
				{unit && <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>}
			</InputGroup>
		</Field>
	);
};

export default VitalField;
