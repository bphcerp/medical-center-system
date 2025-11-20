import { Label } from "@radix-ui/react-label";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
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
import DurationInput from "./duration-input";
import type {
	MedicineItem,
	PrescriptionItem,
} from "./prescription-frequency-selector";
import PrescriptionFrequencySelector from "./prescription-frequency-selector";

const PrescriptionCard = ({
	medicines,
	prescriptionItems,
	setPrescriptionItems,
}: {
	medicines: MedicineItem[];
	prescriptionItems: PrescriptionItem[];
	setPrescriptionItems: (items: PrescriptionItem[]) => void;
}) => {
	const [medicinesSearchOpen, setMedicinesSearchOpen] =
		useState<boolean>(false);
	const [prescriptionQuery, setPrescriptionQuery] = useState<string>("");

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
	const medicationListRef = useRef(null);
	const medicationRowVirtualizer = useVirtualizer({
		count: filteredMedicines.length,
		getScrollElement: () => medicationListRef.current,
		estimateSize: () => 48,
		overscan: 15,
		initialOffset: 0,
	});

	const handleUpdatePrescriptionItem = (
		id: number,
		field: keyof Omit<
			PrescriptionItem["case_prescriptions"],
			"id" | "medicine"
		>,
		value: string | PrescriptionItem["case_prescriptions"]["categoryData"],
	) => {
		setPrescriptionItems(
			prescriptionItems.map((item) =>
				item.medicines.id === id
					? {
							...item,
							case_prescriptions: {
								...item.case_prescriptions,
								[field]: value,
							},
						}
					: item,
			),
		);
	};

	const handleRemovePrescriptionItem = (id: number) => {
		setPrescriptionItems(
			prescriptionItems.filter((item) => item.medicines.id !== id),
		);
	};

	const handleAddMedicine = (medicine: (typeof medicines)[0]) => {
		//heck if medicine already exists in the prescription
		if (prescriptionItems.some((item) => item.medicines.id === medicine.id)) {
			alert("This medicine is already in the prescription");
			return;
		}

		const newItem: PrescriptionItem = {
			medicines: medicine,
			case_prescriptions: {
				dosage: "",
				frequency: "",
				duration: "",
				durationUnit: "days",
				categoryData:
					medicine.category === "Capsule/Tablet"
						? {
								mealTiming: "Before Meal",
								category: "Capsule/Tablet",
							}
						: medicine.category === "External Application"
							? {
									applicationArea: "",
									category: "External Application",
								}
							: medicine.category === "Injection"
								? {
										injectionRoute: "Intravenous (IV)",
										category: "Injection",
									}
								: medicine.category === "Liquids/Syrups"
									? {
											liquidTiming: "Before Meal",
											category: "Liquids/Syrups",
										}
									: null,
				comment: "",
			},
		};
		setPrescriptionItems([...prescriptionItems, newItem]);
		setPrescriptionQuery("");
	};

	return (
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
			{prescriptionItems.length > 0 ? (
				prescriptionItems.map((item) => (
					<div key={item.medicines.id} className="px-2">
						<div className="w-full pb-1 flex flex-wrap items-center gap-2">
							<span className="font-semibold">
								{item.medicines.company} {item.medicines.brand}
							</span>
							<span className="text-muted-foreground text-sm">
								({item.medicines.drug}) - {item.medicines.strength}
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
								{item.medicines.type}
							</span>
						</div>
						<div className="gap-0.5 flex">
							{item.case_prescriptions.categoryData?.category ===
								"Capsule/Tablet" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
									<Select
										value={item.case_prescriptions.dosage}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"dosage",
												value,
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-20">
											<SelectValue placeholder="Dosage" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1/4 tablet">1/4 tablet</SelectItem>
											<SelectItem value="1/2 tablet">1/2 tablet</SelectItem>
											<SelectItem value="1 tablet">1 tablet</SelectItem>
											<SelectItem value="2 tablets">2 tablets</SelectItem>
										</SelectContent>
									</Select>
									<PrescriptionFrequencySelector
										item={item}
										handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
									/>
									<Select
										value={item.case_prescriptions.categoryData.mealTiming}
										onValueChange={(value: "Before Meal" | "After Meal") =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"categoryData",
												{ category: "Capsule/Tablet", mealTiming: value },
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Meal Timing" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Before Meal">Before meal</SelectItem>
											<SelectItem value="After Meal">After meal</SelectItem>
										</SelectContent>
									</Select>
									<DurationInput
										duration={item.case_prescriptions.duration}
										durationUnit={item.case_prescriptions.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"duration",
												value,
											)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"durationUnit",
												value,
											)
										}
									/>
									<Input
										value={item.case_prescriptions.comment || ""}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"comment",
												e.target.value,
											)
										}
										placeholder="Notes"
										className="h-10 flex-1 min-w-[120px]"
									/>
								</div>
							)}
							{item.case_prescriptions.categoryData?.category ===
								"External Application" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
									<Select
										value={item.case_prescriptions.dosage}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"dosage",
												value,
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Amount" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Thin layer">Thin layer</SelectItem>
											<SelectItem value="Thick layer">Thick layer</SelectItem>
											<SelectItem value="Pea-sized">Pea-sized</SelectItem>
											<SelectItem value="Coin-sized">Coin-sized</SelectItem>
											<SelectItem value="As needed">As needed</SelectItem>
										</SelectContent>
									</Select>
									<PrescriptionFrequencySelector
										item={item}
										handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
									/>
									<DurationInput
										duration={item.case_prescriptions.duration}
										durationUnit={item.case_prescriptions.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"duration",
												value,
											)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"durationUnit",
												value,
											)
										}
									/>
									<Input
										value={item.case_prescriptions.categoryData.applicationArea}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"categoryData",
												{
													category: "External Application",
													applicationArea: e.target.value,
												},
											)
										}
										placeholder="Application area"
										className="h-10 flex-1 min-w-[120px]"
									/>
									<Input
										value={item.case_prescriptions.comment || ""}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"comment",
												e.target.value,
											)
										}
										placeholder="Notes"
										className="h-10 flex-1 min-w-[120px]"
									/>
								</div>
							)}
							{item.case_prescriptions.categoryData?.category ===
								"Injection" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
									<Input
										value={item.case_prescriptions.dosage}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"dosage",
												e.target.value,
											)
										}
										placeholder="Dosage (mg/mL/units)"
										className="h-10 flex-1 min-w-[120px]"
									/>
									<PrescriptionFrequencySelector
										item={item}
										handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
									/>
									<DurationInput
										duration={item.case_prescriptions.duration}
										durationUnit={item.case_prescriptions.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"duration",
												value,
											)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"durationUnit",
												value,
											)
										}
									/>
									<Select
										value={item.case_prescriptions.categoryData.injectionRoute}
										onValueChange={(
											value:
												| "Subcutaneous (SC)"
												| "Intramuscular (IM)"
												| "Intravenous (IV)",
										) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"categoryData",
												{ category: "Injection", injectionRoute: value },
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[120px]">
											<SelectValue placeholder="Route" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Subcutaneous (SC)">
												Subcutaneous (SC)
											</SelectItem>
											<SelectItem value="Intramuscular (IM)">
												Intramuscular (IM)
											</SelectItem>
											<SelectItem value="Intravenous (IV)">
												Intravenous (IV)
											</SelectItem>
										</SelectContent>
									</Select>
									<Input
										value={item.case_prescriptions.comment || ""}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"comment",
												e.target.value,
											)
										}
										placeholder="Notes"
										className="h-10 flex-1 min-w-[120px]"
									/>
								</div>
							)}
							{item.case_prescriptions.categoryData?.category ===
								"Liquids/Syrups" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
									<Input
										value={item.case_prescriptions.dosage}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"dosage",
												e.target.value,
											)
										}
										placeholder="Dosage (mL/teaspoon/mg)"
										className="h-10 flex-1 min-w-[120px]"
									/>
									<PrescriptionFrequencySelector
										item={item}
										handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
									/>
									<Select
										value={item.case_prescriptions.categoryData.liquidTiming}
										onValueChange={(value: "Before Meal" | "After Meal") =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"categoryData",
												{ category: "Liquids/Syrups", liquidTiming: value },
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Meal Timing" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Before Meal">Before meal</SelectItem>
											<SelectItem value="After Meal">After meal</SelectItem>
										</SelectContent>
									</Select>
									<DurationInput
										duration={item.case_prescriptions.duration}
										durationUnit={item.case_prescriptions.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"duration",
												value,
											)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"durationUnit",
												value,
											)
										}
									/>
									<Input
										value={item.case_prescriptions.comment || ""}
										onChange={(e) =>
											handleUpdatePrescriptionItem(
												item.medicines.id,
												"comment",
												e.target.value,
											)
										}
										placeholder="Notes"
										className="h-10 flex-1 min-w-[120px]"
									/>
								</div>
							)}
							<Button
								variant="destructive"
								size="sm"
								onClick={() => handleRemovePrescriptionItem(item.medicines.id)}
								className="h-10 w-10 p-0"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))
			) : (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					No prescription recorded
				</div>
			)}
		</Card>
	);
};

export default PrescriptionCard;
export * from "./prescription-frequency-selector";
