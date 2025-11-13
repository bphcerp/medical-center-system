import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronsUpDown, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import TopBar from "@/components/topbar";
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
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { type LabReportType, labReportTypes } from "@/db/lab";
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

	const [diseasesSearchOpen, setDiseasesSearchOpen] = useState<boolean>(false);

	const filteredDiseases = useMemo(
		() =>
			diseases
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
				.sort((a, b) => b.count - a.count),
		[diseases, diagnosisQuery],
	);

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

	const [labTestModalOpen, setLabTestModalOpen] = useState<boolean>(false);
	const [selectedLabTests, setSelectedLabTests] = useState<Set<LabReportType>>(
		new Set(),
	);
	const medicationListRef = useRef(null);
	const diseaseListRef = useRef(null);
	const availableLabTests = labReportTypes;

	const filteredMedicines = useMemo(
		() =>
			medicines
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
				.sort((a, b) => b.count - a.count),
		[medicines, prescriptionQuery],
	);

	const medicationRowVirtualizer = useVirtualizer({
		count: filteredMedicines.length,
		getScrollElement: () => medicationListRef.current,
		estimateSize: () => 48,
		overscan: 15,
		initialOffset: 0,
	});
	const diseaseRowVirtualizer = useVirtualizer({
		count: filteredDiseases.length,
		getScrollElement: () => diseaseListRef.current,
		estimateSize: () => 48,
		overscan: 15,
		initialOffset: 0,
	});

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

	const handleToggleLabTest = (test: LabReportType) => {
		const newSelected = new Set(selectedLabTests);
		if (newSelected.has(test)) {
			newSelected.delete(test);
		} else {
			newSelected.add(test);
		}
		setSelectedLabTests(newSelected);
	};

	const handleRequestLabTests = async () => {
		if (selectedLabTests.size === 0) {
			alert("Please select at least one lab test");
			return;
		}

		const tests = Array.from(selectedLabTests);
		const res = await client.api.doctor.requestLabTests.$post({
			json: {
				caseId: Number(id),
				tests,
			},
		});

		if (res.status !== 200) {
			const error = await res.json();
			alert("error" in error ? error.error : "Failed to request lab tests");
			return;
		}

		alert("Lab tests requested successfully");
		setLabTestModalOpen(false);
		setSelectedLabTests(new Set());
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
		<>
			<TopBar title={`Consultation for ${caseDetail.patientName}`} />
			<div className="p-6">
				<h1 className="text-3xl font-bold">
					Consultation for {caseDetail.patientName}
				</h1>
				<p className="text-muted-foreground my-2">
					Token Number: {caseDetail.token}
				</p>

				<Dialog open={labTestModalOpen} onOpenChange={setLabTestModalOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Request Lab Tests</DialogTitle>
						</DialogHeader>
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">
								Select the lab tests to request:
							</p>
							{availableLabTests.map((test) => (
								// biome-ignore lint/a11y/noStaticElementInteractions: TODO: replace this with a checkbox-like element to improve accessibility
								// biome-ignore lint/a11y/useKeyWithClickEvents: see above TODO
								<div
									key={test}
									className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent"
									onClick={() => handleToggleLabTest(test)}
								>
									<div
										className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
											selectedLabTests.has(test)
												? "bg-primary border-primary"
												: "border-muted-foreground"
										}`}
									>
										{selectedLabTests.has(test) && (
											<div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
										)}
									</div>
									<span>{test}</span>
								</div>
							))}
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setLabTestModalOpen(false)}
							>
								Cancel
							</Button>
							<Button onClick={handleRequestLabTests}>Submit</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

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
							<FieldLabel className="font-semibold">
								Body Temperature
							</FieldLabel>
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
							<FieldLabel className="font-semibold">
								Respiratory Rate
							</FieldLabel>
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
										className="justify-between w-3xl"
									>
										Select a disease...
										<ChevronsUpDown className="ml-2 h-4 w-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0 w-3xl" align="start" side="top">
									<Command shouldFilter={false}>
										<CommandInput
											placeholder="Type a disease to search..."
											value={diagnosisQuery}
											onValueChange={setDiagnosisQuery}
										/>
										<CommandList ref={diseaseListRef}>
											<div
												style={{
													height:
														diseaseRowVirtualizer.getTotalSize() > 0
															? `${diseaseRowVirtualizer.getTotalSize()}px`
															: "auto",
												}}
												className="relative w-full"
											>
												<CommandEmpty>No diseases found.</CommandEmpty>
												<CommandGroup>
													{diseaseRowVirtualizer
														.getVirtualItems()
														.map((virtualItem) => {
															const disease =
																filteredDiseases[virtualItem.index].disease;
															return (
																<CommandItem
																	key={virtualItem.key}
																	onSelect={() => {
																		handleAddDisease(disease);
																		setDiseasesSearchOpen(false);
																	}}
																	className="flex absolute top-0 left-0 w-full justify-between"
																	style={{
																		height: `${virtualItem.size}px`,
																		transform: `translateY(${virtualItem.start}px)`,
																	}}
																>
																	<span>
																		{disease.name} (ICD: {disease.icd})
																	</span>
																</CommandItem>
															);
														})}
												</CommandGroup>
											</div>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
						{diagnosisItems.length > 0 &&
							diagnosisItems.map((item) => (
								<div key={item.id} className="px-2">
									<div className="w-full flex flex-wrap gap-2">
										<span className="font-medium">{item.name}</span>
										<span className="font-medium text-muted-foreground">
											(ICD: {item.icd})
										</span>
										<Button
											variant="destructive"
											onClick={() => handleRemoveDiagnosisItem(item.id)}
											className="h-6 w-6"
										>
											<Trash2 />
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
										className="justify-between w-3xl"
									>
										Select a medicine...
										<ChevronsUpDown className="ml-2 h-4 w-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0 w-3xl" align="start" side="top">
									<Command shouldFilter={false}>
										<CommandInput
											placeholder="Type a medicine to search..."
											value={prescriptionQuery}
											onValueChange={setPrescriptionQuery}
										/>
										<CommandList ref={medicationListRef}>
											<div
												style={{
													height:
														medicationRowVirtualizer.getTotalSize() > 0
															? `${medicationRowVirtualizer.getTotalSize()}px`
															: "auto",
												}}
												className="relative w-full"
											>
												<CommandEmpty>No medicines found.</CommandEmpty>
												{medicationRowVirtualizer
													.getVirtualItems()
													.map((virtualItem) => {
														const medicine =
															filteredMedicines[virtualItem.index].medicine;
														return (
															<CommandItem
																key={virtualItem.key}
																onSelect={() => {
																	handleAddMedicine(medicine); //check by brand instead of drug name
																	setMedicinesSearchOpen(false);
																}}
																className="flex absolute top-0 left-0 w-full justify-between"
																style={{
																	height: `${virtualItem.size}px`,
																	transform: `translateY(${virtualItem.start}px)`,
																}}
															>
																<span>
																	{medicine.company} {medicine.brand}
																</span>
																<span className="mx-1 text-muted-foreground text-right">
																	({medicine.drug}) - {medicine.strength} -{" "}
																	{medicine.type}
																</span>
															</CommandItem>
														);
													})}
											</div>
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
							<Button
								variant="outline"
								onClick={() => setLabTestModalOpen(true)}
							>
								Request Lab Tests
							</Button>
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
		</>
	);
}
