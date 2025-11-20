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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { injectionRoutes, mealTimings } from "@/db/case";
import PrescriptionCapsuleFields from "./capsule-fields";
import PrescriptionExternalFields from "./external-fields";
import PrescriptionInjectionFields from "./injection-fields";
import PrescriptionSyrupFields from "./syrup-fields";
import type { MedicineItem, PrescriptionItem } from "./types";

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
								mealTiming: mealTimings[0],
								category: "Capsule/Tablet",
							}
						: medicine.category === "External Application"
							? {
									applicationArea: "",
									category: "External Application",
								}
							: medicine.category === "Injection"
								? {
										injectionRoute: injectionRoutes[0],
										category: "Injection",
									}
								: medicine.category === "Liquids/Syrups"
									? {
											mealTiming: mealTimings[0],
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
								<PrescriptionCapsuleFields
									item={item}
									handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
								/>
							)}
							{item.case_prescriptions.categoryData?.category ===
								"External Application" && (
								<PrescriptionExternalFields
									item={item}
									handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
								/>
							)}
							{item.case_prescriptions.categoryData?.category ===
								"Injection" && (
								<PrescriptionInjectionFields
									item={item}
									handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
								/>
							)}
							{item.case_prescriptions.categoryData?.category ===
								"Liquids/Syrups" && (
								<PrescriptionSyrupFields
									item={item}
									handleUpdatePrescriptionItem={handleUpdatePrescriptionItem}
								/>
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
export * from "./frequency-selector";
