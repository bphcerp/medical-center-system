import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		<div className="flex">
			<div className="flex flex-col w-2/12 px-4">
				<h1 className="text-2xl font-bold mb-4">Unprocessed Patients</h1>
				<div className="flex flex-col gap-2">
					{unprocessed.map((patient) => (
						<Card key={patient.unprocessed.id}>
							<CardHeader>
								<CardTitle>Token: {patient.unprocessed.id}</CardTitle>
								<CardAction>
									<Button
										onClick={() => {
											setFocusedPatient(patient);
										}}
										disabled={
											focusedPatient?.unprocessed.id === patient.unprocessed.id
										}
									>
										{focusedPatient?.unprocessed.id === patient.unprocessed.id
											? "Selected"
											: "Select"}
									</Button>
								</CardAction>
							</CardHeader>
							<CardContent>
								<p>Name: {patient.patients.name}</p>
								<p>Age: {patient.patients.age}</p>
								<p>Sex: {patient.patients.sex}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
			<div className="h-full w-10/12 px-36">
				{focusedPatient ? (
					<form className="pt-48" action={handleCreateCase}>
						<FieldSet>
							<FieldGroup>
								<h2 className="text-2xl font-bold mb-4">
									Entering Vitals for {focusedPatient.patients.name} (Token:{" "}
									{focusedPatient.unprocessed.id})
								</h2>
								<div className="grid grid-cols-5 gap-4">
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
											<InputGroupAddon align="inline-end">° F</InputGroupAddon>
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
											<InputGroupAddon align="inline-end">bpm</InputGroupAddon>
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
									<Field>
										<FieldLabel htmlFor={spo2Id}>SpO2 (optional)</FieldLabel>
										<InputGroup>
											<InputGroupInput
												id={spo2Id}
												type="number"
												placeholder="SpO2"
												name="spo2"
											/>
											<InputGroupAddon align="inline-end">%</InputGroupAddon>
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
											<InputGroupAddon align="inline-end">kg</InputGroupAddon>
										</InputGroup>
									</Field>
								</div>
								<Separator className="my-2" />
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
								<Field>
									<Button type="submit">Login</Button>
								</Field>
							</FieldGroup>
						</FieldSet>
					</form>
				) : (
					<p>No Patient Selected</p>
				)}
			</div>
		</div>
	);
}
