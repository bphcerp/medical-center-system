import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronsUpDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { client } from "./api/$";

type PrescriptionItem = {
	id: number;
	drug: string;
	brand: string;
	company: string;
	strength: string;
	type: string;
	dosage: string;
	frequency: string;
	duration: string;
	comments: string;
};

type DiagnosisItem = {
	id: number;
	name: string;
	icd: string;
};

export const Route = createFileRoute("/consultation/$id")({
	loader: async ({ params }: { params: { id: string } }) => {
		// Check if user is authenticated
		const res = await client.api.user.$get();
		if (res.status !== 200) {
			throw redirect({
				to: "/login",
			});
		}
		const user = await res.json();
		if ("error" in user) {
			throw redirect({
				to: "/login",
			});
		}
		const consultationRes = await client.api.doctor.consultation[
			":caseId"
		].$get({
			param: { caseId: params.id },
		});

		if (consultationRes.status !== 200) {
			throw new Error("Failed to fetch consultation details");
		}

		const { caseDetail } = await consultationRes.json();

		const medicinesRes = await client.api.doctor.medicines.$get();

		if (medicinesRes.status !== 200) {
			throw new Error("Failed to fetch medicines details");
		}

		const { medicines } = await medicinesRes.json();
		// console.log(medicines);

		const diseasesRes = await client.api.doctor.diseases.$get();

		if (diseasesRes.status !== 200) {
			throw new Error("Failed to fetch diseases details");
		}

		const { diseases } = await diseasesRes.json();

		return { user, caseDetail, medicines, diseases };
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	const { caseDetail, medicines, diseases } = Route.useLoaderData();
	const navigate = useNavigate();
	const { id } = Route.useParams();

	const [finalizeButtonValue, setFinalizeButtonValue] = useState<
		"Finalize (OPD)" | "Admit" | "Referral"
	>("Finalize (OPD)");

	const [diagnosisQuery, setDiagnosisQuery] = useState<string>("");

	const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([]);

	const [diseasesSearchOpen, setDiseasesSearchOpen] =
		useState<boolean>(false);

	const filteredDiseases = diseases
		.reduce(
			(acc, disease) => {
				if (diagnosisQuery === "") {
					acc.push({
						disease,
						count: 0,
					});
					return acc;
				}

				const count = diagnosisQuery
					.trim()
					.split(/\s+/)
					.reduce((count, term) => {
						return (
							count +
							(disease.icd.toLowerCase().includes(term.toLowerCase()) ||
							disease.name.toLowerCase().includes(term.toLowerCase())
								? 1
								: 0)
						);
					}, 0);

				if (count > 0) {
					acc.push({
						disease,
						count,
					});
				}
				return acc;
			},
			[] as { disease: (typeof diseases)[0]; count: number }[],
		)
		.sort((a, b) => b.count - a.count);

	const handleAddDisease = (disease: (typeof diseases)[0]) => {
		if (diagnosisItems.some((item) => item.id === disease.id)) {
			alert("This disease is already in the diagnosis");
			return;
		}

		const newItem: DiagnosisItem = {
			id: disease.id,
			name: disease.name,
			icd: disease.icd,
		};

		setDiagnosisItems([...diagnosisItems, newItem]);
		setDiagnosisQuery("");
	};

	const handleRemoveDiagnosisItem = (id: number) => {
		setDiagnosisItems(diagnosisItems.filter((item) => item.id !== id));
	};

	const [prescriptionQuery, setPrescriptionQuery] = useState<string>("");

	const [medicinesSearchOpen, setMedicinesSearchOpen] =
		useState<boolean>(false);

	const [prescriptionItems, setPrescriptionItems] = useState<
		PrescriptionItem[]
	>([]);

	const filteredMedicines = medicines
		.reduce(
			(acc, medicine) => {
				if (prescriptionQuery === "") {
					acc.push({
						medicine,
						count: 0,
					});
					return acc;
				}

				const count = prescriptionQuery
					.trim()
					.split(/\s+/)
					.reduce((count, term) => {
						return (
							count +
							(medicine.drug.toLowerCase().includes(term.toLowerCase()) ||
							medicine.brand.toLowerCase().includes(term.toLowerCase()) ||
							medicine.company.toLowerCase().includes(term.toLowerCase()) ||
							medicine.type.toLowerCase().includes(term.toLowerCase())
								? 1
								: 0)
						);
					}, 0);

				if (count > 0) {
					acc.push({
						medicine,
						count,
					});
				}
				return acc;
			},
			[] as { medicine: (typeof medicines)[0]; count: number }[],
		)
		.sort((a, b) => b.count - a.count);

	const handleAddMedicine = (medicine: (typeof medicines)[0]) => {
		//heck if medicine already exists in the prescription
		if (prescriptionItems.some((item) => item.id === medicine.id)) {
			alert("This medicine is already in the prescription");
			return;
		}

		const newItem: PrescriptionItem = {
			id: medicine.id,
			drug: medicine.drug,
			brand: medicine.brand,
			company: medicine.company,
			strength: medicine.strength,
			type: medicine.type,

			dosage: "",
			frequency: "",
			duration: "",
			comments: "",
		};

		setPrescriptionItems([...prescriptionItems, newItem]);
		setPrescriptionQuery("");
	};

	const handleUpdatePrescriptionItem = (
		id: number,
		field: keyof Omit<PrescriptionItem, "id" | "medicine">,
		value: string,
	) => {
		setPrescriptionItems(
			prescriptionItems.map((item) =>
				item.id === id ? { ...item, [field]: value } : item,
			),
		);
	};

	const handleRemovePrescriptionItem = (id: number) => {
		setPrescriptionItems(prescriptionItems.filter((item) => item.id !== id));
	};

	if (!caseDetail) {
		return (
			<div className="container mx-auto p-6">
				<h1 className="text-3xl font-bold">Consultation Page</h1>
				<p className="text-muted-foreground mt-2">Case ID: {id}</p>
				<p className="mt-4">No consultation details found for this case.</p>
			</div>
		);
	}

	async function handleFinalize() {
		let finalizedState: "opd" | "admitted" | "referred";
		switch (finalizeButtonValue) {
			case "Finalize (OPD)":
				finalizedState = "opd";
				break;
			case "Admit":
				finalizedState = "admitted";
				break;
			case "Referral":
				finalizedState = "referred";
				break;
			default:
				console.error(
					"Finalized state not matching any of the types Finalize (OPD), Admit, or Referral",
				);
				return;
		}
		const caseRes = await client.api.doctor.finalizeCase.$post({
			json: {
				caseId: Number(id),
				finalizedState: finalizedState,
				diagnosis: diagnosisItems.map((d) => d.id),
				prescriptions: prescriptionItems.map((item) => ({
					medicineId: item.id,
					dosage: item.dosage,
					frequency: item.frequency,
					comment: item.comments,
				})),
			},
		});

		if (caseRes.status !== 200) {
			const error = await caseRes.json();
			alert("error" in error ? error.error : "Failed to save case data");
			return;
		}
		navigate({
			to: "/doctor",
		});
	}

	return (
		<div className="p-6">
			<h1 className="text-3xl font-bold">
				Consultation for {caseDetail.patientName}
			</h1>
			<p className="text-muted-foreground my-2">Token Number: {caseDetail.token}</p>
			<Card className="mb-2">
				<div className="flex gap-4 mx-3">
					<Field>
						<FieldLabel className="font-semibold">Patient Name</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.patientName || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">Age</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.patientAge || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">ID/PSRN</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.identifier || "—"}
						</div>
					</Field>
				</div>
			</Card>
			<Card className="mb-2">
				<div className="flex gap-4 mx-3">
					<Field>
						<FieldLabel className="font-semibold">Body Temperature</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1 max-width-20px">
							{caseDetail?.temperature || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">Heart Rate</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.heartRate || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">Respiratory Rate</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.respiratoryRate || "—"}
						</div>
					</Field>
				</div>
				<div className="flex gap-4 mx-3">
					<Field>
						<FieldLabel className="font-semibold">
							Blood Pressure Systolic
						</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.bloodPressureSystolic || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">
							Blood Pressure Diastolic
						</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.bloodPressureDiastolic || "—"}
						</div>
					</Field>
				</div>
				<div className="flex gap-4 mx-3">
					<Field>
						<FieldLabel className="font-semibold">Blood Sugar</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.bloodSugar || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">SpO2</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.spo2 || "—"}
						</div>
					</Field>
					<Field>
						<FieldLabel className="font-semibold">Weight</FieldLabel>
						<div className="border rounded-md bg-muted text-sm px-2 py-1">
							{caseDetail?.weight || "—"}
						</div>
					</Field>
				</div>
			</Card>
			<div className="grid grid-cols-3 mb-2">
				<Card className="col-span-1 row-span-2 rounded-r-none rounded-bl-none px-2 pt-4 pb-2">
					<Label className="font-semibold text-lg">Consultation Notes</Label>
					<Textarea
						className="h-full -mt-3.5 resize-none"
						placeholder="Write notes here..."
					/>
				</Card>
				<Card className="col-span-2 row-span-1 rounded-l-none rounded-br-none min-h-52 gap-2">
					<div className="flex items-center w-full gap-2 px-2">
						<Label className="font-semibold">Diagnosis: </Label>
						<Popover
							open={diseasesSearchOpen}
							onOpenChange={setDiseasesSearchOpen}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className="justify-between w-[48rem]"
								>
									Select a disease...
									<ChevronsUpDown className="ml-2 h-4 w-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="p-0 w-[48rem]"
								align="start"
								side="top"
							>
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Type a disease to search..."
										value={diagnosisQuery}
										onValueChange={setDiagnosisQuery}
									/>
									<CommandList>
										<CommandEmpty>No diseases found.</CommandEmpty>
										<CommandGroup heading="Diseases">
											{filteredDiseases.map(({ disease }) => (
												<CommandItem
													key={disease.id}
													onSelect={() => {
														handleAddDisease(disease);
														setDiseasesSearchOpen(false);
													}}
													className="flex justify-between"
												>
													<span>
														{disease.name} (ICD: {disease.icd})
													</span>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					{diagnosisItems.length > 0 &&
						diagnosisItems.map((item) => (
							<div key={item.id} className="px-2">
								<div className="w-full flex flex-wrap gap-2">
									<span className="font-medium">
										{item.name}
									</span>
									<span className="font-medium text-muted-foreground">
										(ICD: {item.icd})
									</span>
									<Button
										variant="destructive"
										onClick={() => handleRemoveDiagnosisItem(item.id)}
										className="h-6 w-6"
									>
										<Trash2/>
								</Button>
								</div>
							</div>
						))}
				</Card>
				<Card className="col-span-2 gap-4 row-span-1 rounded-none min-h-52">
					<div className="flex items-center w-full gap-2 px-2">
						<Label className="font-semibold">Prescription: </Label>
						<Popover
							open={medicinesSearchOpen}
							onOpenChange={setMedicinesSearchOpen}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className="justify-between w-[48rem]"
								>
									Select a medicine...
									<ChevronsUpDown className="ml-2 h-4 w-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="p-0 w-[48rem]"
								align="start"
								side="top"
							>
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Type a medicine to search..."
										value={prescriptionQuery}
										onValueChange={setPrescriptionQuery}
									/>
									<CommandList>
										<CommandEmpty>No medicines found.</CommandEmpty>
										<CommandGroup heading="Medicines">
											{filteredMedicines.map(({ medicine }) => (
												<CommandItem
													key={medicine.id}
													onSelect={() => {
														handleAddMedicine(medicine); //chekc by brand instead of drug name
														setMedicinesSearchOpen(false);
													}}
													className="flex justify-between"
												>
													<span>
														{medicine.company} {medicine.brand}
													</span>
													<span className="mx-1 text-muted-foreground text-right">
														({medicine.drug}) - {medicine.strength} -{" "}
														{medicine.type}
													</span>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					{prescriptionItems.length > 0 &&
						prescriptionItems.map((item) => (
							<div key={item.id} className="px-2">
								<div className="w-full pb-1 flex flex-wrap">
									<span className="font-semibold">
										{item.company} {item.brand}
									</span>
									<span className="mx-1 text-muted-foreground text-right">
										({item.drug}) - {item.strength} - {item.type}
									</span>
								</div>
								<div className="gap-2 flex">
									<div className="grid grid-cols-4 gap-2 w-full">
										<Input
											value={item.dosage}
											onChange={(e) =>
												handleUpdatePrescriptionItem(
													item.id,
													"dosage",
													e.target.value,
												)
											}
											placeholder="e.g., 500mg"
											className="h-8"
										/>
										<Input
											value={item.frequency}
											onChange={(e) =>
												handleUpdatePrescriptionItem(
													item.id,
													"frequency",
													e.target.value,
												)
											}
											placeholder="e.g., 2x daily"
											className="h-8"
										/>
										<Input
											value={item.duration}
											onChange={(e) =>
												handleUpdatePrescriptionItem(
													item.id,
													"duration",
													e.target.value,
												)
											}
											placeholder="e.g., 7 days"
											className="h-8"
										/>
										<Input
											value={item.comments}
											onChange={(e) =>
												handleUpdatePrescriptionItem(
													item.id,
													"comments",
													e.target.value,
												)
											}
											placeholder="Optional notes"
											className="h-8"
										/>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => handleRemovePrescriptionItem(item.id)}
										className="h-8 w-8 p-0"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
				</Card>
				<Card className="col-span-4 row-span-1 rounded-tr-none rounded-tl-none py-2 px-2">
					<div className="flex justify-end gap-2">
						<Button variant="outline">Request Lab Tests</Button>
						<ButtonGroup>
							<Button variant="outline" onClick={handleFinalize}>
								{finalizeButtonValue}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline">
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => setFinalizeButtonValue("Finalize (OPD)")}
									>
										Finalise (OPD)
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setFinalizeButtonValue("Admit")}
									>
										Admit
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setFinalizeButtonValue("Referral")}
									>
										Referral
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</ButtonGroup>
					</div>
				</Card>
			</div>
		</div>
	);
}
