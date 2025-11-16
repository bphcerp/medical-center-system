import { Label } from "@radix-ui/react-label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronsUpDown, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { medicineCategories } from "@/db/case";
import { client } from "./api/$";

type PrescriptionItem = {
	id: number;
	drug: string;
	brand: string;
	company: string;
	strength: string;
	type: string;
	category: (typeof medicineCategories)[number];
	dosage: string;
	frequency: string;
	duration: string;
	durationUnit?: string;
	comments: string;
	mealTiming?: string;
	applicationArea?: string;
	injectionRoute?: string;
	liquidTiming?: string;
};

function DurationInput({
	duration,
	durationUnit,
	onDurationChange,
	onDurationUnitChange,
}: {
	duration: string;
	durationUnit?: string;
	onDurationChange: (value: string) => void;
	onDurationUnitChange: (value: string) => void;
}) {
	return (
		<>
			<Input
				value={duration}
				onChange={(e) => onDurationChange(e.target.value)}
				placeholder="0"
				className="h-10 w-15"
			/>
			<Select
				value={durationUnit || "days"}
				onValueChange={onDurationUnitChange}
			>
				<SelectTrigger className="h-10 w-24">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="days">days</SelectItem>
					<SelectItem value="weeks">weeks</SelectItem>
					<SelectItem value="months">months</SelectItem>
				</SelectContent>
			</Select>
		</>
	);
}

type DiagnosisItem = {
	id: number;
	name: string;
	icd: string;
};

export const Route = createFileRoute("/consultation/$id")({
	loader: async ({ params }: { params: { id: string } }) => {
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

	const [diagnosisQuery, setDiagnosisQuery] = useState("");
	const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([]);
	const [diseasesSearchOpen, setDiseasesSearchOpen] = useState(false);

	const [prescriptionQuery, setPrescriptionQuery] = useState("");
	const [medicinesSearchOpen, setMedicinesSearchOpen] = useState(false);
	const [prescriptionItems, setPrescriptionItems] = useState<
		PrescriptionItem[]
	>([]);

	const [labTestModalOpen, setLabTestModalOpen] = useState(false);
	const [selectedLabTests, setSelectedLabTests] = useState<Set<number>>(
		new Set(),
	);
	const [availableTests, setAvailableTests] = useState<
		Array<{
			id: number;
			name: string;
			description: string | null;
			category: string | null;
		}>
	>([]);

	const medicationListRef = useRef<HTMLDivElement>(null);
	const diseaseListRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		async function fetchTests() {
			const res = await client.api.doctor.tests.$get();
			if (res.ok) {
				const data = await res.json();
				setAvailableTests(data.tests);
			}
		}
		fetchTests();
	}, []);

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
			category: medicine.category,
			dosage: "",
			frequency: "",
			duration: "",
			comments: "",
			...(medicine.category === "Capsule/Tablet"
				? { mealTiming: "", durationUnit: "days" }
				: {}),
			...(medicine.category === "External Application"
				? { applicationArea: "", durationUnit: "days" }
				: {}),
			...(medicine.category === "Injection"
				? { injectionRoute: "", durationUnit: "days" }
				: {}),
			...(medicine.category === "Liquids/Syrups"
				? { liquidTiming: "", durationUnit: "days" }
				: {}),
		};
		setPrescriptionItems([...prescriptionItems, newItem]);
		setPrescriptionQuery("");
	};

	const handleUpdatePrescriptionItem = (
		id: number,
		field: keyof Omit<
			PrescriptionItem,
			"id" | "drug" | "brand" | "company" | "strength" | "type"
		>,
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

	const handleToggleLabTest = (testId: number) => {
		const newSelected = new Set(selectedLabTests);
		if (newSelected.has(testId)) {
			newSelected.delete(testId);
		} else {
			newSelected.add(testId);
		}
		setSelectedLabTests(newSelected);
	};

	const handleRequestLabTests = async () => {
		if (selectedLabTests.size === 0) {
			alert("Please select at least one lab test");
			return;
		}

		const testIds = Array.from(selectedLabTests);
		const res = await client.api.doctor.requestLabTests.$post({
			json: {
				caseId: Number(id),
				testIds,
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
			<>
				<TopBar title="Consultation Page" />
				<div className="container mx-auto p-6">
					<Card className="p-6">
						<p className="text-muted-foreground">Case ID: {id}</p>
						<p className="text-muted-foreground">
							No consultation details found for this case.
						</p>
					</Card>
				</div>
			</>
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
					dosage:
						item.category === "Capsule/Tablet" && item.dosage
							? `${item.dosage} tablet${item.dosage === "1" ? "" : "s"}`
							: item.dosage,
					frequency: item.frequency,
					duration:
						(item.category === "Capsule/Tablet" ||
							item.category === "External Application" ||
							item.category === "Injection" ||
							item.category === "Liquids/Syrups") &&
						item.duration &&
						item.durationUnit
							? `${item.duration} ${item.durationUnit}`
							: item.duration,
					comment: item.comments,
					categoryData:
						item.category === "Capsule/Tablet" && item.mealTiming
							? { mealTiming: item.mealTiming }
							: item.category === "External Application" && item.applicationArea
								? { applicationArea: item.applicationArea }
								: item.category === "Injection" && item.injectionRoute
									? { injectionRoute: item.injectionRoute }
									: item.category === "Liquids/Syrups" && item.liquidTiming
										? { liquidTiming: item.liquidTiming }
										: undefined,
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

			<Dialog open={labTestModalOpen} onOpenChange={setLabTestModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request Lab Tests</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Select the lab tests to request:
						</p>
						{availableTests.map((test) => (
							<div
								key={test.id}
								className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent"
								onClick={() => handleToggleLabTest(test.id)}
							>
								<div
									className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
										selectedLabTests.has(test.id)
											? "bg-primary border-primary"
											: "border-muted-foreground"
									}`}
								>
									{selectedLabTests.has(test.id) && (
										<div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
									)}
								</div>
								<div>
									<div className="font-medium">{test.name}</div>
									{test.description && (
										<div className="text-sm text-muted-foreground">
											{test.description}
										</div>
									)}
								</div>
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

			<div className="container mx-auto p-6 space-y-6">
				<Card className="p-6">
					<h2 className="text-lg font-semibold mb-4">Patient Details</h2>
					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label className="text-muted-foreground">Token Number</Label>
							<div className="font-medium">{caseDetail.token}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Patient Name</Label>
							<div className="font-medium">
								{caseDetail?.patientName || "—"}
							</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Age</Label>
							<div className="font-medium">{caseDetail?.patientAge || "—"}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">ID/PSRN</Label>
							<div className="font-medium">{caseDetail?.identifier || "—"}</div>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<h2 className="text-lg font-semibold mb-4">Vitals</h2>
					<div className="grid grid-cols-4 gap-4">
						<div>
							<Label className="text-muted-foreground">Temperature</Label>
							<div className="font-medium">
								{caseDetail?.temperature || "—"}
							</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Heart Rate</Label>
							<div className="font-medium">{caseDetail?.heartRate || "—"}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Respiratory Rate</Label>
							<div className="font-medium">
								{caseDetail?.respiratoryRate || "—"}
							</div>
						</div>
						<div>
							<Label className="text-muted-foreground">BP Systolic</Label>
							<div className="font-medium">
								{caseDetail?.bloodPressureSystolic || "—"}
							</div>
						</div>
						<div>
							<Label className="text-muted-foreground">BP Diastolic</Label>
							<div className="font-medium">
								{caseDetail?.bloodPressureDiastolic || "—"}
							</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Blood Sugar</Label>
							<div className="font-medium">{caseDetail?.bloodSugar || "—"}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">SpO2</Label>
							<div className="font-medium">{caseDetail?.spo2 || "—"}</div>
						</div>
						<div>
							<Label className="text-muted-foreground">Weight</Label>
							<div className="font-medium">{caseDetail?.weight || "—"}</div>
						</div>
					</div>
				</Card>

				<Card className="p-6 space-y-4">
					<h2 className="text-lg font-semibold">Clinical Examination</h2>

					<div>
						<FieldLabel>Diagnosis:</FieldLabel>
						<Popover
							open={diseasesSearchOpen}
							onOpenChange={setDiseasesSearchOpen}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className="w-full justify-between"
								>
									Select a disease...
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0">
								<Command>
									<CommandInput
										placeholder="Search diseases..."
										value={diagnosisQuery}
										onValueChange={setDiagnosisQuery}
									/>
									<CommandList
										ref={diseaseListRef}
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
															key={disease.id}
															value={disease.name}
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
															{disease.name} (ICD: {disease.icd})
														</CommandItem>
													);
												})}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						{diagnosisItems.length > 0 &&
							diagnosisItems.map((item) => (
								<div
									key={item.id}
									className="flex items-center justify-between border rounded-md p-2 mt-2"
								>
									<span>
										{item.name} (ICD: {item.icd})
									</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveDiagnosisItem(item.id)}
										className="h-6 w-6"
									>
										<Trash2 />
									</Button>
								</div>
							))}
					</div>

					<div>
						<FieldLabel>Prescription:</FieldLabel>
						<Popover
							open={medicinesSearchOpen}
							onOpenChange={setMedicinesSearchOpen}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className="w-full justify-between"
								>
									Select a medicine...
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0">
								<Command>
									<CommandInput
										placeholder="Search medicines..."
										value={prescriptionQuery}
										onValueChange={setPrescriptionQuery}
									/>
									<CommandList
										ref={medicationListRef}
										style={{
											height:
												medicationRowVirtualizer.getTotalSize() > 0
													? `${medicationRowVirtualizer.getTotalSize()}px`
													: "auto",
										}}
										className="relative w-full"
									>
										<CommandEmpty>No medicines found.</CommandEmpty>
										<CommandGroup>
											{medicationRowVirtualizer
												.getVirtualItems()
												.map((virtualItem) => {
													const medicine =
														filteredMedicines[virtualItem.index].medicine;
													return (
														<CommandItem
															key={medicine.id}
															value={`${medicine.company} ${medicine.brand}`}
															onSelect={() => {
																handleAddMedicine(medicine);
																setMedicinesSearchOpen(false);
															}}
															className="flex absolute top-0 left-0 w-full justify-between"
															style={{
																height: `${virtualItem.size}px`,
																transform: `translateY(${virtualItem.start}px)`,
															}}
														>
															{medicine.company} {medicine.brand} (
															{medicine.drug}) - {medicine.strength} -{" "}
															{medicine.type}
														</CommandItem>
													);
												})}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						{prescriptionItems.length > 0 &&
							prescriptionItems.map((item) => (
								<div
									key={item.id}
									className="border rounded-md p-4 mt-2 space-y-2"
								>
									<div className="font-medium">
										{item.company} {item.brand} ({item.drug}) - {item.strength}{" "}
										- {item.type}
									</div>
									<div className="grid grid-cols-4 gap-2">
										{item.category === "Capsule/Tablet" && (
											<>
												<Field>
													<FieldLabel>Dosage</FieldLabel>
													<Select
														value={item.dosage}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"dosage",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="1/4">1/4 tablet</SelectItem>
															<SelectItem value="1/2">1/2 tablet</SelectItem>
															<SelectItem value="1">1 tablet</SelectItem>
															<SelectItem value="2">2 tablets</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Frequency</FieldLabel>
													<Select
														value={item.frequency}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"frequency",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Once a day">
																Once a day
															</SelectItem>
															<SelectItem value="Twice a day">
																Twice a day
															</SelectItem>
															<SelectItem value="3 times a day">
																3 times a day
															</SelectItem>
															<SelectItem value="4 times a day">
																4 times a day
															</SelectItem>
															<SelectItem value="5 times a day">
																5 times a day
															</SelectItem>
															<SelectItem value="Alternate days">
																Alternate days
															</SelectItem>
															<SelectItem value="Once a week">
																Once a week
															</SelectItem>
															<SelectItem value="Twice a week">
																Twice a week
															</SelectItem>
															<SelectItem value="Thrice a week">
																Thrice a week
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Meal Timing</FieldLabel>
													<Select
														value={item.mealTiming}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"mealTiming",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Before meal">
																Before meal
															</SelectItem>
															<SelectItem value="After meal">
																After meal
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Duration</FieldLabel>
													<div className="flex gap-2">
														<DurationInput
															duration={item.duration}
															durationUnit={item.durationUnit}
															onDurationChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"duration",
																	value,
																)
															}
															onDurationUnitChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"durationUnit",
																	value,
																)
															}
														/>
													</div>
												</Field>
												<Field>
													<FieldLabel>Comments</FieldLabel>
													<Input
														value={item.comments}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"comments",
																e.target.value,
															)
														}
														placeholder="Notes"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
											</>
										)}

										{item.category === "External Application" && (
											<>
												<Field>
													<FieldLabel>Dosage</FieldLabel>
													<Select
														value={item.dosage}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"dosage",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Thin layer">
																Thin layer
															</SelectItem>
															<SelectItem value="Thick layer">
																Thick layer
															</SelectItem>
															<SelectItem value="Pea-sized">
																Pea-sized
															</SelectItem>
															<SelectItem value="Coin-sized">
																Coin-sized
															</SelectItem>
															<SelectItem value="As needed">
																As needed
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Frequency</FieldLabel>
													<Select
														value={item.frequency}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"frequency",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Once a day">
																Once a day
															</SelectItem>
															<SelectItem value="Twice a day">
																Twice a day
															</SelectItem>
															<SelectItem value="3 times a day">
																3 times a day
															</SelectItem>
															<SelectItem value="4 times a day">
																4 times a day
															</SelectItem>
															<SelectItem value="Alternate days">
																Alternate days
															</SelectItem>
															<SelectItem value="Once a week">
																Once a week
															</SelectItem>
															<SelectItem value="Twice a week">
																Twice a week
															</SelectItem>
															<SelectItem value="As needed">
																As needed
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Duration</FieldLabel>
													<div className="flex gap-2">
														<DurationInput
															duration={item.duration}
															durationUnit={item.durationUnit}
															onDurationChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"duration",
																	value,
																)
															}
															onDurationUnitChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"durationUnit",
																	value,
																)
															}
														/>
													</div>
												</Field>
												<Field>
													<FieldLabel>Application Area</FieldLabel>
													<Input
														value={item.applicationArea}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"applicationArea",
																e.target.value,
															)
														}
														placeholder="Application area"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
												<Field>
													<FieldLabel>Comments</FieldLabel>
													<Input
														value={item.comments}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"comments",
																e.target.value,
															)
														}
														placeholder="Notes"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
											</>
										)}

										{item.category === "Injection" && (
											<>
												<Field>
													<FieldLabel>Dosage</FieldLabel>
													<Input
														value={item.dosage}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"dosage",
																e.target.value,
															)
														}
														placeholder="Dosage (mg/mL/units)"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
												<Field>
													<FieldLabel>Frequency</FieldLabel>
													<Select
														value={item.frequency}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"frequency",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Once">Once</SelectItem>
															<SelectItem value="Twice daily">
																Twice daily
															</SelectItem>
															<SelectItem value="Three times daily">
																Three times daily
															</SelectItem>
															<SelectItem value="Every 6 hours">
																Every 6 hours
															</SelectItem>
															<SelectItem value="Every 8 hours">
																Every 8 hours
															</SelectItem>
															<SelectItem value="Every 12 hours">
																Every 12 hours
															</SelectItem>
															<SelectItem value="Alternate days">
																Alternate days
															</SelectItem>
															<SelectItem value="Once a week">
																Once a week
															</SelectItem>
															<SelectItem value="Twice a week">
																Twice a week
															</SelectItem>
															<SelectItem value="Thrice a week">
																Thrice a week
															</SelectItem>
															<SelectItem value="As needed">
																As needed
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Duration</FieldLabel>
													<div className="flex gap-2">
														<DurationInput
															duration={item.duration}
															durationUnit={item.durationUnit}
															onDurationChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"duration",
																	value,
																)
															}
															onDurationUnitChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"durationUnit",
																	value,
																)
															}
														/>
													</div>
												</Field>
												<Field>
													<FieldLabel>Injection Route</FieldLabel>
													<Select
														value={item.injectionRoute}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"injectionRoute",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="SC">
																Subcutaneous (SC)
															</SelectItem>
															<SelectItem value="IM">
																Intramuscular (IM)
															</SelectItem>
															<SelectItem value="IV">
																Intravenous (IV)
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Comments</FieldLabel>
													<Input
														value={item.comments}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"comments",
																e.target.value,
															)
														}
														placeholder="Notes"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
											</>
										)}

										{item.category === "Liquids/Syrups" && (
											<>
												<Field>
													<FieldLabel>Dosage</FieldLabel>
													<Input
														value={item.dosage}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"dosage",
																e.target.value,
															)
														}
														placeholder="Dosage (mL/teaspoon/mg)"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
												<Field>
													<FieldLabel>Frequency</FieldLabel>
													<Select
														value={item.frequency}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"frequency",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Once a day">
																Once a day
															</SelectItem>
															<SelectItem value="Twice a day">
																Twice a day
															</SelectItem>
															<SelectItem value="3 times a day">
																3 times a day
															</SelectItem>
															<SelectItem value="4 times a day">
																4 times a day
															</SelectItem>
															<SelectItem value="5 times a day">
																5 times a day
															</SelectItem>
															<SelectItem value="Alternate days">
																Alternate days
															</SelectItem>
															<SelectItem value="Once a week">
																Once a week
															</SelectItem>
															<SelectItem value="Twice a week">
																Twice a week
															</SelectItem>
															<SelectItem value="Thrice a week">
																Thrice a week
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Liquid Timing</FieldLabel>
													<Select
														value={item.liquidTiming}
														onValueChange={(value) =>
															handleUpdatePrescriptionItem(
																item.id,
																"liquidTiming",
																value,
															)
														}
													>
														<SelectTrigger className="h-10">
															<SelectValue placeholder="Select" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="Before meal">
																Before meal
															</SelectItem>
															<SelectItem value="After meal">
																After meal
															</SelectItem>
														</SelectContent>
													</Select>
												</Field>
												<Field>
													<FieldLabel>Duration</FieldLabel>
													<div className="flex gap-2">
														<DurationInput
															duration={item.duration}
															durationUnit={item.durationUnit}
															onDurationChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"duration",
																	value,
																)
															}
															onDurationUnitChange={(value) =>
																handleUpdatePrescriptionItem(
																	item.id,
																	"durationUnit",
																	value,
																)
															}
														/>
													</div>
												</Field>
												<Field>
													<FieldLabel>Comments</FieldLabel>
													<Input
														value={item.comments}
														onChange={(e) =>
															handleUpdatePrescriptionItem(
																item.id,
																"comments",
																e.target.value,
															)
														}
														placeholder="Notes"
														className="h-10 flex-1 min-w-[120px]"
													/>
												</Field>
											</>
										)}
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRemovePrescriptionItem(item.id)}
										className="h-10 w-10 p-0"
									>
										<Trash2 />
									</Button>
								</div>
							))}
					</div>

					<Button
						variant="outline"
						onClick={() => setLabTestModalOpen(true)}
						className="w-full"
					>
						Request Lab Tests
					</Button>

					<div className="flex gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button className="flex-1">
									{finalizeButtonValue}
									<ChevronDown className="ml-2 h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
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
						<Button onClick={handleFinalize}>Submit</Button>
					</div>
				</Card>
			</div>
		</>
	);
}
