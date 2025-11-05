import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { client } from "./api/$";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Search, ChevronDown } from "lucide-react";
import { Label } from "@radix-ui/react-label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";

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

		return { user, caseDetail, medicines };
	},
	component: ConsultationPage,
});

function ConsultationPage() {
	const { user, caseDetail, medicines } = Route.useLoaderData();
	const medicinesTypes = [...new Set(medicines.map((m) => m.type))].sort();
	const { id } = Route.useParams();
	const [prescriptionQuery, setPrescriptionQuery] = useState<string>("");
	const [medicineTypeValue, setMedicineTypeValue] = useState<string>("Type");
	const [finalizeButtonValue, setFinalizeButtonValue] = useState<
		"Finalize (OPD)" | "Admit" | "Referral"
	>("Finalize (OPD)");
	const [medicinesSearchOpen, setmedicinesSearchOpen] =
		useState<boolean>(false);

	const filteredMedicines = medicines.filter((m) => {
		const matchesType =
			medicineTypeValue === "Type" || m.type === medicineTypeValue;

		const matchesQuery =
			prescriptionQuery === "" ||
			m.drug.toLowerCase().includes(prescriptionQuery.toLowerCase()) ||
			m.brand.toLowerCase().includes(prescriptionQuery.toLowerCase());

		return matchesType && matchesQuery;
	});

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
		try {
			const res = await (
				await client.api.doctor.updateCaseFinalizedState.$post({
					json: {
						caseId: Number(id),
						finalizedState: finalizedState,
					},
				})
			).json();
			if ("error" in res) {
				alert(res.error);
			}
		} catch (err) {
			console.error(err);
		}
	}

	return (
		<div className="container p-6">
			<h1 className="text-3xl font-bold">
				Consultation for {caseDetail.patientName}
			</h1>
			<p className="text-muted-foreground my-2">Case ID: {id}</p>
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
			<div className="grid grid-cols-4 mb-2">
				<Card className="col-span-3 row-span-1 rounded-tr-none rounded-br-none rounded-bl-none min-h-[200px]">
					<div className="flex items-center max-w-xl">
						<Label className="font-semibold mx-3">Diagnosis: </Label>
						<div className="relative w-full">
							<Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
							<Input placeholder="Search..." className="pl-8" />
						</div>
						<Button className="mx-3">Search</Button>
					</div>
				</Card>
				<Card className="col-span-1 row-span-2 rounded-tl-none rounded-bl-none rounded-br-none px-2 pt-4 pb-2">
					<Label className="font-semibold text-lg">Consultation Notes</Label>
					<Textarea
						className="h-full -mt-3.5 resize-none"
						placeholder="Write notes here..."
					/>
				</Card>
				<Card className="col-span-3 row-span-1 rounded-none min-h-[200px]">
					<div className="flex items-center max-w-xl">
						<Label className="font-semibold mx-3">Prescription: </Label>
						<Popover
							open={medicinesSearchOpen}
							onOpenChange={setmedicinesSearchOpen}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className="w-[300px] justify-between"
								>
									{prescriptionQuery
										? filteredMedicines.find(
												(m) => m.drug === prescriptionQuery,
											)?.brand
										: "Select a medicine..."}
									<ChevronsUpDown className="ml-2 h-4 w-4" />
								</Button>
							</PopoverTrigger>

							<PopoverContent className="w-[300px] p-0">
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Type a medicine to search..."
										value={prescriptionQuery}
										onValueChange={setPrescriptionQuery}
									/>
									<CommandList>
										<CommandEmpty>No medicines found.</CommandEmpty>
										<CommandGroup heading="Medicines">
											{filteredMedicines.map((m) => (
												<CommandItem
													key={`${m.drug}-${m.brand}-${m.type}`}
													onSelect={() => {
														setPrescriptionQuery(m.drug);
														setmedicinesSearchOpen(false);
													}}
												>
													{m.brand}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						<ButtonGroup>
							<Button variant="outline" className="flex items-center gap-2">
								{medicineTypeValue}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline">
										<ChevronDown />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{medicinesTypes.map((m) => (
										<DropdownMenuItem
											key={m}
											onClick={() => setMedicineTypeValue(m)}
										>
											{m}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</ButtonGroup>
					</div>
				</Card>
				<Card className="col-span-4 row-span-1 rounded-tr-none rounded-tl-none py-2 px-2">
					<div className="flex justify-end">
						<ButtonGroup>
							<Button variant="outline">Request Lab Tests</Button>
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
