import { format } from "date-fns";
import { AlertCircle, CalendarOff, Check, Clock, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { handleErrors } from "@/lib/utils";
import { client } from "@/routes/api/$";
import type { Doctor, Slot } from "./types";
import { formatDateStr, formatTime12 } from "./types";

function PatientLookup({
	onFound,
}: {
	onFound: (patientId: number, name: string, identifier: string) => void;
}) {
	const [identifier, setIdentifier] = useState("");
	const [lookingUp, setLookingUp] = useState(false);

	const handleLookup = async () => {
		if (!identifier.trim()) return;
		setLookingUp(true);

		const identifierValue = identifier.toLowerCase();
		let identifierType: "student_id" | "psrn" | "phone";
		if (identifierValue.startsWith("h")) {
			identifierType = "psrn";
		} else if (/^\d+$/.test(identifierValue)) {
			identifierType = "phone";
		} else {
			identifierType = "student_id";
		}

		const res = await client.api.existing.$get({
			query: { identifier: identifierValue, identifierType },
		});
		const data = await handleErrors(res);
		setLookingUp(false);

		if (!data || !("exists" in data) || !data.exists) {
			toast.error("Patient not found. Please register them first.");
			return;
		}

		if ("professor" in data) {
			onFound(data.professor.id, data.professor.name, identifier);
		} else if ("id" in data) {
			onFound(data.id, data.name, identifier);
		}
	};

	return (
		<div className="flex flex-col gap-4 max-w-md mx-auto">
			<h2 className="text-lg font-semibold text-center">
				Enter Patient ID / PSRN
			</h2>
			<p className="text-sm text-muted-foreground text-center">
				Look up the patient before confirming the appointment.
			</p>
			<div className="flex flex-col gap-2">
				<Label htmlFor="patient-id">Patient Identifier</Label>
				<div className="flex gap-2">
					<Input
						id="patient-id"
						value={identifier}
						onChange={(e) => setIdentifier(e.target.value)}
						placeholder="e.g. F20230001 / H0001 / phone"
						onKeyDown={(e) => e.key === "Enter" && handleLookup()}
					/>
					<Button onClick={handleLookup} disabled={lookingUp}>
						{lookingUp ? <><Spinner className="mr-2" /> Searching…</> : "Search"}
					</Button>
				</div>
			</div>
		</div>
	);
}

function SlotGrid({
	slots,
	loading,
	unavailable,
	date,
	selectedSlot,
	onSelectSlot,
}: {
	slots: Slot[];
	loading: boolean;
	unavailable: boolean;
	date: Date;
	selectedSlot: Slot | null;
	onSelectSlot: (slot: Slot) => void;
}) {
	if (loading) {
		return (
			<div className="flex justify-center items-center gap-2 py-8">
				<Spinner />
				<span className="text-muted-foreground">Loading available slots…</span>
			</div>
		);
	}

	if (unavailable) {
		return (
			<Alert>
				<CalendarOff className="size-4" />
				<AlertTitle>Unavailable</AlertTitle>
				<AlertDescription>
					Doctor is unavailable on this date. Please select another date.
				</AlertDescription>
			</Alert>
		);
	}

	if (slots.length === 0) {
		return (
			<Alert>
				<AlertCircle className="size-4" />
				<AlertTitle>No slots available</AlertTitle>
				<AlertDescription>
					All slots are booked for this date. Please select another date.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center gap-2 mb-3">
					<Clock className="size-4 text-muted-foreground" />
					<h3 className="text-sm font-medium text-muted-foreground">
						Select Time Slot for {format(date, "MMMM do, yyyy")}
					</h3>
				</div>
				<ToggleGroup
					type="single"
					variant="outline"
					spacing={2}
					value={selectedSlot?.slotStart ?? ""}
					onValueChange={(value) => {
						if (!value) return;
						const slot = slots.find((s) => s.slotStart === value);
						if (slot) onSelectSlot(slot);
					}}
					className="flex flex-wrap gap-2 w-full"
				>
					{slots.map((slot) => (
						<ToggleGroupItem
							key={slot.slotStart}
							value={slot.slotStart}
							className="min-w-[5rem]"
						>
							{formatTime12(slot.slotStart)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</CardContent>
		</Card>
	);
}

function BookingConfirmation({
	categoryId,
	categoryName,
	doctor,
	date,
	patientId,
	onEditCategory,
	onEditDoctor,
	onEditDate,
	onBooked,
}: {
	categoryId: number;
	categoryName: string;
	doctor: Doctor;
	date: Date;
	patientId: number;
	onEditCategory: () => void;
	onEditDoctor: () => void;
	onEditDate: () => void;
	onBooked: (tokenNumber: number) => void;
}) {
	const [slots, setSlots] = useState<Slot[]>([]);
	const [loading, setLoading] = useState(true);
	const [unavailable, setUnavailable] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
	const [isBooking, setIsBooking] = useState(false);

	const dateStr = formatDateStr(date);

	useEffect(() => {
		(async () => {
			setLoading(true);
			const res = await client.api.booking["available-slots"].$get({
				query: {
					doctorId: doctor.doctorId.toString(),
					date: dateStr,
				},
			});
			const data = await handleErrors(res);
			if (data) {
				setSlots(data.slots);
				setUnavailable(data.unavailable);
			}
			setLoading(false);
		})();
	}, [doctor.doctorId, dateStr]);

	const handleConfirm = async () => {
		if (!selectedSlot) return;
		setIsBooking(true);

		const res = await client.api.booking.appointments.$post({
			json: {
				patientId,
				doctorId: doctor.doctorId,
				categoryId,
				appointmentDate: dateStr,
				slotStart: selectedSlot.slotStart,
				slotEnd: selectedSlot.slotEnd,
			},
		});

		const data = await handleErrors(res);
		setIsBooking(false);

		if (data) {
			toast.success("Appointment booked successfully!");
			const d = data as { appointmentId: number; tokenNumber: number };
			onBooked(d.tokenNumber);
		}
	};

	return (
		<div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
			<Card>
				<CardContent className="p-4 space-y-1">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Category</span>
						<Button variant="ghost" size="sm" className="text-primary h-7" onClick={onEditCategory}>
							<Pencil className="size-3 mr-1" /> Edit
						</Button>
					</div>
					<p className="font-medium">{categoryName}</p>

					<Separator className="my-2" />

					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Doctor</span>
						<Button variant="ghost" size="sm" className="text-primary h-7" onClick={onEditDoctor}>
							<Pencil className="size-3 mr-1" /> Edit
						</Button>
					</div>
					<p className="font-medium">
						Dr. {doctor.doctorName}{" "}
						<Badge variant="outline" className="ml-1 capitalize">
							{doctor.doctorType}
						</Badge>
					</p>

					<Separator className="my-2" />

					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Date</span>
						<Button variant="ghost" size="sm" className="text-primary h-7" onClick={onEditDate}>
							<Pencil className="size-3 mr-1" /> Edit
						</Button>
					</div>
					<p className="font-medium">{format(date, "MMMM do, yyyy")}</p>
				</CardContent>
			</Card>

			<SlotGrid
				slots={slots}
				loading={loading}
				unavailable={unavailable}
				date={date}
				selectedSlot={selectedSlot}
				onSelectSlot={setSelectedSlot}
			/>

			<Button
				onClick={handleConfirm}
				disabled={!selectedSlot || isBooking}
				size="lg"
				className="mt-2"
			>
				{isBooking ? <><Spinner className="mr-2" /> Booking…</> : <>Confirm Appointment <Check className="size-4 ml-1" /></>}
			</Button>
		</div>
	);
}

export default function StepBookAppointment({
	categoryId,
	categoryName,
	doctor,
	date,
	onEditCategory,
	onEditDoctor,
	onEditDate,
	onBooked,
}: {
	categoryId: number;
	categoryName: string;
	doctor: Doctor;
	date: Date;
	onEditCategory: () => void;
	onEditDoctor: () => void;
	onEditDate: () => void;
	onBooked: (tokenNumber: number) => void;
}) {
	const [patient, setPatient] = useState<{
		id: number;
		name: string;
		identifier: string;
	} | null>(null);

	if (!patient) {
		return (
			<PatientLookup
				onFound={(id, name, identifier) =>
					setPatient({ id, name, identifier })
				}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<Alert className="max-w-lg mx-auto">
				<AlertTitle className="flex items-center justify-between">
					<span>Patient: {patient.name}</span>
					<Button
						variant="ghost"
						size="sm"
						className="text-primary h-7"
						onClick={() => setPatient(null)}
					>
						Change
					</Button>
				</AlertTitle>
				<AlertDescription>
					ID: {patient.identifier}
				</AlertDescription>
			</Alert>

			<BookingConfirmation
				categoryId={categoryId}
				categoryName={categoryName}
				doctor={doctor}
				date={date}
				patientId={patient.id}
				onEditCategory={onEditCategory}
				onEditDoctor={onEditDoctor}
				onEditDate={onEditDate}
				onBooked={onBooked}
			/>
		</div>
	);
}
