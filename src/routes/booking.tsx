import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { TokenDisplay } from "src/components/token-display";
import type { Doctor } from "@/api/admin";
import StepConfirmBooking from "@/components/booking/step-book-appointment";
import StepSelectDoctor from "@/components/booking/step-select-category";
import StepSelectTimeslot from "@/components/booking/step-view-availability";
import {
	type BookingState,
	INITIAL_STATE,
	type Slot,
} from "@/components/booking/types";
import TopBar from "@/components/topbar";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import useAuth from "@/lib/hooks/useAuth";
import { formatTime12, handleErrors } from "@/lib/utils";
import { client } from "./api/$";

export const Route = createFileRoute("/booking")({
	loader: async () => {
		const [specialitiesRes, doctorsRes] = await Promise.all([
			client.api.booking.categories.$get(),
			client.api.admin.doctor.all.$get(),
		]);
		const [specialities, allDoctors] = await Promise.all([
			handleErrors(specialitiesRes),
			handleErrors(doctorsRes),
		]);
		return { specialities: specialities ?? [], allDoctors: allDoctors ?? [] };
	},
	component: BookingPage,
	staticData: {
		requiredPermissions: ["admin"],
		icon: CalendarDays,
		name: "Appointment Booking",
	},
});

function BookingPage() {
	useAuth(["admin"]);

	const { specialities, allDoctors } = Route.useLoaderData();

	const [mode, setMode] = useState<"scheduling" | "done">("scheduling");
	const [state, setState] = useState<BookingState>(INITIAL_STATE);
	const [tokenNumber, setTokenNumber] = useState<number | null>(null);

	const handleReset = () => {
		setState(INITIAL_STATE);
		setTokenNumber(null);
		setMode("scheduling");
	};

	const handleDoctorSelect = (doctor: Doctor) => {
		setState({ step: 2, doctor });
	};

	const handleTimeslotSelect = (date: Date, slot: Slot) => {
		setState((s) => {
			if (s.step === 1) return s;
			return { step: 3, doctor: s.doctor, date, slot };
		});
	};

	const handleStepChange = (value: string) => {
		const step = parseInt(value, 10);
		switch (step) {
			case 1:
				handleReset();
				break;
			case 2:
				if (state.step === 3) {
					handleDoctorSelect(state.doctor);
				}
				break;
		}
	};

	const handleBooked = (token: number) => {
		setTokenNumber(token);
		setMode("done");
	};

	return (
		<div className="h-dvh">
			<TopBar title="Appointment Booking" />
			<div className="h-after-topbar">
				<Accordion
					type="single"
					value={state.step.toString()}
					onValueChange={handleStepChange}
					className="max-w-3xl mx-auto"
				>
					{mode === "scheduling" && (
						<>
							<AccordionItem value="1">
								<AccordionTrigger>
									Select doctor
									<span className="flex-1 text-right">
										{"doctor" in state ? state.doctor.name : ""}
									</span>
								</AccordionTrigger>
								<AccordionContent>
									{state.step === 1 && (
										<StepSelectDoctor
											specialities={specialities}
											allDoctors={allDoctors}
											onSelect={handleDoctorSelect}
										/>
									)}
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="2">
								<AccordionTrigger>
									Select timeslot
									<span className="flex-1 text-right">
										{"date" in state ? (
											<span>
												{formatTime12(state.slot.slotStart)} -{" "}
												{formatTime12(state.slot.slotEnd)}
												<span className="text-muted-foreground ms-2">
													{format(state.date, "d MMMM yyyy")}
												</span>
											</span>
										) : (
											""
										)}
									</span>
								</AccordionTrigger>
								<AccordionContent>
									{state.step === 2 && (
										<StepSelectTimeslot
											doctor={state.doctor}
											onSelect={handleTimeslotSelect}
										/>
									)}
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="3">
								<AccordionTrigger>Patient details</AccordionTrigger>
								<AccordionContent>
									{state.step === 3 && (
										<StepConfirmBooking
											doctor={state.doctor}
											date={state.date}
											slot={state.slot}
											onBooked={handleBooked}
										/>
									)}
								</AccordionContent>
							</AccordionItem>
						</>
					)}
				</Accordion>

				{mode === "done" && tokenNumber !== null && (
					<TokenDisplay
						token={tokenNumber}
						onReset={handleReset}
						label="Your appointment has been booked!"
						buttonText="Book another"
					/>
				)}
			</div>
		</div>
	);
}
