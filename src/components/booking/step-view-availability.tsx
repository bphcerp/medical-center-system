import { format } from "date-fns";
import { AlertCircle, ArrowRight, CalendarOff } from "lucide-react";
import { useState } from "react";
import type { Doctor } from "src/api/admin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { formatTime12, handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import { Field, FieldContent, FieldLabel, FieldTitle } from "../ui/field";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import type { Slot } from "./types";

type SlotsResult =
	| {
			date: Date;
			slots: Slot[];
			available: true;
	  }
	| { available: false }
	| null;

export default function StepSelectTimeslot({
	doctor,
	onSelect,
}: {
	doctor: Doctor;
	onSelect: (date: Date, slot: Slot) => void;
}) {
	const [slotsResult, setSlotsResult] = useState<SlotsResult | null>(null);

	const handleDateChange = async (date?: Date) => {
		if (!date) return;

		const res = await client.api.booking["available-slots"].$get({
			query: {
				doctorId: doctor.id.toString(),
				date: format(date, "yyyy-MM-dd"),
			},
		});
		const data = await handleErrors(res);

		setSlotsResult(
			data?.unavailable
				? { available: false }
				: {
						date: date,
						slots: data?.slots ?? [],
						available: true,
					},
		);
	};

	return (
		<div className="flex flex-col items-center gap-4 p-2">
			<p className="text-center text-muted-foreground">
				Select a timeslot for{" "}
				<span className="font-semibold text-foreground">{doctor.name}</span>
			</p>

			<div className="flex flex-wrap gap-6 items-stretch justify-start w-full">
				<Calendar
					mode="single"
					selected={
						slotsResult && "date" in slotsResult ? slotsResult.date : undefined
					}
					onSelect={handleDateChange}
					disabled={{ before: new Date() }}
					className="rounded-md border shrink-0"
				/>
				{slotsResult ? (
					slotsResult.available ? (
						slotsResult?.slots.length === 0 ? (
							<Alert className="flex-1">
								<AlertCircle className="size-4" />
								<AlertTitle>No slots available</AlertTitle>
								<AlertDescription>
									All slots are booked for this date. Please select another
									date.
								</AlertDescription>
							</Alert>
						) : (
							<SlotGrid
								slots={slotsResult.slots}
								onSelect={(slot) => onSelect(slotsResult.date, slot)}
							/>
						)
					) : (
						<Alert className="flex-1">
							<CalendarOff className="size-4" />
							<AlertTitle>Unavailable</AlertTitle>
							<AlertDescription>
								Doctor is unavailable on this date. Please select another date.
							</AlertDescription>
						</Alert>
					)
				) : (
					<p className="text-muted-foreground text-sm py-4">
						Select a date to see available slots.
					</p>
				)}
			</div>
		</div>
	);
}

function SlotGrid({
	slots,
	onSelect,
}: {
	slots: Slot[];
	onSelect: (slot: Slot) => void;
}) {
	const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
	return (
		<div className="flex-1 min-w-md flex flex-col items-end justify-between gap-3">
			<RadioGroup
				name="slot"
				className="grid grid-cols-3 gap-2 w-full"
				value={JSON.stringify(selectedSlot)}
				onValueChange={(v) => setSelectedSlot(JSON.parse(v))}
			>
				{slots.map((slot) => (
					<FieldLabel key={slot.slotStart} className="cursor-pointer border-4">
						<Field orientation="horizontal" className="py-3! px-4!">
							<FieldContent>
								<FieldTitle>{formatTime12(slot.slotStart)}</FieldTitle>
							</FieldContent>
							<RadioGroupItem value={JSON.stringify(slot)} />
						</Field>
					</FieldLabel>
				))}
			</RadioGroup>

			<Button
				className="w-fit"
				disabled={selectedSlot === null}
				onClick={() => selectedSlot && onSelect(selectedSlot)}
			>
				Continue <ArrowRight />
			</Button>
		</div>
	);
}
