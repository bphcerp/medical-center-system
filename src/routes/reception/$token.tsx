import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { NotFound } from "@/components/not-found";
import { PatientDetails } from "@/components/patient-details";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

export const Route = createFileRoute("/reception/$token")({
	loader: async (c) => {
		const token = Number(c.params.token);

		const [doctorsRes, patientRes] = await Promise.all([
			client.api.vitals.availableDoctors.$get(),
			client.api.vitals.unprocessed[":token"].$get({
				param: { token: token.toString() },
			}),
		]);
		if (patientRes.status === 404) {
			throw notFound();
		}

		const [availableDoctors, patient] = await Promise.all([
			handleErrors(doctorsRes),
			handleErrors(patientRes),
		]);
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

	const handleRemoveFromQueue = async () => {
		const res = await client.api.vitals.removeFromQueue[":token"].$delete({
			param: { token: patient.token.toString() },
		});
		const data = await handleErrors(res);
		if (data === undefined) return;
		toast.success("Patient removed from queue.");
		navigate({ to: "/reception" });
	};

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
		navigate({ to: "/reception" });
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
						<FieldGroup className="pt-2">
							<VitalsCard />
							<Separator className="hidden lg:inline" />
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
										<SelectTrigger id={doctorAssignedId}>
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
									<Button type="submit" className="text-base">
										<Check />
										Submit
									</Button>
								</Field>
								<Field>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												type="button"
												variant="destructive"
												className="text-base"
											>
												<Trash2 />
												Remove from Queue
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Remove from queue?</AlertDialogTitle>
												<AlertDialogDescription>
													This will remove{" "}
													<span className="font-semibold">{patient.name}</span>{" "}
													from the patient queue without creating a case.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={handleRemoveFromQueue}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													Remove
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</Field>
							</div>
						</FieldGroup>
					</FieldSet>
				</form>
			)}
		</>
	);
}
