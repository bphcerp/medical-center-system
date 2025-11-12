import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Activity, Check } from "lucide-react";
import type React from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, titleCase } from "@/lib/utils";
import { client } from "./api/$";

export const Route = createFileRoute("/vitals")({
	loader: async () => {
		const res = await client.api.vitals.unprocessed.$get();
		switch (res.status) {
			case 401:
				throw redirect({
					to: "/login",
				});
			case 403:
				alert("You don't have the permission to access Vitals");
				throw redirect({
					to: "/",
				});
		}
		const json = await res.json();

		const doctors = await client.api.vitals.availableDoctors.$get();
		switch (doctors.status) {
			case 401:
				throw redirect({
					to: "/login",
				});
			case 403:
				alert("You don't have the permission to access Vitals");
				throw redirect({
					to: "/",
				});
		}
		const doctorsJson = await doctors.json();

		return {
			unprocessed: json.unprocessed,
			availableDoctors: doctorsJson.doctors,
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
	const respiratoryRateId = useId();
	const bloodSugarId = useId();
	const bloodPressureSystolicId = useId();
	const bloodPressureDiastolicId = useId();
	const bodyTemperatureId = useId();
	const heartRateId = useId();
	const spo2Id = useId();
	const weightId = useId();
	const doctorAssignedId = useId();

	const { unprocessed, availableDoctors } = Route.useLoaderData();
	const [focusedPatient, setFocusedPatient] = useState<
		(typeof unprocessed)[number] | null
	>(null);
	useEffect(() => {
		setFocusedPatient(unprocessed.length > 0 ? unprocessed[0] : null);
	}, [unprocessed]);
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
		if (res.status !== 201) {
			alert(
				"Error creating case. Please proceed with offline process, and report this error.",
			);
			return;
		}
		alert("Case created successfully!");
		router.invalidate();
	};

	return (
		<div className="flex flex-col items-stretch h-screen">
			<h1 className="text-3xl font-bold border-b p-4">Patient Queue</h1>
			<div className="flex items-stretch divide-x divide-border grow min-h-0">
				<div className="flex flex-col flex-2 p-4 gap-4 overflow-y-scroll bottom-0 min-h-0">
					{unprocessed.length === 0 && (
						<p className="text-center my-auto">No patients in queue</p>
					)}
					{unprocessed.map((patient) => {
						const isSelected =
							focusedPatient?.unprocessed.id === patient.unprocessed.id;
						const sex = titleCase(patient.patients.sex);
						return (
							<Button
								variant="ghost"
								key={patient.unprocessed.id}
								className={cn(
									"flex gap-3 p-0 rounded-lg border-2 items-center overflow-clip bg-card h-auto",
									isSelected && "border-primary",
								)}
								onClick={() => setFocusedPatient(patient)}
							>
								<span
									className={cn(
										"h-full content-center min-w-13 px-2 text-center",
										"font-semibold tabular-nums tracking-tight text-lg transition-colors",
										isSelected
											? "bg-primary text-primary-foreground"
											: "bg-accent text-accent-foreground",
									)}
								>
									{patient.unprocessed.id}
								</span>
								<div className="flex grow flex-col items-start text-base py-2 pr-2">
									<span className="whitespace-normal text-left">
										{patient.patients.name}
									</span>
									<div className="flex justify-between w-full items-end">
										<span className="text-muted-foreground font-medium text-left text-sm">
											{sex}, {patient.patients.age} y.o.
										</span>
										<PatientTypeBadge type={patient.patients.type} />
									</div>
								</div>
							</Button>
						);
					})}
				</div>
				<div className="h-full flex-5 px-12 flex">
					{focusedPatient ? (
						<form className="mt-12 w-full" action={handleCreateCase}>
							<FieldSet>
								<FieldGroup>
									<div className="flex flex-col gap-2">
										<p className="italic text-muted-foreground">
											Entering vitals for
										</p>
										<div className="flex items-stretch gap-3">
											<PatientTypeBadge
												key={focusedPatient.patients.id}
												type={focusedPatient.patients.type}
												className="text-2xl border px-3 tabular-nums tracking-tight font-medium flex items-center"
											>
												{focusedPatient.unprocessed.id}
											</PatientTypeBadge>
											<div className="flex flex-col gap-0.5">
												<span className="text-3xl font-bold">
													{focusedPatient.patients.name}
												</span>
												<span className="flex items-center gap-2">
													<span className="text-muted-foreground font-medium text-lg">
														{titleCase(focusedPatient.patients.sex)},{" "}
														{focusedPatient.patients.age} year
														{focusedPatient.patients.age !== 1 ? "s" : ""} old
													</span>
													<PatientTypeBadge
														type={focusedPatient.patients.type}
													/>
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-start gap-4">
										<div className="flex-2 flex flex-col gap-4 p-4 rounded-lg bg-pink-700/5">
											<div className="grid grid-cols-2 gap-4 flex-2">
												<Field>
													<FieldLabel htmlFor={bodyTemperatureId}>
														Body Temperature (optional)
													</FieldLabel>
													<InputGroup>
														<InputGroupInput
															id={bodyTemperatureId}
															type="number"
															placeholder="Body Temperature"
															name="bodyTemperature"
														/>
														<InputGroupAddon align="inline-end">
															° F
														</InputGroupAddon>
													</InputGroup>
												</Field>
												<Field>
													<FieldLabel htmlFor={heartRateId}>
														Heart Rate (optional)
													</FieldLabel>
													<InputGroup>
														<InputGroupInput
															id={heartRateId}
															type="number"
															placeholder="Heart Rate"
															name="heartRate"
														/>
														<InputGroupAddon align="inline-end">
															bpm
														</InputGroupAddon>
													</InputGroup>
												</Field>
												<Field>
													<FieldLabel htmlFor={respiratoryRateId}>
														Respiratory Rate (optional)
													</FieldLabel>
													<InputGroup>
														<InputGroupInput
															id={respiratoryRateId}
															type="number"
															placeholder="Respiratory Rate"
															name="respiratoryRate"
														/>
														<InputGroupAddon align="inline-end">
															per minute
														</InputGroupAddon>
													</InputGroup>
												</Field>
												<Field>
													<FieldLabel htmlFor={spo2Id}>
														SpO2 (optional)
													</FieldLabel>
													<InputGroup>
														<InputGroupInput
															id={spo2Id}
															type="number"
															placeholder="SpO2"
															name="spo2"
														/>
														<InputGroupAddon align="inline-end">
															%
														</InputGroupAddon>
													</InputGroup>
												</Field>
											</div>
											<div className="grid grid-cols-2 gap-4 pt-4 border-t border-pink-700/40">
												<Field>
													<FieldLabel htmlFor={bloodPressureSystolicId}>
														Blood Pressure Systolic (optional)
													</FieldLabel>
													<InputGroup>
														<InputGroupInput
															id={bloodPressureSystolicId}
															type="number"
															placeholder="Blood Pressure (Systolic)"
															name="bloodPressureSystolic"
														/>
														<InputGroupAddon align="inline-end">
															mm Hg
														</InputGroupAddon>
													</InputGroup>
												</Field>
												<Field>
													<FieldLabel htmlFor={bloodPressureDiastolicId}>
														Blood Pressure Diastolic (optional)
													</FieldLabel>
													<InputGroup>
														<InputGroupInput
															id={bloodPressureDiastolicId}
															type="number"
															placeholder="Blood Pressure (Diastolic)"
															name="bloodPressureDiastolic"
														/>
														<InputGroupAddon align="inline-end">
															mm Hg
														</InputGroupAddon>
													</InputGroup>
												</Field>
											</div>
										</div>
										<div className="flex-1 grid grid-cols-1 gap-4 p-4 rounded-lg bg-purple-700/5">
											<Field>
												<FieldLabel htmlFor={weightId}>
													Weight (optional)
												</FieldLabel>
												<InputGroup>
													<InputGroupInput
														id={weightId}
														type="number"
														placeholder="Weight"
														name="weight"
													/>
													<InputGroupAddon align="inline-end">
														kg
													</InputGroupAddon>
												</InputGroup>
											</Field>
											<Field>
												<FieldLabel htmlFor={bloodSugarId}>
													Blood Sugar (optional)
												</FieldLabel>
												<InputGroup>
													<InputGroupInput
														id={bloodSugarId}
														type="number"
														placeholder="Blood Sugar"
														name="bloodSugar"
													/>
													<InputGroupAddon align="inline-end">
														mg/dL
													</InputGroupAddon>
												</InputGroup>
											</Field>
										</div>
									</div>
									<Separator className="my-2" />
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
					) : (
						<p className="self-center text-center w-full">
							No Patient Selected
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

function PatientTypeBadge({
	type,
	className,
	children,
	...props
}: React.PropsWithChildren<{
	type: (typeof Route.types.loaderData.unprocessed)[number]["patients"]["type"];
}> &
	React.ComponentProps<typeof Badge>) {
	let color: string;
	switch (type) {
		case "professor":
		case "dependent":
			color = "text-purple-700 border-purple-700";
			break;
		case "visitor":
			color = "text-pink-700 border-pink-700";
			break;
		case "student":
			color = "text-teal-700 border-teal-700";
			break;
	}
	return (
		<Badge
			className={cn("border bg-transparent rounded-sm", color, className)}
			{...props}
		>
			{children ?? type}
		</Badge>
	);
}
