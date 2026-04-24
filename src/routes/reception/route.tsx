import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
	useRouter,
} from "@tanstack/react-router";
import { format } from "date-fns";
import { Activity, CalendarIcon, ClipboardPlus, Plus } from "lucide-react";
import { type PropsWithChildren, useState } from "react";
import type { Doctor } from "src/api/doctor";
import StepConfirmBooking from "src/components/booking/step-book-appointment";
import StepSelectDoctor from "src/components/booking/step-select-doctor";
import StepSelectTimeslot from "src/components/booking/step-view-availability";
import {
	type BookingState,
	INITIAL_STATE,
	type Slot,
} from "src/components/booking/types";
import ViewAppointmentsDialog from "src/components/booking/view-appointments-dialog";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "src/components/ui/accordion";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { PatientTypeBadge } from "@/components/patient-type-badge";
import { RegistrationForm } from "@/components/registration-card";
import { TokenButton, TokenButtonTitle } from "@/components/token-button";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { useSSE } from "@/lib/hooks/useSSE";
import { cn, formatTime12, handleErrors, titleCase } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/reception")({
	loader: async () => {
		const [unprocessedRes, specialitiesRes, doctorsRes] = await Promise.all([
			client.api.vitals.unprocessed.$get(),
			client.api.booking.categories.$get(),
			client.api.doctor.all.$get(),
		]);
		const [unprocessed, specialities, allDoctors] = await Promise.all([
			handleErrors(unprocessedRes),
			handleErrors(specialitiesRes),
			handleErrors(doctorsRes),
		]);
		return {
			unprocessed: unprocessed ?? [],
			specialities: specialities ?? [],
			allDoctors: allDoctors ?? [],
		};
	},
	component: Vitals,
	staticData: {
		requiredPermissions: ["vitals"],
		icon: Activity,
		name: "Reception",
	},
});

function Vitals() {
	const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
	const [viewAppointmentsOpen, setViewAppointmentsOpen] = useState(false);
	const { unprocessed: initialUnprocessed } = Route.useLoaderData();
	const unprocessed = useSSE(
		"/api/vitals/stream",
		"unprocessed",
		initialUnprocessed,
	);
	const selectedToken = useParams({
		from: "/reception/$token",
		shouldThrow: false,
		select: (p) => Number(p.token),
	});

	return (
		<div className="flex flex-col items-stretch h-dvh">
			<TopBar title="Patient Queue" />
			<div className="flex items-stretch divide-x divide-border grow min-h-0 h-after-topbar">
				<div
					className={cn(
						"relative flex flex-col flex-2 px-4 pt-4 overflow-y-scroll bg-background bottom-0 min-h-0",
						selectedToken !== undefined && "hidden lg:flex",
					)}
				>
					<div className="grow flex flex-col gap-4">
						{unprocessed.length === 0 && (
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ClipboardPlus />
									</EmptyMedia>
									<EmptyTitle>No unprocessed patients</EmptyTitle>
									<EmptyDescription>
										When new patients arrive, they will appear here.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
						{unprocessed.map((patient) => {
							const isSelected = patient.token === selectedToken;

							const sex = titleCase(patient.sex);
							return (
								<Link
									to="/reception/$token"
									replace
									params={{ token: patient.token.toString() }}
									key={patient.token}
								>
									<TokenButton
										variant="ghost"
										token={patient.token.toString()}
										selected={isSelected}
									>
										<div className="flex flex-col items-start">
											<TokenButtonTitle>{patient.name}</TokenButtonTitle>
											<div className="flex justify-between w-full items-end">
												<span className="text-muted-foreground font-medium text-left text-sm">
													{sex}, {patient.age} y.o.
												</span>
												<PatientTypeBadge type={patient.type} />
											</div>
										</div>
									</TokenButton>
								</Link>
							);
						})}
					</div>
					<div className="sticky flex flex-wrap gap-4 bottom-0 bg-linear-to-t from-background to-transparent from-70% via-85% to-100% pb-4 pt-10">
						<NewPatientDialog>
							<Button variant="secondary" size="lg" className="flex-1">
								<Plus /> New Patient
							</Button>
						</NewPatientDialog>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="lg" className="flex-1">
									<CalendarIcon /> Appointments
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-(--radix-popper-anchor-width)"
							>
								<DropdownMenuItem
									onSelect={(e) => {
										e.preventDefault();
										setBookAppointmentOpen(true);
									}}
								>
									Book Appointment
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={(e) => {
										e.preventDefault();
										setViewAppointmentsOpen(true);
									}}
								>
									View Appointments
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<AppointmentDialog
							open={bookAppointmentOpen}
							onOpenChange={setBookAppointmentOpen}
						/>
						<ViewAppointmentsDialog
							open={viewAppointmentsOpen}
							onOpenChange={setViewAppointmentsOpen}
						/>
					</div>
				</div>
				<div
					className={cn(
						"flex-col flex-5 p-4 lg:p-12 w-full",
						selectedToken === undefined && "hidden lg:block",
					)}
				>
					<Outlet />
				</div>
			</div>
		</div>
	);
}

function NewPatientDialog({ children }: PropsWithChildren) {
	const router = useRouter();
	const [token, setTokenInternal] = useState<number | null>(null);

	const handleToken = (newToken: number) => {
		router.invalidate();
		setTokenInternal(newToken);
	};

	return (
		<Dialog onOpenChange={(open) => !open && setTokenInternal(null)}>
			<DialogTrigger asChild>{children}</DialogTrigger>

			<DialogContent>
				{token === null ? (
					<RegistrationForm
						setToken={handleToken}
						registrationContext="reception"
					/>
				) : (
					<div className="flex flex-col items-center gap-4">
						<span>Patient's token number</span>
						<span className="text-7xl">{token}</span>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function AppointmentDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [token, setTokenInternal] = useState<number | null>(null);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) setTokenInternal(null);
			}}
		>
			<DialogContent className="min-w-fit flex flex-col justify-stretch">
				{token === null ? (
					<Booking setToken={setTokenInternal} />
				) : (
					<div className="flex flex-col items-center gap-4">
						<span>Appointment token number</span>
						<span className="text-7xl">{token}</span>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function Booking({ setToken }: { setToken: (token: number) => void }) {
	const { specialities, allDoctors } = Route.useLoaderData();

	const [mode, setMode] = useState<"scheduling" | "done">("scheduling");
	const [state, setState] = useState<BookingState>(INITIAL_STATE);

	const handleReset = () => {
		setState(INITIAL_STATE);
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
		setMode("done");
		setToken(token);
	};

	// TODO: change this from accordion to something else
	return (
		<Accordion
			type="single"
			value={state.step.toString()}
			onValueChange={handleStepChange}
			className="min-w-[50dvw]"
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
							<StepSelectDoctor
								specialities={specialities}
								allDoctors={allDoctors}
								onSelect={handleDoctorSelect}
							/>
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
	);
}
