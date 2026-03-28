import { format } from "date-fns";
import { AlertCircle, ArrowRight, CalendarOff } from "lucide-react";
import { useState } from "react";
import type { Doctor } from "@/api/doctor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatTime12, handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "../ui/empty";
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
	const [loading, setLoading] = useState(false);

	const handleDateChange = async (date?: Date) => {
		if (!date) return;
		setLoading(true);

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

		setLoading(false);
	};

	return (
		<div className="flex flex-col items-center gap-4 p-2">
			<p className="text-center text-muted-foreground">
				Select a timeslot for{" "}
				<span className="font-semibold text-foreground">{doctor.name}</span>
			</p>

			<div className="flex flex-col md:flex-row gap-6 items-stretch justify-start w-full">
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
							<AllSlotsBooked />
						) : (
							<SlotGrid
								slots={slotsResult.slots}
								onSelectSlot={(slot) => onSelect(slotsResult.date, slot)}
								className={cn(
									"transition-opacity",
									loading && "opacity-50 pointer-events-none",
								)}
							/>
						)
					) : (
						<DoctorUnavailable />
					)
				) : (
					<p className="text-muted-foreground text-sm py-4 m-auto">
						Select a date to see available slots.
					</p>
				)}
			</div>
		</div>
	);
}

function SlotGrid({
	slots,
	onSelectSlot,
	className,
}: {
	slots: Slot[];
	onSelectSlot: (slot: Slot) => void;
} & React.HTMLAttributes<"div">) {
	const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
	return (
		<div
			className={cn(
				"flex-1 min-w-md flex flex-col items-end justify-between gap-3",
				className,
			)}
		>
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
				onClick={() => selectedSlot && onSelectSlot(selectedSlot)}
			>
				Continue <ArrowRight />
			</Button>
		</div>
	);
}

function AllSlotsBooked() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<AlertCircle />
				</EmptyMedia>
				<EmptyTitle>No slots available</EmptyTitle>
				<EmptyDescription>
					All slots are booked for this date. Please select another date.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function DoctorUnavailable() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<CalendarOff />
				</EmptyMedia>
				<EmptyTitle>Doctor unavailable</EmptyTitle>
				<EmptyDescription>
					The doctor is unavailable on this date. Please select another date.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
