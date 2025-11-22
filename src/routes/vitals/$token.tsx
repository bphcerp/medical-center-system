import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { NotFound } from "@/components/not-found";
import { PatientDetails } from "@/components/patient-details";
import { Button } from "@/components/ui/button";
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
import { handleErrors } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/vitals/$token")({
	loader: async (c) => {
		const token = Number(c.params.token);

		const doctorsRes = await client.api.vitals.availableDoctors.$get();
		const availableDoctors = await handleErrors(doctorsRes);

		const parent = await c.parentMatchPromise;
		const patient = parent.loaderData?.unprocessed.find(
			(p) => p.token === token,
		);
		if (!patient) {
			throw notFound();
		}

		return { availableDoctors: availableDoctors || [], patient };
	},
	notFoundComponent: () => <NotFound title="Patient not found" />,
	component: RouteComponent,
});

function RouteComponent() {
	const doctorAssignedId = useId();
	const [assignedDoctor, setAssignedDoctor] = useState<number | null>(null);

	const { navigate } = useRouter();

	const { availableDoctors, patient } = Route.useLoaderData();

	const handleCreateCase = async (
		formData: FormData,
		patient: Exclude<typeof Route.types.loaderData.patient, undefined>,
	) => {
		if (assignedDoctor === null) {
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

		// TODO: For some reason this form resets on bad input
		// Create a new case
		const res = await client.api.vitals.createCase.$post({
			json: {
				token: patient.token,
				patientId: patient?.id,
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
		toast.success("Case created successfully!");
		navigate({ to: "/vitals" });
	};

	return (
		<>
			{patient && (
				<form
					className="flex flex-col gap-4 w-full"
					action={(e) => handleCreateCase(e, patient)}
				>
					<PatientDetails
						patient={patient}
						token={patient.token}
						label="Entering vitals for"
					/>
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
		</>
	);
}
