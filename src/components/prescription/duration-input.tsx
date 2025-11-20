import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

function DurationInput({
	duration,
	durationUnit,
	onDurationChange,
	onDurationUnitChange,
}: {
	duration: string;
	durationUnit?: string;
	onDurationChange: (value: string) => void;
	onDurationUnitChange: (value: string) => void;
}) {
	return (
		<>
			<Input
				type="number"
				value={duration}
				onChange={(e) => onDurationChange(e.target.value)}
				placeholder="0"
				className="h-10 w-15"
			/>
			<Select
				value={durationUnit || "days"}
				onValueChange={onDurationUnitChange}
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
}

export default DurationInput;
