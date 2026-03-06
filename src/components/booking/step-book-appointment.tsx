import { format } from "date-fns";
import { Check } from "lucide-react";
import React, { type PropsWithChildren, useState } from "react";
import { toast } from "sonner";
import type { Doctor } from "src/api/admin";
import { RegistrationForm } from "@/components/registration-card";
import { Button } from "@/components/ui/button";
import { cn, formatTime12, handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import { Separator } from "../ui/separator";
import type { Slot } from "./types";

type Patient = { id: number; name: string };

export default function StepConfirmBooking({
	doctor,
	date,
	slot,
	onBooked,
}: {
	doctor: Doctor;
	date: Date;
	slot: Slot;
	onBooked: (tokenNumber: number) => void;
}) {
	const [patient, setPatient] = useState<Patient | null>(null);

	return (
		<div className="p-2">
			{patient ? (
				<BookingSummary
					doctor={doctor}
					date={date}
					slot={slot}
					patient={patient}
					onChangePatient={() => setPatient(null)}
					onBooked={onBooked}
				/>
			) : (
				<div className="max-w-md mx-auto">
					<RegistrationForm
						registrationContext="appointment"
						onPatientId={(id, name) => setPatient({ id, name })}
					/>
				</div>
			)}
		</div>
	);
}

function BookingSummary({
	doctor,
	date,
	slot,
	patient,
	onChangePatient,
	onBooked,
}: {
	doctor: Doctor;
	date: Date;
	slot: Slot;
	patient: Patient;
	onChangePatient: () => void;
	onBooked: (tokenNumber: number) => void;
}) {
	const handleConfirm = async () => {
		const res = await client.api.booking.appointments.$post({
			json: {
				patientId: patient.id,
				doctorId: doctor.id,
				appointmentDate: format(date, "yyyy-MM-dd"),
				slotStart: slot.slotStart,
				slotEnd: slot.slotEnd,
			},
		});

		const data = await handleErrors(res);
		if (data) {
			toast.success("Appointment booked successfully!");
			const d = data as { appointmentId: number; tokenNumber: number };
			onBooked(d.tokenNumber);
		}
	};

	return (
		<div className="flex flex-col gap-2 max-w-lg mx-auto w-full">
			<div className="flex items-end justify-between">
				<SummaryItem label="Patient">{patient.name}</SummaryItem>
				<Button
					size="sm"
					variant="link"
					className="p-0"
					onClick={onChangePatient}
				>
					Change
				</Button>
			</div>
			<Separator />
			<SummaryItem label="Doctor" className="flex justify-between">
				{doctor.name}{" "}
				<span className="ml-1 text-muted-foreground capitalize">
					{doctor.specialityName} ({doctor.availabilityType})
				</span>
			</SummaryItem>

			<Separator />
			<SummaryItem label="Date">{format(date, "MMMM do, yyyy")}</SummaryItem>

			<Separator />
			<SummaryItem label="Time Slot">
				{formatTime12(slot.slotStart)} – {formatTime12(slot.slotEnd)}
			</SummaryItem>

			<Button
				size="lg"
				className="text-lg mt-4"
				onClick={handleConfirm}
				autoFocus
			>
				Confirm Booking <Check className="size-5" />
			</Button>
		</div>
	);
}

function SummaryItem({
	label,
	children,
	className,
}: PropsWithChildren<{
	label: string;
}> &
	React.HTMLAttributes<HTMLElement>) {
	return (
		<div>
			<span className="text-xs text-muted-foreground">{label}</span>
			<p className={cn("font-medium", className)}>{children}</p>
		</div>
	);
}
