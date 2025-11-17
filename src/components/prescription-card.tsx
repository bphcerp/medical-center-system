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
import type { medicineCategories } from "@/db/case";
import DurationInput from "./duration-input";

export type PrescriptionItem = {
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

const PrescriptionCard = ({
	medicines,
	prescriptionItems,
	setPrescriptionItems,
}: {
	medicines: {
		id: number;
		drug: string;
		brand: string;
		company: string;
		strength: string;
		type: string;
		category: (typeof medicineCategories)[number];
	}[];
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
			{prescriptionItems.length > 0 &&
				prescriptionItems.map((item) => (
					<div key={item.id} className="px-2">
						<div className="w-full pb-1 flex flex-wrap items-center gap-2">
							<span className="font-semibold">
								{item.company} {item.brand}
							</span>
							<span className="text-muted-foreground text-sm">
								({item.drug}) - {item.strength}
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
								{item.type}
							</span>
						</div>
						<div className="gap-0.5 flex">
							{item.category === "Capsule/Tablet" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
									<Select
										value={item.dosage}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "dosage", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-20">
											<SelectValue placeholder="Dosage" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1/4">1/4 tablet</SelectItem>
											<SelectItem value="1/2">1/2 tablet</SelectItem>
											<SelectItem value="1">1 tablet</SelectItem>
											<SelectItem value="2">2 tablets</SelectItem>
										</SelectContent>
									</Select>
									<Select
										value={item.frequency}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "frequency", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Frequency" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1">Once a day</SelectItem>
											<SelectItem value="2">Twice a day</SelectItem>
											<SelectItem value="3">3 times a day</SelectItem>
											<SelectItem value="4">4 times a day</SelectItem>
											<SelectItem value="5">5 times a day</SelectItem>
											<SelectItem value="alternate days">
												Alternate days
											</SelectItem>
											<SelectItem value="once a week">Once a week</SelectItem>
											<SelectItem value="twice a week">Twice a week</SelectItem>
											<SelectItem value="thrice a week">
												Thrice a week
											</SelectItem>
										</SelectContent>
									</Select>
									<Select
										value={item.mealTiming || ""}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "mealTiming", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Meal Timing" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="before">Before meal</SelectItem>
											<SelectItem value="after">After meal</SelectItem>
										</SelectContent>
									</Select>
									<DurationInput
										duration={item.duration}
										durationUnit={item.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "duration", value)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.id,
												"durationUnit",
												value,
											)
										}
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
										placeholder="Notes"
										className="h-10 flex-1 min-w-[120px]"
									/>
								</div>
							)}
							{item.category === "External Application" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
									<Select
										value={item.dosage}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "dosage", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Amount" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="thin layer">Thin layer</SelectItem>
											<SelectItem value="thick layer">Thick layer</SelectItem>
											<SelectItem value="pea-sized">Pea-sized</SelectItem>
											<SelectItem value="coin-sized">Coin-sized</SelectItem>
											<SelectItem value="as needed">As needed</SelectItem>
										</SelectContent>
									</Select>
									<Select
										value={item.frequency}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "frequency", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Frequency" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1">Once a day</SelectItem>
											<SelectItem value="2">Twice a day</SelectItem>
											<SelectItem value="3">3 times a day</SelectItem>
											<SelectItem value="4">4 times a day</SelectItem>
											<SelectItem value="alternate days">
												Alternate days
											</SelectItem>
											<SelectItem value="once a week">Once a week</SelectItem>
											<SelectItem value="twice a week">Twice a week</SelectItem>
											<SelectItem value="as needed">As needed</SelectItem>
										</SelectContent>
									</Select>
									<DurationInput
										duration={item.duration}
										durationUnit={item.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "duration", value)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.id,
												"durationUnit",
												value,
											)
										}
									/>
									<Input
										value={item.applicationArea || ""}
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
								</div>
							)}
							{item.category === "Injection" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
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
									<Select
										value={item.frequency}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "frequency", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Frequency" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="once">Once</SelectItem>
											<SelectItem value="twice daily">Twice daily</SelectItem>
											<SelectItem value="three times daily">
												Three times daily
											</SelectItem>
											<SelectItem value="every 6 hours">
												Every 6 hours
											</SelectItem>
											<SelectItem value="every 8 hours">
												Every 8 hours
											</SelectItem>
											<SelectItem value="every 12 hours">
												Every 12 hours
											</SelectItem>
											<SelectItem value="alternate days">
												Alternate days
											</SelectItem>
											<SelectItem value="once a week">Once a week</SelectItem>
											<SelectItem value="twice a week">Twice a week</SelectItem>
											<SelectItem value="thrice a week">
												Thrice a week
											</SelectItem>
											<SelectItem value="as needed">As needed</SelectItem>
										</SelectContent>
									</Select>
									<DurationInput
										duration={item.duration}
										durationUnit={item.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "duration", value)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.id,
												"durationUnit",
												value,
											)
										}
									/>
									<Select
										value={item.injectionRoute || ""}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(
												item.id,
												"injectionRoute",
												value,
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[120px]">
											<SelectValue placeholder="Route" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="subcutaneous">
												Subcutaneous (SC)
											</SelectItem>
											<SelectItem value="intramuscular">
												Intramuscular (IM)
											</SelectItem>
											<SelectItem value="intravenous">
												Intravenous (IV)
											</SelectItem>
										</SelectContent>
									</Select>
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
								</div>
							)}
							{item.category === "Liquids/Syrups" && (
								<div className="flex flex-wrap gap-2 items-center w-full">
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
									<Select
										value={item.frequency}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "frequency", value)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Frequency" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1">Once a day</SelectItem>
											<SelectItem value="2">Twice a day</SelectItem>
											<SelectItem value="3">3 times a day</SelectItem>
											<SelectItem value="4">4 times a day</SelectItem>
											<SelectItem value="5">5 times a day</SelectItem>
											<SelectItem value="alternate days">
												Alternate days
											</SelectItem>
											<SelectItem value="once a week">Once a week</SelectItem>
											<SelectItem value="twice a week">Twice a week</SelectItem>
											<SelectItem value="thrice a week">
												Thrice a week
											</SelectItem>
										</SelectContent>
									</Select>
									<Select
										value={item.liquidTiming || ""}
										onValueChange={(value) =>
											handleUpdatePrescriptionItem(
												item.id,
												"liquidTiming",
												value,
											)
										}
									>
										<SelectTrigger className="h-8 flex-1 min-w-[100px]">
											<SelectValue placeholder="Meal Timing" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="before">Before meal</SelectItem>
											<SelectItem value="after">After meal</SelectItem>
										</SelectContent>
									</Select>
									<DurationInput
										duration={item.duration}
										durationUnit={item.durationUnit}
										onDurationChange={(value) =>
											handleUpdatePrescriptionItem(item.id, "duration", value)
										}
										onDurationUnitChange={(value) =>
											handleUpdatePrescriptionItem(
												item.id,
												"durationUnit",
												value,
											)
										}
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
										placeholder="Notes"
										className="h-10 flex-1 min-w-[120px]"
									/>
								</div>
							)}
							<Button
								variant="destructive"
								size="sm"
								onClick={() => handleRemovePrescriptionItem(item.id)}
								className="h-10 w-10 p-0"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))}
		</Card>
	);
};

export default PrescriptionCard;
