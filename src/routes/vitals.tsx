import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Activity, ArrowLeft, Check, ClipboardPlus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { PatientDetails } from "@/components/patient-details";
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
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import VitalsCard from "@/components/vitals-card";
import { cn, handleErrors, titleCase } from "@/lib/utils";
import { client } from "./api/$";

export const Route = createFileRoute("/vitals")({
	loader: async () => {
		const unprocessedRes = await client.api.vitals.unprocessed.$get();
		const doctorsRes = await client.api.vitals.availableDoctors.$get();
		const unprocessed = await handleErrors(unprocessedRes);
		const doctors = await handleErrors(doctorsRes);
		if (!unprocessed || !doctors) {
			return {
				unprocessed: [],
				availableDoctors: [],
			};
		}
		return {
			unprocessed: unprocessed.data.unprocessed,
			availableDoctors: doctors.data.doctors,
		};
	},
	component: Vitals,
	staticData: {
		requiredPermissions: ["vitals"],
		icon: Activity,
		name: "Vitals Entry",
	},
});

function Vitals() {
	const doctorAssignedId = useId();
	const { unprocessed, availableDoctors } = Route.useLoaderData();
	const [focusedPatient, setFocusedPatient] = useState<
		(typeof unprocessed)[number] | null
	>(null);
	const isFocused = focusedPatient !== null;

	const [assignedDoctor, setAssignedDoctor] = useState<number | null>(null);

	const router = useRouter();

	const handleCreateCase = async (formData: FormData) => {
		if (focusedPatient === null || assignedDoctor === null) {
			alert("Please select a patient and assign a doctor.");
			return;
		}
		// Get all form inputs and put them into an object
		const bodyTemperature = formData.get("bodyTemperature");
		const heartRate = formData.get("heartRate");
		const respiratoryRate = formData.get("respiratoryRate");
		const bloodPressureSystolic = formData.get("bloodPressureSystolic");
		const bloodPressureDiastolic = formData.get("bloodPressureDiastolic");
		const spo2 = formData.get("spo2");
		const bloodSugar = formData.get("bloodSugar");
		const weight = formData.get("weight");

		// Create a new case
		const res = await client.api.vitals.createCase.$post({
			json: {
				token: focusedPatient.unprocessed.id,
				patientId: focusedPatient.patients.id,
				doctorId: assignedDoctor,
				vitals: {
					bodyTemperature:
						bodyTemperature === null || bodyTemperature === ""
							? null
							: Number(bodyTemperature),
					heartRate:
						heartRate === null || heartRate === "" ? null : Number(heartRate),
					respiratoryRate:
						respiratoryRate === null || respiratoryRate === ""
							? null
							: Number(respiratoryRate),
					bloodPressureSystolic:
						bloodPressureSystolic === null || bloodPressureSystolic === ""
							? null
							: Number(bloodPressureSystolic),
					bloodPressureDiastolic:
						bloodPressureDiastolic === null || bloodPressureDiastolic === ""
							? null
							: Number(bloodPressureDiastolic),
					spo2: spo2 === null || spo2 === "" ? null : Number(spo2),
					bloodSugar:
						bloodSugar === null || bloodSugar === ""
							? null
							: Number(bloodSugar),
					weight: weight === null || weight === "" ? null : Number(weight),
				},
			},
		});
		const data = await handleErrors(res);
		if (!data) {
			return;
		}
		alert("Case created successfully!");
		router.invalidate();
	};

	return (
		<div className="flex flex-col items-stretch h-screen">
			<TopBar title="Patient Queue" />
			<div className="flex items-stretch divide-x divide-border grow min-h-0">
				<div
					className={cn(
						"relative flex flex-col flex-2 px-4 pt-4 overflow-y-scroll bg-background bottom-0 min-h-0 z-10",
						isFocused && "hidden",
						"lg:flex",
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
							const isSelected =
								focusedPatient?.unprocessed.id === patient.unprocessed.id;
							const sex = titleCase(patient.patients.sex);
							return (
								<TokenButton
									variant="ghost"
									key={patient.unprocessed.id}
									token={patient.unprocessed.id.toString()}
									selected={isSelected}
									onClick={() => setFocusedPatient(patient)}
								>
									<div className="flex flex-col items-start">
										<TokenButtonTitle>{patient.patients.name}</TokenButtonTitle>
										<div className="flex justify-between w-full items-end">
											<span className="text-muted-foreground font-medium text-left text-sm">
												{sex}, {patient.patients.age} y.o.
											</span>
											<PatientTypeBadge type={patient.patients.type} />
										</div>
									</div>
								</TokenButton>
							);
						})}
					</div>
					<div className="sticky flex flex-col bottom-0 bg-linear-to-t from-background to-transparent from-70% via-85% to-100% pb-4 pt-10">
						<NewPatientDialog />
					</div>
				</div>
				<div
					className={cn(
						"hidden flex-col absolute lg:static flex-5 p-4 lg:p-12 w-full",
						isFocused && "flex",
						"lg:flex",
					)}
				>
					{focusedPatient && (
						<form
							className="flex flex-col gap-4 w-full"
							action={handleCreateCase}
						>
							<div className="flex flex-col gap-2">
								<Button
									variant="outline"
									className="self-start lg:hidden mb-2"
									onClick={() => setFocusedPatient(null)}
								>
									<ArrowLeft /> Queue
								</Button>
								<PatientDetails
									patient={focusedPatient.patients}
									token={focusedPatient.unprocessed.id}
									label="Entering vitals for"
								/>
							</div>
							<FieldSet>
								<FieldGroup>
									<VitalsCard />
									<Separator className="hidden lg:inline my-2" />
									<div className="flex items-end gap-4">
										<Field>
											<FieldLabel htmlFor={doctorAssignedId}>
												Doctor Assigned
											</FieldLabel>
											<Select
												required
												name="doctorAssigned"
												onValueChange={(v) => {
													setAssignedDoctor(parseInt(v, 10));
												}}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select Doctor" />
												</SelectTrigger>
												<SelectContent>
													{availableDoctors.map((option) => (
														<SelectItem
															key={option.name}
															value={option.id.toString()}
														>
															{option.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
										<Field className="col-span-2">
											<Button type="submit" size="lg">
												<Check />
												Submit
											</Button>
										</Field>
									</div>
								</FieldGroup>
							</FieldSet>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}

function NewPatientDialog() {
	const router = useRouter();
	const [token, setTokenInternal] = useState<number | null>(null);

	const handleToken = (newToken: number) => {
		router.invalidate();
		setTokenInternal(newToken);
	};

	return (
		<Dialog onOpenChange={(open) => !open && setTokenInternal(null)}>
			<DialogTrigger asChild>
				<Button variant="secondary" size="lg">
					<Plus /> New Patient
				</Button>
			</DialogTrigger>

			<DialogContent>
				{token === null ? (
					<RegistrationForm
						setToken={handleToken}
						isPatientRegistering={false}
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
